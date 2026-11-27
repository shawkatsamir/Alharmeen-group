"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/shared/types/database.types";
import { requireAdmin } from "@/features/admin/lib/require-admin";
import {
  axisSpecKeys,
  canonicalizeColor,
  variantAxisKind,
  type AxisRegistry,
} from "@/features/products/constants/variant-axes";
import { getAxisRegistry } from "@/services/server/variant-axes";
import {
  CONTEXT_SELECT,
  fetchSiblingSlugs,
  toContext,
  type ProductContextRow,
} from "../lib/product-context";
import { revalidateProduct } from "../lib/revalidate-product";

/**
 * Variant group management.
 *
 * ---------------------------------------------------------------------------
 * The lesson encoded here: NEVER FABRICATE AN AXIS VALUE.
 *
 * The first version of this module hardcoded `axes: ["اللون"]` and, when a
 * product had no colour recorded, wrote the literal `"أساسي"` as its colour.
 * That produced a live group of two silver microwaves that actually differ by
 * whether they have a grill — one of them labelled "أساسي" in the storefront
 * switcher. A fabricated value satisfies every constraint and every validator,
 * so nothing ever surfaces it again.
 *
 * The axis and the source product's value for it are therefore both required
 * input from the admin, and there is no fallback.
 * ---------------------------------------------------------------------------
 */

/** Failure codes; the edit page maps these to Arabic messages. */
type FailureCode =
  | "forbidden"
  | "missing"
  | "group"
  | "assign"
  | "axis"
  | "value"
  | "name"
  | "duplicate"
  | "invalid";

function editUrl(productId: string, code?: FailureCode): string {
  return code
    ? `/admin/products/${productId}/edit?variantError=${code}`
    : `/admin/products/${productId}/edit`;
}

/** Shape of the error supabase-js returns from `.rpc()`. */
interface RpcErrorLike {
  code?: string;
  message?: string;
}

/**
 * Map a SQLSTATE raised by the variant RPCs onto a failure code.
 *
 * The functions raise deliberate codes rather than letting a generic
 * `raise_exception` through, so the admin gets a sentence about the thing that
 * actually went wrong instead of "try again".
 */
function rpcFailure(error: RpcErrorLike | null | undefined): FailureCode {
  switch (error?.code) {
    case "42501":
      return "forbidden";
    case "P0002":
      return "missing";
    case "23505":
      return "duplicate";
    case "22023":
      return "invalid";
    default:
      return "group";
  }
}

/** Failure codes; the groups index maps these to Arabic messages. */
type GroupsFailureCode =
  | "forbidden"
  | "members"
  | "delete"
  | "axis"
  | "axisTaken"
  | "rename";

function groupsUrl(code?: GroupsFailureCode): string {
  return code
    ? `/admin/products/groups?groupError=${code}`
    : "/admin/products/groups";
}

/**
 * Create a group from a product, then open the create form prefilled from it.
 *
 * The axis, the group name and this product's value for that axis all come from
 * the admin. The source becomes the group primary: it is the product that
 * already ranks and already carries the content, so it should keep representing
 * the group in listings and structured data.
 *
 * ---------------------------------------------------------------------------
 * One RPC, not two PostgREST calls.
 *
 * This used to insert the group and then assign the product, with no
 * transaction between them. When the assign failed the group stayed behind,
 * the error message said "حاول مرة أخرى", and every retry left another orphan:
 * the live catalogue accumulated four member-less groups, three sharing one
 * name. A compensating delete papered over it; `create_variant_group()` makes
 * the half-finished state impossible, the same way `place_order()` did for an
 * order and its items.
 * ---------------------------------------------------------------------------
 */
