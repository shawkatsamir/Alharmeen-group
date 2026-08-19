"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Copy, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Img } from "@/shared/components/ui/Image";
import {
  deleteLibraryMedia,
  listLibraryMedia,
  type LibraryItem,
} from "../../actions/media-library";
import {
  ACCEPTED_IMAGE_TYPES,
  uploadLibraryImage,
  validateImageFile,
} from "../../lib/storage";

/**
 * Browsable library of reusable content images.
 *
 * Content blocks reference images by URL rather than through `product_images`,
 * so they need a place to be uploaded to and picked from that is not scoped to a
 * single product. Everything here lives under the `_library/` prefix.
 */
export function MediaLibrary() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listLibraryMedia()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const selected = Array.from(files);
    const problems = selected.map(validateImageFile).filter(Boolean);
    if (problems.length > 0) {
      problems.forEach((p) => toast.error(p!));
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      await Promise.all(selected.map((file) => uploadLibraryImage(supabase, file)));
      toast.success("تم رفع الصور");
      setItems(await listLibraryMedia());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر رفع الصور");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleCopy(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(url);
    toast.success("تم نسخ الرابط");
    setTimeout(() => setCopied(null), 2000);
  }

  function handleDelete(item: LibraryItem) {
    if (!confirm(`حذف ${item.name}؟ قد تكون مستخدمة في محتوى منتج.`)) return;

    startTransition(async () => {
      const result = await deleteLibraryMedia(item.path);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setItems((current) => current.filter((i) => i.path !== item.path));
    });
  }

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            وسائط المنتجات
          </h1>
          <p className="text-sm text-gray-500">
            صور تُستخدم داخل محتوى صفحات المنتجات. صور المنتج نفسه تُدار من صفحة
            تعديل المنتج.
          </p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-lg bg-[#4EA674] px-4 py-2 font-medium text-white hover:bg-[#3d8a5e] disabled:opacity-50"
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

      {loading ? (
        <div className="flex h-64 items-center justify-center text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 py-20 text-center text-gray-500 dark:border-gray-600">
          لا توجد صور بعد.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((item) => (
            <div
              key={item.path}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="relative aspect-square bg-white">
                <Img
                  src={item.url}
                  alt=""
                  fill
                  sizes="200px"
                  className="object-contain p-2"
                />
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 p-2 dark:border-gray-700">
                <span className="truncate text-xs text-gray-500" title={item.name}>
                  {formatSize(item.size)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(item.url)}
                    title="نسخ الرابط"
                    className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {copied === item.url ? (
                      <Check className="h-3.5 w-3.5 text-[#4EA674]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    title="حذف"
                    className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
}
