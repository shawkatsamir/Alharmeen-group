import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Product media storage.
 *
 * The `products` bucket is public, so uploads produce a stable public URL that
 * `next/image` can serve — `next.config.ts` already allows `**.supabase.co`.
 *
 * Uploads run **in the browser**, not through a Server Action: Server Actions
 * cap the request body well below the size of a typical product photo. The
 * admin INSERT policy on `storage.objects` added in migration
 * `20260819090000_admin_product_image_write_access` is what makes that possible.
 *
 * This module holds no `"use server"` directive on purpose — a `"use server"`
 * file may only export async functions, so the bucket name and the path helper
 * cannot live beside the actions.
 */

export const PRODUCT_BUCKET = "products";

/**
 * Prefix for reusable content images.
 *
 * Gallery images inside `content_blocks` are referenced by URL and are not tied
 * to a single product's `product_images` rows, so they cannot live under
 * `{productId}/` — deleting the product would take them with it while another
 * product's blocks still pointed at them. The leading underscore keeps the
 * folder sorted away from the uuid-named product folders.
 */
export const LIBRARY_PREFIX = "_library";

/** Bytes above this are rejected client-side with an Arabic message. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

export interface UploadedImage {
  imageUrl: string;
  storagePath: string;
}

function fileExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  // Fall back to the MIME subtype for files pasted without an extension.
  return file.type.split("/").pop()?.toLowerCase() || "jpg";
}

/**
 * Object key for a product image.
 *
 * Scoped by product id so deleting a product's media is a prefix operation, and
 * randomised so re-uploading a file with the same name can never overwrite an
 * image another product is still pointing at.
 */
export function productImagePath(productId: string, file: File): string {
  return `${productId}/${crypto.randomUUID()}.${fileExtension(file)}`;
}

/** Object key for a reusable content image, kept out of any product folder. */
export function libraryImagePath(file: File): string {
  return `${LIBRARY_PREFIX}/${crypto.randomUUID()}.${fileExtension(file)}`;
}

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return `صيغة غير مدعومة: ${file.name}`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `الملف أكبر من 5 ميجابايت: ${file.name}`;
  }
  return null;
}

/**
 * Upload one file and return both the public URL and the storage path.
 *
 * `storage_path` is persisted next to the URL so a later delete can remove the
 * object itself rather than leaking it.
 */
export async function uploadProductImage(
  supabase: SupabaseClient,
  productId: string,
  file: File,
): Promise<UploadedImage> {
  return uploadToPath(supabase, productImagePath(productId, file), file);
}

/** Upload a reusable content image into the shared library folder. */
export async function uploadLibraryImage(
  supabase: SupabaseClient,
  file: File,
): Promise<UploadedImage> {
  return uploadToPath(supabase, libraryImagePath(file), file);
}

async function uploadToPath(
  supabase: SupabaseClient,
  storagePath: string,
  file: File,
): Promise<UploadedImage> {
  const { error } = await supabase.storage
    .from(PRODUCT_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type,
    });

  if (error) throw new Error(`تعذر رفع الصورة ${file.name}: ${error.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(storagePath);

  return { imageUrl: publicUrl, storagePath };
}
