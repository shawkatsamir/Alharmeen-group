"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/types/database.types";

import { requireAdmin } from "@/features/admin/lib/require-admin";
import {
  CONTEXT_SELECT,
  toContext,
  type ProductContextRow,
} from "../lib/product-context";
import { revalidateProduct } from "../lib/revalidate-product";
import { PRODUCT_BUCKET } from "../lib/storage";

/**
 * Product image management.
 *
 * Files are uploaded **browser-direct** to the public `products` bucket (see
 * `../lib/storage.ts`), then recorded here. Routing the bytes through a Server
 * Action instead would hit the request body limit, which product photos
 * routinely exceed — which is why the Storage INSERT policy added in migration
 * `20260819090000_admin_product_image_write_access` is load-bearing and a
 * service-role client is not a substitute.
 *
 * `storage_path` is stored alongside the public URL so a delete can remove the
 * underlying object too. The previous `delete-product-image.ts` fetched the row,
 * noted in a comment that it *could* clean up storage, and then didn't — so
 * every deleted image leaked its file. That file is superseded by this one.
 */

export interface AttachImageInput {
  imageUrl: string;
  storagePath: string;
  altTextAr?: string | null;
}

const IMAGE_SELECT =
  "id, image_url, storage_path, alt_text_ar, display_order, is_primary";

/** Attach already-uploaded files to a product, appended after existing images. */
export async function attachProductImages(
  productId: string,
  images: AttachImageInput[],
) {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  if (images.length === 0) {
    return { success: true, message: "لا توجد صور جديدة", images: [] };
  }

  const { data: existing, error: existingError } = await guard.supabase
    .from("product_images")
    .select("id, is_primary")
    .eq("product_id", productId);

  if (existingError) {
    console.error("[attachProductImages] read failed:", existingError);
    return { success: false, message: "تعذر قراءة صور المنتج" };
  }

  const startOrder = existing?.length ?? 0;
  // A unique partial index allows at most one primary per product, so only
  // claim primary when the product genuinely has none yet.
  const hasPrimary = (existing ?? []).some((img) => img.is_primary);

  const rows = images.map((img, i) => ({
    product_id: productId,
    image_url: img.imageUrl,
    storage_path: img.storagePath,
    alt_text_ar: img.altTextAr?.trim() || null,
    display_order: startOrder + i,
    is_primary: !hasPrimary && i === 0,
  }));

  // Return the inserted rows: the client needs the real ids, otherwise deleting
  // or starring a just-uploaded image would target a placeholder that does not
  // exist until the page is refreshed.
  const { data: inserted, error } = await guard.supabase
    .from("product_images")
    .insert(rows)
    .select(IMAGE_SELECT);

  if (error || !inserted) {
    console.error("[attachProductImages] insert failed:", error);
    return { success: false, message: "تعذر حفظ الصور" };
  }

  await revalidateProductById(guard.supabase, productId);

  return { success: true, message: "تمت إضافة الصور", images: inserted };
}

/** Remove an image row and the underlying storage object. */
export async function removeProductImage(imageId: string) {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  const { data: image, error: fetchError } = await guard.supabase
    .from("product_images")
    .select("id, product_id, storage_path, is_primary")
    .eq("id", imageId)
    .single();

  if (fetchError || !image) {
    return { success: false, message: "الصورة غير موجودة" };
  }

  const { error: deleteError, count } = await guard.supabase
    .from("product_images")
    .delete({ count: "exact" })
    .eq("id", imageId);

  if (deleteError || count === 0) {
    console.error("[removeProductImage] delete failed:", deleteError);
    return { success: false, message: "تعذر حذف الصورة" };
  }

  // Best effort: an orphaned file is far less harmful than a dangling row, so a
  // storage failure is logged rather than failing the whole action.
  if (image.storage_path) {
    const { error: storageError } = await guard.supabase.storage
      .from(PRODUCT_BUCKET)
      .remove([image.storage_path]);

    if (storageError) {
      console.error("[removeProductImage] storage cleanup failed:", storageError);
    }
  }

  // Deleting the primary would leave the product with no hero image, so promote
  // the next one and keep `images.find(is_primary)` resolving.
  if (image.is_primary) {
    const { data: next } = await guard.supabase
      .from("product_images")
      .select("id")
      .eq("product_id", image.product_id)
      .order("display_order", { ascending: true })
      .limit(1);

    const promote = next?.[0]?.id;
    if (promote) {
      await guard.supabase
        .from("product_images")
        .update({ is_primary: true })
        .eq("id", promote);
    }
  }

  await revalidateProductById(guard.supabase, image.product_id);

  return { success: true, message: "تم حذف الصورة" };
}

