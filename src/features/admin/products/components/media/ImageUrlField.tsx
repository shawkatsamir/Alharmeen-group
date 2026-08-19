"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Img } from "@/shared/components/ui/Image";
import { Input } from "@/shared/components/ui/Input";
import { ACCEPTED_IMAGE_TYPES, uploadLibraryImage, validateImageFile } from "../../lib/storage";
import { MediaPickerDialog } from "./MediaPickerDialog";

interface ImageUrlFieldProps {
  value: string | undefined;
  onChange: (url: string | undefined) => void;
  label?: string;
}

/**
 * URL field for images referenced from `content_blocks`.
 *
 * Offers the two things the store owner actually needs — upload a new file, or
 * reuse one already in the library — while still allowing a pasted URL, since
 * `next.config.ts` also permits `images.unsplash.com`.
 *
 * The upload runs in the browser and writes to `_library/`, not to the product
 * folder: a block image can outlive the product it was first used on.
 */
export function ImageUrlField({ value, onChange, label = "الصورة" }: ImageUrlFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    const problem = validateImageFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadLibraryImage(createClient(), file);
      onChange(uploaded.imageUrl);
      toast.success("تم رفع الصورة");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر رفع الصورة");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      <div className="flex items-start gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700">
          {value ? (
            <Img src={value} alt="" fill sizes="80px" className="object-contain p-1" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <Input
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || undefined)}
            placeholder="https://..."
            dir="ltr"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              رفع صورة
            </button>

            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              <ImageIcon className="h-4 w-4" />
              اختر من المكتبة
            </button>

            {value && (
              <button
                type="button"
                onClick={() => onChange(undefined)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <X className="h-4 w-4" />
                إزالة
              </button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(url) => {
          onChange(url);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
