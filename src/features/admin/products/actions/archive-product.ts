"use server";

import { requireAdmin } from "@/features/admin/lib/require-admin";
import {
  CONTEXT_SELECT,
  fetchSiblingSlugs,
  toContext,
  type ProductContextRow,
} from "../lib/product-context";
import { revalidateProduct } from "../lib/revalidate-product";

/**
 * Archive / restore a product.
 *
 * "Delete" is a soft delete: `is_active = false`. A hard delete is not offered
 * because `order_items.product_id` references `products`, so removing a product
 * that has ever been ordered would either be rejected by the foreign key or
 * orphan the order history that customers and the admin order pages read back.
 *
 * Every public fetcher in `services/server/products.ts` filters on
 * `is_active = true`, and the RLS SELECT policy already exposes inactive rows to
 * admins only, so flipping the flag removes the product from the storefront,
 * the sitemap and `generateStaticParams` in one step — and is reversible.
 */
async function setActive(productId: string, isActive: boolean) {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  // `.select().single()` matters here: an RLS-blocked UPDATE reports no error
  // and zero rows, which would look like a successful archive.
  const { data, error } = await guard.supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", productId)
    .select(CONTEXT_SELECT)
    .single();

  if (error || !data) {
    console.error("[archiveProduct] update failed:", error);
    return {
      success: false,
      message: isActive ? "تعذر استعادة المنتج" : "تعذر أرشفة المنتج",
    };
  }

  const context = toContext(data as unknown as ProductContextRow);

  /*
   * Archiving removes this product from its siblings' switchers — and if it was
   * the only other active member, the switcher disappears from them entirely.
   * Restoring does the reverse. Either way every sibling page is now wrong.
   */
  revalidateProduct({
    ...context,
    siblingSlugs: await fetchSiblingSlugs(
      guard.supabase,
      context.groupId,
      productId,
    ),
  });

  return {
    success: true,
    message: isActive ? "تمت استعادة المنتج" : "تمت أرشفة المنتج",
  };
}

export async function archiveProduct(productId: string) {
  return setActive(productId, false);
}

export async function restoreProduct(productId: string) {
  return setActive(productId, true);
}
