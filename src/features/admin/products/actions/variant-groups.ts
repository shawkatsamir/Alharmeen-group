"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/shared/types/database.types";
import { requireAdmin } from "@/features/admin/lib/require-admin";
import { canonicalizeColor, variantAxisKind } from "@/features/products/constants/variant-axes";
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
  | "name";

function editUrl(productId: string, code?: FailureCode): string {
  return code
    ? `/admin/products/${productId}/edit?variantError=${code}`
    : `/admin/products/${productId}/edit`;
}

/**
 * Create a group from a product, then open the create form prefilled from it.
 *
 * The axis, the group name and this product's value for that axis all come from
 * the admin. The source becomes the group primary: it is the product that
 * already ranks and already carries the content, so it should keep representing
 * the group in listings and structured data.
 */
export async function createGroupFromProduct(
  productId: string,
  formData: FormData,
): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) redirect(editUrl(productId, "forbidden"));

  const axis = String(formData.get("axis") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  const name = String(formData.get("name") ?? "").replace(/\s+/g, " ").trim();

  if (!axis) redirect(editUrl(productId, "axis"));
  if (!value) redirect(editUrl(productId, "value"));
  if (!name) redirect(editUrl(productId, "name"));

  const { data: product, error } = await guard.supabase
    .from("products")
    .select("id, group_id")
    .eq("id", productId)
    .single();

  if (error || !product) redirect(editUrl(productId, "missing"));
  // Already grouped — nothing to create, just go and add the sibling.
  if (product.group_id) redirect(`/admin/products/new?duplicateFrom=${productId}`);

  const { data: group, error: groupError } = await guard.supabase
    .from("product_groups")
    .insert({ name_ar: name, axes: [axis] })
    .select("id")
    .single();

  if (groupError || !group) {
    console.error("[createGroupFromProduct] group insert failed:", groupError);
    redirect(editUrl(productId, "group"));
  }

  // Colour is the one axis with a canonical-spelling table, so a "فضي" typed
  // here lands as "سيلفر" and matches siblings saved earlier.
  const stored = variantAxisKind(axis) === "color" ? canonicalizeColor(value) : value;

  // `.select().single()` — an RLS-blocked UPDATE returns no error and no rows.
  const { error: assignError } = await guard.supabase
    .from("products")
    .update({
      group_id: group.id,
      is_group_primary: true,
      variant_values: { [axis]: stored },
    })
    .eq("id", productId)
    .select("id")
    .single();

  if (assignError) {
    console.error("[createGroupFromProduct] assign failed:", assignError);
    redirect(editUrl(productId, "assign"));
  }

  await revalidateFor(guard.supabase, productId, group.id);
  redirect(`/admin/products/new?duplicateFrom=${productId}`);
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
