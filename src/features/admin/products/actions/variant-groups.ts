"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/features/admin/lib/require-admin";
import { canonicalizeColor } from "@/features/products/constants/variant-axes";
import {
  CONTEXT_SELECT,
  fetchSiblingSlugs,
  toContext,
  type ProductContextRow,
} from "../lib/product-context";
import { revalidateProduct } from "../lib/revalidate-product";

/**
 * Strip the trailing model code from a product name to get a group name.
 *
 * Names in this catalogue end in their SKU — "ثلاجة شارب نوفروست 450 لتر أسود
 * SJ-58C(BK)" — and the group is that product without its finish. Removing the
 * SKU is reliable; removing the colour word is not, so the colour is left in
 * and the admin can rename the group later. A slightly long group name is a
 * cosmetic problem; guessing wrong about which word is the colour would put the
 * wrong products together.
 */
function deriveGroupName(nameAr: string, sku: string): string {
  const trimmed = nameAr.trim();
  const withoutSku = trimmed.endsWith(sku.trim())
    ? trimmed.slice(0, -sku.trim().length)
    : trimmed;
  return withoutSku.trim() || trimmed;
}

/**
 * Ensure a product belongs to a variant group, then open the create form
 * prefilled from it.
 *
 * This is the whole point of the feature for the store owner: adding the silver
 * version of a fridge should be picking a colour and a SKU, not re-authoring a
 * description, a spec table and a content block layout that already exist.
 *
 * A mutation runs before the redirect because the source product usually is not
 * grouped yet — the group has to exist for the new variant to join it, and
 * making the owner create one by hand first is the step they would forget.
 */
export async function startVariantFromProduct(productId: string): Promise<void> {
  /*
   * Invoked as a `<form action>`, which must resolve to void — so failures come
   * back as a query parameter on the edit page rather than a returned object.
   * Throwing would replace the whole admin screen with an error boundary over
   * what is a recoverable problem.
   */
  const fail = (code: string): never =>
    redirect(`/admin/products/${productId}/edit?variantError=${code}`);

  const guard = await requireAdmin();
  if (!guard.ok) return fail("forbidden");

  const { data: product, error } = await guard.supabase
    .from("products")
    .select("id, name_ar, sku, group_id, specifications")
    .eq("id", productId)
    .single();

  if (error || !product) return fail("missing");

  let groupId = product.group_id;

  if (!groupId) {
    const { data: group, error: groupError } = await guard.supabase
      .from("product_groups")
      .insert({
        name_ar: deriveGroupName(product.name_ar, product.sku),
        axes: ["اللون"],
      })
      .select("id")
      .single();

    if (groupError || !group) {
      console.error("[startVariantFromProduct] group insert failed:", groupError);
      return fail("group");
    }

    groupId = group.id;

    /*
     * The source becomes the group primary — it is the product that already
     * ranks and already carries the content, so it should stay the one that
     * represents the group in listings and structured data.
     *
     * Its colour comes from whichever spec key it happens to use. A product
     * with no colour recorded still joins the group, labelled "أساسي", because
     * refusing to group it would be a worse outcome than an imperfect label the
     * owner can correct in the form they are about to open.
     */
    const specs =
      product.specifications &&
      typeof product.specifications === "object" &&
      !Array.isArray(product.specifications)
        ? (product.specifications as Record<string, unknown>)
        : {};

    const rawColor = specs["الألوان"] ?? specs["اللون"];
    const color =
      typeof rawColor === "string" && rawColor.trim()
        ? canonicalizeColor(rawColor)
        : "أساسي";

    // `.select().single()` — an RLS-blocked UPDATE returns no error and no rows.
    const { error: assignError } = await guard.supabase
      .from("products")
      .update({
        group_id: groupId,
        is_group_primary: true,
        variant_values: { اللون: color },
      })
      .eq("id", productId)
      .select("id")
      .single();

    if (assignError) {
      console.error("[startVariantFromProduct] assign failed:", assignError);
      return fail("assign");
    }

    const { data: contextRow } = await guard.supabase
      .from("products")
      .select(CONTEXT_SELECT)
      .eq("id", productId)
      .single();

    if (contextRow) {
      const context = toContext(contextRow as unknown as ProductContextRow);
      revalidateProduct({
        ...context,
        siblingSlugs: await fetchSiblingSlugs(guard.supabase, groupId, productId),
      });
    }
  }

  redirect(`/admin/products/new?duplicateFrom=${productId}`);
}