export async function createGroupFromProduct(
  productId: string,
  formData: FormData,
): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) redirect(editUrl(productId, "forbidden"));

  /*
   * The axis is PICKED from the product's own specification keys (`picked`),
   * with free text (`customAxis`) as the last resort. `AXIS_REGISTRY`'s
   * contract has always been that an axis key IS a spec key; picking makes
   * that true by construction instead of hoping.
   */
  const picked = String(formData.get("picked") ?? "").replace(/\s+/g, " ").trim();
  const customAxis = String(formData.get("customAxis") ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const override = String(formData.get("customValue") ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const name = String(formData.get("name") ?? "").replace(/\s+/g, " ").trim();
  // Checked by default in the form. The escape hatch exists because an admin
  // may legitimately want the spec row to read "استانلس ستيل" while the swatch
  // label is the shorter "استانلس".
  const writeSpec = formData.get("writeSpec") !== null;

  const axis = picked || customAxis;
  if (!axis) redirect(editUrl(productId, "axis"));
  if (!name) redirect(editUrl(productId, "name"));

  const registry = await getAxisRegistry();

  /*
   * The value is READ from the product's own spec row, not typed.
   *
   * This is the whole fix for the inversion that broke the gas cooker: the old
   * form asked for «قيمة هذا المنتج» in a box two inputs from the axis name,
   * named no product, and the admin entered the OTHER product's value. A value
   * read out of this product's spec table cannot describe a different product.
   *
   * `axisSpecKeys` so picking `اللون` still finds a value the product records
   * under `الألوان` — 68 products use that spelling and 7 use the other.
   */
  const { data: product, error: readError } = await guard.supabase
    .from("products")
    .select("specifications")
    .eq("id", productId)
    .single();

  if (readError || !product) redirect(editUrl(productId, "missing"));

  const value = override || readSpecValue(product.specifications, axis, registry);
  if (!value) redirect(editUrl(productId, "value"));

  // Colour is the one axis kind with a canonical-spelling table, so a "فضي"
  // lands as "سيلفر" and matches siblings saved earlier. Resolved through the
  // registry so an axis the admin declared as a colour axis is treated the
  // same as the built-in ones.
  const stored =
    variantAxisKind(axis, registry) === "color" ? canonicalizeColor(value) : value;

  const { data: groupId, error } = await guard.supabase.rpc(
    "create_variant_group",
    {
      p_product_id: productId,
      p_name: name,
      p_axis: axis,
      p_value: stored,
      p_write_spec: writeSpec,
    },
  );

  if (error || !groupId) {
    console.error("[createGroupFromProduct] create_variant_group failed:", error);
    redirect(editUrl(productId, rpcFailure(error)));
  }

  await revalidateFor(guard.supabase, productId, groupId);
  redirect(`/admin/products/new?duplicateFrom=${productId}`);
}

/**
 * Correct one member's value for one of its group's axes.
 *
 * The missing operation that cost six failed saves: the Toshiba gas cooker
 * whose name says شاشة ديجيتال was holding "بدون شاشة", so the genuinely
 * screenless product could not be added — and fixing it meant opening the
 * other product's whole form, having first worked out which product that was.
 *
 * Writes `specifications` alongside `variant_values` through
 * `set_variant_value()`, so the spec table and the switcher cannot end up
 * stating different things.
 */
export async function setMemberVariantValue(
  productId: string,
  targetId: string,
  groupId: string,
  formData: FormData,
): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) redirect(editUrl(productId, "forbidden"));

  const axis = String(formData.get("axis") ?? "").replace(/\s+/g, " ").trim();
  const value = String(formData.get("value") ?? "").replace(/\s+/g, " ").trim();

  if (!axis) redirect(editUrl(productId, "axis"));
  if (!value) redirect(editUrl(productId, "value"));

  const registry = await getAxisRegistry();
  const stored =
    variantAxisKind(axis, registry) === "color" ? canonicalizeColor(value) : value;

  const { error } = await guard.supabase.rpc("set_variant_value", {
    p_product_id: targetId,
    p_axis: axis,
    p_value: stored,
    p_write_spec: true,
  });

  if (error) {
    console.error("[setMemberVariantValue] failed:", error);
    redirect(editUrl(productId, rpcFailure(error)));
  }

  // The edited member's own page and every sibling that quotes it both change.
  await revalidateFor(guard.supabase, targetId, groupId);
  redirect(editUrl(productId));
}