/** Persist a new display order. `orderedIds` is the full list, front to back. */
export async function reorderProductImages(
  productId: string,
  orderedIds: string[],
) {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  for (const [index, id] of orderedIds.entries()) {
    const { error } = await guard.supabase
      .from("product_images")
      .update({ display_order: index })
      .eq("id", id)
      .eq("product_id", productId);

    if (error) {
      console.error("[reorderProductImages] update failed:", error);
      return { success: false, message: "تعذر إعادة ترتيب الصور" };
    }
  }

  await revalidateProductById(guard.supabase, productId);

  return { success: true, message: "تم حفظ الترتيب" };
}

/**
 * Make one image primary.
 *
 * The demote must land before the promote: the unique partial index allows only
 * one primary per product, so promoting first would collide with the incumbent.
 */
export async function setPrimaryProductImage(
  productId: string,
  imageId: string,
) {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  const { error: demoteError } = await guard.supabase
    .from("product_images")
    .update({ is_primary: false })
    .eq("product_id", productId)
    .neq("id", imageId);

  if (demoteError) {
    console.error("[setPrimaryProductImage] demote failed:", demoteError);
    return { success: false, message: "تعذر تعيين الصورة الرئيسية" };
  }

  const { data, error } = await guard.supabase
    .from("product_images")
    .update({ is_primary: true })
    .eq("id", imageId)
    .eq("product_id", productId)
    .select("id")
    .single();

  if (error || !data) {
    console.error("[setPrimaryProductImage] promote failed:", error);
    return { success: false, message: "تعذر تعيين الصورة الرئيسية" };
  }

  await revalidateProductById(guard.supabase, productId);

  return { success: true, message: "تم تعيين الصورة الرئيسية" };
}

/** Update the Arabic alt text used by the gallery and by `next/image`. */
export async function updateProductImageAlt(imageId: string, altTextAr: string) {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  const { data, error } = await guard.supabase
    .from("product_images")
    .update({ alt_text_ar: altTextAr.trim() || null })
    .eq("id", imageId)
    .select("product_id")
    .single();

  if (error || !data) {
    console.error("[updateProductImageAlt] update failed:", error);
    return { success: false, message: "تعذر حفظ وصف الصورة" };
  }

  await revalidateProductById(guard.supabase, data.product_id);

  return { success: true, message: "تم حفظ وصف الصورة" };
}

/** Read the current images for a product, in display order. */
export async function listProductImages(productId: string) {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message, images: [] };

  const { data, error } = await guard.supabase
    .from("product_images")
    .select(IMAGE_SELECT)
    .eq("product_id", productId)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("[listProductImages] read failed:", error);
    return { success: false, message: "تعذر قراءة الصور", images: [] };
  }

  return { success: true, message: "", images: data ?? [] };
}

async function revalidateProductById(
  supabase: SupabaseClient<Database>,
  productId: string,
): Promise<void> {
  const { data } = await supabase
    .from("products")
    .select(CONTEXT_SELECT)
    .eq("id", productId)
    .single();

  if (data) {
    revalidateProduct(toContext(data as unknown as ProductContextRow));
  }
}
