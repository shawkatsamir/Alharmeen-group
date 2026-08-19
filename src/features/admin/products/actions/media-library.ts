"use server";

import { requireAdmin } from "@/features/admin/lib/require-admin";
import { LIBRARY_PREFIX, PRODUCT_BUCKET } from "../lib/storage";

/**
 * The shared content-image library.
 *
 * `content_blocks` reference images by URL rather than through
 * `product_images`, so those files need a home that is not scoped to one
 * product. Everything uploaded here lives under `_library/`.
 *
 * Listing goes through a Server Action rather than the browser client because
 * `storage.objects` has no admin SELECT policy of its own — the bucket's public
 * read policy covers fetching a file by URL, but enumerating the folder is an
 * admin-only operation and the guard belongs on the server.
 */

export interface LibraryItem {
  name: string;
  path: string;
  url: string;
  size: number;
  createdAt: string | null;
}

export async function listLibraryMedia(): Promise<LibraryItem[]> {
  const guard = await requireAdmin();
  if (!guard.ok) return [];

  const { data, error } = await guard.supabase.storage
    .from(PRODUCT_BUCKET)
    .list(LIBRARY_PREFIX, {
      limit: 200,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) {
    console.error("[listLibraryMedia] list failed:", error);
    return [];
  }

  return (data ?? [])
    // `list` returns a placeholder row for the folder itself; it has no id.
    .filter((item) => item.id !== null)
    .map((item) => {
      const path = `${LIBRARY_PREFIX}/${item.name}`;
      const {
        data: { publicUrl },
      } = guard.supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path);

      return {
        name: item.name,
        path,
        url: publicUrl,
        size: item.metadata?.size ?? 0,
        createdAt: item.created_at ?? null,
      };
    });
}

export async function deleteLibraryMedia(path: string) {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  // Deleting outside the library prefix would let a crafted path remove another
  // product's images, so refuse anything that is not clearly a library object.
  if (!path.startsWith(`${LIBRARY_PREFIX}/`) || path.includes("..")) {
    return { success: false, message: "مسار غير صالح" };
  }

  const { error } = await guard.supabase.storage
    .from(PRODUCT_BUCKET)
    .remove([path]);

  if (error) {
    console.error("[deleteLibraryMedia] remove failed:", error);
    return { success: false, message: "تعذر حذف الملف" };
  }

  return { success: true, message: "تم حذف الملف" };
}
