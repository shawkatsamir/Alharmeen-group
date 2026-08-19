"use server";

import { requireAdmin } from "@/features/admin/lib/require-admin";
import { describeProductWriteError } from "../lib/db-errors";
import {
  CONTEXT_SELECT,
  CONTEXT_SELECT_WITH_ID,
  fetchProductContext,
  toContext,
  type ProductContextRow,
} from "../lib/product-context";
import { revalidateProduct } from "../lib/revalidate-product";
import {
  productFormSchema,
  toProductRow,
  type ProductFormValues,
} from "../schema";

export interface SaveProductResult {
  success: boolean;
  message: string;
  /** Present on success; the create page needs it to upload images. */
  productId?: string;
  slug?: string;
  /** Set when the failure belongs to a specific field, so the form can focus it. */
  field?: "sku" | "slug" | null;
}

/**
 * Create a product.
 *
 * Returns the new id so the client can upload images into
 * `products/{id}/…` and then attach them — the product has to exist first,
 * which avoids a staging folder that would need cleaning up after an abandoned
 * form.
 */
export async function createProduct(
  values: ProductFormValues,
): Promise<SaveProductResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  const parsed = productFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
    };
  }

  const payload = toProductRow(parsed.data);

  const { data, error } = await guard.supabase
    .from("products")
    .insert(payload)
    .select(CONTEXT_SELECT_WITH_ID)
    .single();

  if (error || !data) {
    console.error("[createProduct] insert failed:", error);
    const described = describeProductWriteError(error);
    return { success: false, message: described.message, field: described.field };
  }

  const row = data as unknown as ProductContextRow & { id: string };

  revalidateProduct(toContext(row));

  return {
    success: true,
    message: "تم إنشاء المنتج بنجاح",
    productId: row.id,
    slug: row.slug,
  };
}

/**
 * Update every editable column of an existing product.
 *
 * The previous context is read *before* the update so a renamed slug or a moved
 * category revalidates the old URLs too — otherwise the old product page keeps
 * serving from the ISR cache until it expires an hour later.
 */
export async function updateProductDetails(
  productId: string,
  values: ProductFormValues,
): Promise<SaveProductResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  const parsed = productFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
    };
  }

  const previous = await fetchProductContext(guard.supabase, productId);
  if (!previous) {
    return { success: false, message: "المنتج غير موجود" };
  }

  const payload = toProductRow(parsed.data);

  // `.select().single()` is required: an RLS-blocked UPDATE returns no error and
  // zero rows, which would otherwise be reported as a successful save.
  const { data, error } = await guard.supabase
    .from("products")
    .update(payload)
    .eq("id", productId)
    .select(CONTEXT_SELECT)
    .single();

  if (error || !data) {
    console.error("[updateProductDetails] update failed:", error);
    const described = describeProductWriteError(error);
    return { success: false, message: described.message, field: described.field };
  }

  const next = toContext(data as unknown as ProductContextRow);

  revalidateProduct({
    ...next,
    previousSlug: previous.slug,
    previousCategorySlug: previous.categorySlug,
    previousParentSlug: previous.parentSlug,
    previousBrandSlug: previous.brandSlug,
  });

  return {
    success: true,
    message: "تم حفظ التعديلات بنجاح",
    productId,
    slug: next.slug,
  };
}