/**
 * Rename one of a group's axes.
 *
 * Until this existed a mistyped axis was permanent, because correcting it means
 * rewriting `product_groups.axes` AND re-keying every member's
 * `variant_values` — two tables with no transaction between them from the
 * client. The live catalogue shows the cost: a group axed on `موراندي جراي`
 * (a colour *value* typed into the axis field) and a `الشاشة` group, both
 * deleted and recreated rather than fixed.
 */
export async function renameGroupAxis(
  groupId: string,
  oldKey: string,
  formData: FormData,
): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) redirect(groupsUrl("forbidden"));

  const newKey = String(formData.get("axis") ?? "").replace(/\s+/g, " ").trim();
  if (!newKey) redirect(groupsUrl("axis"));
  if (newKey === oldKey) redirect(groupsUrl());

  const siblingSlugs = await fetchSiblingSlugs(guard.supabase, groupId);

  const { error } = await guard.supabase.rpc("rename_variant_axis", {
    p_group_id: groupId,
    p_old_key: oldKey,
    p_new_key: newKey,
  });

  if (error) {
    console.error("[renameGroupAxis] failed:", error);
    redirect(groupsUrl(error.code === "23505" ? "axisTaken" : "rename"));
  }

  /*
   * Every member's page embeds the axis label and its siblings' values, so all
   * of them go stale at once. Revalidated by slug read BEFORE the rename —
   * the rename does not change slugs, so the set is still correct.
   */
  for (const slug of siblingSlugs) {
    revalidatePath(`/product/${slug}`);
  }
  revalidatePath("/admin/products/groups");
  redirect(groupsUrl());
}

/** Open the create form prefilled from a product already in a group. */
export async function addVariantToGroup(productId: string): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) redirect(editUrl(productId, "forbidden"));
  redirect(`/admin/products/new?duplicateFrom=${productId}`);
}

export async function renameVariantGroup(
  productId: string,
  groupId: string,
  formData: FormData,
): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) redirect(editUrl(productId, "forbidden"));

  const name = String(formData.get("name") ?? "").replace(/\s+/g, " ").trim();
  if (!name) redirect(editUrl(productId, "name"));

  const { error } = await guard.supabase
    .from("product_groups")
    .update({ name_ar: name })
    .eq("id", groupId)
    .select("id")
    .single();

  if (error) {
    console.error("[renameVariantGroup] failed:", error);
    redirect(editUrl(productId, "group"));
  }

  await revalidateFor(guard.supabase, productId, groupId);
  redirect(editUrl(productId));
}

/**
 * Move the group primary onto another member.
 *
 * Two statements rather than one, because `unique (group_id) where
 * is_group_primary` rejects a transient second primary — the old one has to be
 * cleared first.
 */
export async function setGroupPrimary(
  productId: string,
  targetId: string,
  groupId: string,
): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) redirect(editUrl(productId, "forbidden"));

  await guard.supabase
    .from("products")
    .update({ is_group_primary: false })
    .eq("group_id", groupId)
    .eq("is_group_primary", true);

  const { error } = await guard.supabase
    .from("products")
    .update({ is_group_primary: true })
    .eq("id", targetId)
    .select("id")
    .single();

  if (error) {
    console.error("[setGroupPrimary] failed:", error);
    redirect(editUrl(productId, "assign"));
  }

  await revalidateFor(guard.supabase, productId, groupId);
  redirect(editUrl(productId));
}

/**
 * Detach a product from its group.
 *
 * `variant_values` is cleared with it: a value for an axis the product no longer
 * belongs to is meaningless, and leaving it would trip the "axis values without
 * a group" rule the next time the product is saved through the form.
 */
