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
    <div className="space-y-4 lg:space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            صور تُستخدم داخل محتوى صفحات المنتجات. صور المنتج نفسه تُدار من صفحة
            تعديل المنتج.
          </p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
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
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-20 text-center text-muted-foreground">
          لا توجد صور بعد.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
          {items.map((item) => (
            <div
              key={item.path}
              className="overflow-hidden rounded-xl border border-border bg-white"
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
              <div className="flex items-center justify-between border-t border-border p-2">
                <span className="truncate text-xs text-muted-foreground" title={item.name}>
                  {formatSize(item.size)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(item.url)}
                    title="نسخ الرابط"
                    className="rounded p-1.5 text-muted-foreground hover:bg-surface-sunken"
                  >
                    {copied === item.url ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    title="حذف"
                    className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
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
