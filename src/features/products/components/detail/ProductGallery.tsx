"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Img } from "@/shared/components/ui/Image";
import { Button } from "@/shared/components/ui/Button";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import type { ProductImage } from "../../types";

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

/**
 * Appliance photography is product-on-white, so every image uses
 * `object-contain` — `object-cover` was cropping fridges and washing machines.
 */
export function ProductGallery({ images, productName }: ProductGalleryProps) {
  // is_primary first, then display_order.
  const sorted = useMemo(
    () =>
      [...images].sort((a, b) => {
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
        return (a.display_order || 0) - (b.display_order || 0);
      }),
    [images],
  );

  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const count = sorted.length;
  const active = sorted[Math.min(index, Math.max(count - 1, 0))];

  const step = useCallback(
    (delta: number) => {
      if (count === 0) return;
      setIndex((i) => (i + delta + count) % count);
    },
    [count],
  );

  // Arrow keys drive the lightbox; Escape closes it.
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomed(false);
      // RTL: ArrowLeft advances, ArrowRight goes back.
      if (e.key === "ArrowLeft") step(1);
      if (e.key === "ArrowRight") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [zoomed, step]);

  if (count === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border border-border bg-surface-raised text-muted-foreground">
        لا توجد صورة لهذا المنتج
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="group/gallery relative aspect-square overflow-hidden rounded-xl border border-border bg-white">
        <Img
          src={active.image_url}
          alt={active.alt_text_ar || productName}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 560px"
          className="object-contain p-6"
        />

        <Button
          size="icon"
          variant="secondary"
          onClick={() => setZoomed(true)}
          aria-label="تكبير الصورة"
          className="absolute bottom-3 left-3 rounded-full opacity-0 shadow-sm transition-opacity group-hover/gallery:opacity-100 focus-visible:opacity-100 max-lg:opacity-100"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        {count > 1 && (
          <>
            <Button
              size="icon"
              variant="secondary"
              onClick={() => step(-1)}
              aria-label="الصورة السابقة"
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full opacity-0 shadow-sm transition-opacity group-hover/gallery:opacity-100 focus-visible:opacity-100 max-lg:opacity-100"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={() => step(1)}
              aria-label="الصورة التالية"
              className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full opacity-0 shadow-sm transition-opacity group-hover/gallery:opacity-100 focus-visible:opacity-100 max-lg:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* A single-image product gets no thumbnail rail at all. */}
      {count > 1 && (
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
          {sorted.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`عرض الصورة ${i + 1} من ${count}`}
              aria-current={i === index}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition-colors ${
                i === index
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Img
                src={img.image_url}
                alt={img.alt_text_ar || `${productName} — صورة ${i + 1}`}
                fill
                sizes="80px"
                className="object-contain p-1.5"
              />
            </button>
          ))}
        </div>
      )}

      {zoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="معرض صور المنتج"
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomed(false)}
        >
          <Button
            size="icon"
            variant="secondary"
            onClick={() => setZoomed(false)}
            aria-label="إغلاق"
            className="absolute top-4 left-4 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>

          <div
            className="relative h-full max-h-[85vh] w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Img
              src={active.image_url}
              alt={active.alt_text_ar || productName}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          {count > 1 && (
            <>
              <Button
                size="icon"
                variant="secondary"
                aria-label="الصورة السابقة"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                aria-label="الصورة التالية"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="absolute top-1/2 left-4 -translate-y-1/2 rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="absolute bottom-6 rounded-full bg-white/15 px-3 py-1 text-sm text-white tabular-nums">
                {index + 1} / {count}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