export async function removeFromGroup(
  productId: string,
  targetId: string,
  groupId: string,
): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) redirect(editUrl(productId, "forbidden"));

  // Sibling slugs must be read BEFORE the detach, or the product being removed
  // is already gone from the group and its page never gets rebuilt.
  const siblingSlugs = await fetchSiblingSlugs(guard.supabase, groupId);

  const { error } = await guard.supabase
    .from("products")
    .update({ group_id: null, variant_values: null, is_group_primary: false })
    .eq("id", targetId)
    .select("id")
    .single();

  if (error) {
    console.error("[removeFromGroup] failed:", error);
    redirect(editUrl(productId, "assign"));
  }

  const { data: contextRow } = await guard.supabase
    .from("products")
    .select(CONTEXT_SELECT)
    .eq("id", targetId)
    .single();

  if (contextRow) {
    revalidateProduct({
      ...toContext(contextRow as unknown as ProductContextRow),
      previousSiblingSlugs: siblingSlugs,
    });
  }

  redirect(editUrl(productId));
}

/**
 * Delete a group that has no members.
 *
 * The missing half of `removeFromGroup`, which detaches a product and leaves
 * the grouping behind. Until now nothing could remove the residue, so a group
 * created by mistake — a mistyped axis, an abandoned attempt — stayed in the
 * picker on every product form for good. Four such groups exist in the live
 * catalogue, three of them under one name.
 *
 * Refuses a group that still has a member rather than cascading. `group_id` is
 * `on delete set null`, so deleting a populated group would silently detach
 * its products and leave them carrying `variant_values` for a group that no
 * longer exists — a state the product form then rejects on the next save.
 */
export async function deleteEmptyGroup(groupId: string): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) redirect(groupsUrl("forbidden"));

  /*
   * Counted through the cookie-bound admin client, so ARCHIVED members count
   * too. The anonymous view of `products` hides `is_active = false`, which
   * would report an archived-only group as empty — and the 396 لتر group is
   * exactly that.
   */
  const { count, error: countError } = await guard.supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId);

  if (countError) {
    console.error("[deleteEmptyGroup] member count failed:", countError);
    redirect(groupsUrl("delete"));
  }

  if ((count ?? 0) > 0) redirect(groupsUrl("members"));

  // `.select().single()` — an RLS-blocked DELETE reports no error and no rows.
  const { error } = await guard.supabase
    .from("product_groups")
    .delete()
    .eq("id", groupId)
    .select("id")
    .single();

  if (error) {
    console.error("[deleteEmptyGroup] delete failed:", error);
    redirect(groupsUrl("delete"));
  }

  revalidatePath("/admin/products/groups");
  redirect(groupsUrl());
}

/**
 * This product's recorded value for an axis, trying the axis key and then its
 * alias spellings. Mirrors the SQL `axis_spec_keys()`.
 */
function readSpecValue(
  specifications: unknown,
  axis: string,
  registry: AxisRegistry,
): string {
  if (
    typeof specifications !== "object" ||
    specifications === null ||
    Array.isArray(specifications)
  ) {
    return "";
  }

  const specs = specifications as Record<string, unknown>;
  for (const key of axisSpecKeys(axis, registry)) {
    const raw = specs[key];
    if (typeof raw === "string" && raw.trim()) return raw.replace(/\s+/g, " ").trim();
  }
  return "";
}

/** Revalidate a product and every sibling that embeds its price and images. */
async function revalidateFor(
  supabase: SupabaseClient<Database>,
  productId: string,
  groupId: string,
): Promise<void> {
  const { data } = await supabase
    .from("products")
    .select(CONTEXT_SELECT)
    .eq("id", productId)
    .single();

  if (!data) return;

  revalidateProduct({
    ...toContext(data as unknown as ProductContextRow),
    siblingSlugs: await fetchSiblingSlugs(supabase, groupId, productId),
  });
}
