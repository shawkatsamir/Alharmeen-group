"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/Dialog";
import { Img } from "@/shared/components/ui/Image";
import { listLibraryMedia } from "../../actions/media-library";

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
}

/** Pick an already-uploaded content image to reuse in a block. */
export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: MediaPickerDialogProps) {
  // `enabled: open` defers the fetch until the dialog is actually shown: this
  // component is rendered once per image field, and a content-heavy product can
  // hold a dozen of them. The shared query key means opening the second picker
  // reuses the first one's result instead of listing the bucket again.
  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: ["admin-media-library"],
    queryFn: listLibraryMedia,
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>مكتبة الصور</DialogTitle>
          <DialogDescription>
            اختر صورة سبق رفعها لاستخدامها في محتوى المنتج.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">
            لا توجد صور في المكتبة بعد. استخدم زر «رفع صورة» لإضافة أول صورة.
          </p>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
            {items.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => onSelect(item.url)}
                className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-white transition-colors hover:border-[#4EA674] dark:border-gray-700"
                title={item.name}
              >
                <Img
                  src={item.url}
                  alt=""
                  fill
                  sizes="150px"
                  className="object-contain p-1"
                />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
