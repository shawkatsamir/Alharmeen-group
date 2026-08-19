"use client";

import { useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Loader2, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Img } from "@/shared/components/ui/Image";
import { Input } from "@/shared/components/ui/Input";
import {
  attachProductImages,
  removeProductImage,
  reorderProductImages,
  setPrimaryProductImage,
  updateProductImageAlt,
} from "../../actions/product-images";
import { moveItem } from "../../lib/block-types";
import {
  ACCEPTED_IMAGE_TYPES,
  uploadProductImage,
  validateImageFile,
} from "../../lib/storage";

export interface ManagedImage {
  id: string;
  image_url: string;
  alt_text_ar: string | null;
  display_order: number;
  is_primary: boolean;
}

interface ImageManagerProps {
  productId: string;
  images: ManagedImage[];
  onImagesChange: (images: ManagedImage[]) => void;
}

/**
 * Image management for a saved product.
 *
 * Each control writes through immediately rather than waiting for the form's
 * save button: images live in `product_images`, not in the `products` row, so
 * batching them into the form submit would mean holding uploaded files in memory
 * and leaving orphans behind if the author navigated away.
 *
 * Uploads go browser-direct to Storage (see `../../lib/storage.ts`); only the
 * resulting URL and path are sent to the server.
 */
export function ImageManager({
  productId,
  images,
  onImagesChange,
}: ImageManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const selected = Array.from(files);
    const problems = selected.map(validateImageFile).filter(Boolean);
    if (problems.length > 0) {
      problems.forEach((p) => toast.error(p!));
      return;
    }

    setUploading(true);
    const supabase = createClient();

    try {
      const uploaded = await Promise.all(
        selected.map((file) => uploadProductImage(supabase, productId, file)),
      );

      const result = await attachProductImages(
        productId,
        uploaded.map((u) => ({ imageUrl: u.imageUrl, storagePath: u.storagePath })),
      );

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      // Use the rows the server actually inserted, so the ids are real and the
      // controls below work without a page refresh.
      onImagesChange([...images, ...(result.images ?? [])]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر رفع الصور");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove(image: ManagedImage) {
    startTransition(async () => {
      const result = await removeProductImage(image.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);

      const remaining = images.filter((img) => img.id !== image.id);
      // Mirror the server's promote-the-next-one rule so the star does not
      // disappear until the page is refreshed.
      if (image.is_primary && remaining.length > 0) {
        remaining[0] = { ...remaining[0], is_primary: true };
      }
      onImagesChange(remaining);
    });
  }

  function handleSetPrimary(image: ManagedImage) {
    startTransition(async () => {
      const result = await setPrimaryProductImage(productId, image.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      onImagesChange(
        images.map((img) => ({ ...img, is_primary: img.id === image.id })),
      );
    });
  }

  function handleMove(index: number, direction: -1 | 1) {
    const next = moveItem(images, index, index + direction);
    if (next === images) return;

    onImagesChange(next.map((img, i) => ({ ...img, display_order: i })));

    startTransition(async () => {
      const result = await reorderProductImages(
        productId,
        next.map((img) => img.id),
      );
      if (!result.success) toast.error(result.message);
    });
  }

  function handleAltBlur(image: ManagedImage, altText: string) {
    if ((image.alt_text_ar ?? "") === altText) return;

    startTransition(async () => {
      const result = await updateProductImageAlt(image.id, altText);
      if (!result.success) toast.error(result.message);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            صور المنتج
          </h3>
          <p className="text-sm text-gray-500">
            الصورة الأولى (★) هي الصورة الرئيسية التي تظهر في القوائم ونتائج البحث.
          </p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#4EA674] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d8a5e] disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          رفع صور
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {images.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500 dark:border-gray-600">
          لا توجد صور بعد. ارفع صورة واحدة على الأقل قبل نشر المنتج.
        </p>
      ) : (
        <div className="space-y-2" aria-busy={pending}>
          {images.map((image, index) => (
            <div
              key={image.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white">
                <Img
                  src={image.image_url}
                  alt={image.alt_text_ar ?? ""}
                  fill
                  sizes="64px"
                  className="object-contain p-1"
                />
              </div>

              <div className="flex-1">
                <Input
                  defaultValue={image.alt_text_ar ?? ""}
                  onBlur={(e) => handleAltBlur(image, e.target.value)}
                  placeholder="وصف الصورة بالعربية (يفيد محركات البحث)"
                />
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title={image.is_primary ? "الصورة الرئيسية" : "اجعلها رئيسية"}
                  onClick={() => handleSetPrimary(image)}
                  disabled={image.is_primary}
                  className={`rounded-lg p-1.5 transition-colors ${
                    image.is_primary
                      ? "text-amber-500"
                      : "text-gray-400 hover:bg-gray-100 hover:text-amber-500 dark:hover:bg-gray-700"
                  }`}
                >
                  <Star
                    className="h-4 w-4"
                    fill={image.is_primary ? "currentColor" : "none"}
                  />
                </button>

                {/* RTL: "previous" moves the image toward the start, on the right. */}
                <button
                  type="button"
                  title="تحريك للبداية"
                  disabled={index === 0}
                  onClick={() => handleMove(index, -1)}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="تحريك للنهاية"
                  disabled={index === images.length - 1}
                  onClick={() => handleMove(index, 1)}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  title="حذف الصورة"
                  onClick={() => handleRemove(image)}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
