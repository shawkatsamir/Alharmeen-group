"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/shared/components/ui/Button";
import { Img } from "@/shared/components/ui/Image";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { Badge } from "@/shared/components/ui/Badge";
import { Product, VariantSibling } from "../types";
import { toast } from "sonner";
import { CountdownTimer } from "./CountdownTimer";
import WishlistButton from "@/features/wishlist/components/WishlistButton";
import CompareToggle from "./CompareToggle";
import { formatCurrency } from "@/lib/utils";
import { colorSwatchHex, findColorAxis } from "../constants/variant-axes";
import {
  describeVariant,
  readAxisValue,
  sortVariantMembers,
} from "../lib/variant-group";

interface ProductCardProps {
  product: Product;
  isWishlisted?: boolean;
  priority?: boolean;
  /**
   * The other variants this card stands for, when a listing has been collapsed
   * so a three-finish fridge occupies one card instead of three.
   */
  variants?: VariantSibling[];
}

export function ProductCard({
  product,
  isWishlisted = false,
  priority = false,
  variants = [],
}: ProductCardProps) {
  const hasDiscount = product.old_price && product.old_price > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(
        ((product.old_price! - product.price) / product.old_price!) * 100,
      )
    : 0;

  // Check if there's an active timed offer
  const hasTimedOffer =
    hasDiscount &&
    product.sale_end_date &&
    new Date(product.sale_end_date) > new Date();

  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const cartItem = useCartStore((state) =>
    state.items.find((i) => i.id === product.id),
  );
  const quantity = cartItem?.quantity || 0;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const swatches = variants.length > 1 ? sortVariantMembers(variants) : [];
  const axes = product.group?.axes ?? [];
  /*
   * Cards stay whole-variant — there is no room for one row per axis. A colour
   * group gets dots; anything else gets short text pills, because a 20px circle
   * cannot express "43 بوصة" or "بشواية" and would render two identical blanks.
   */
  const colorAxis = findColorAxis(axes);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const preview = swatches.find((v) => v.id === previewId);

  /*
   * `is_primary`, with positional fallback. This card used to read `images[0]`
   * while the gallery, the buy box and the OG image all read `is_primary`, so a
   * product whose primary image was not first showed one photo in the grid and
   * a different one on the page it linked to.
   */
  const primaryImage =
    product.images?.find((img) => img.is_primary) ?? product.images?.[0];
  const previewImage =
    preview?.images?.find((img) => img.is_primary) ?? preview?.images?.[0];
  const shownImage = previewImage ?? primaryImage;

  const outOfStock =
    product.stock_quantity !== undefined && product.stock_quantity <= 0;
  const lowStock =
    !outOfStock &&
    product.stock_quantity !== undefined &&
    product.stock_quantity > 0 &&
    product.stock_quantity <= 2;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    addItem({
      id: product.id,
      name: product.name_ar,
      price: product.price,
      image: product.images?.[0]?.image_url || "/placeholder.svg",
      slug: product.slug,
      brand: product.brand?.name_ar || "",
    });
    toast.success("تم إضافة المنتج إلى السلة");
  };

  const handleUpdateQuantity = (newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(product.id);
    } else {
      updateQuantity(product.id, newQuantity);
    }
  };

  return (
    /*
     * `group/card` is named on purpose. A bare `group` would also be matched by
     * any ancestor that carries `.group` (Tailwind's group-* compiles to a
     * descendant selector), which is what made hovering a rail light up every
     * sibling card. Naming it makes this card immune to ancestor hover state.
     *
     * `relative hover:z-10` keeps the hover shadow above the next sibling's
     * opaque background instead of being painted underneath it.
     */
    <div className="group/card relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface-raised transition-[box-shadow,border-color,transform] duration-200 hover:z-10 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_8px_28px_-8px_oklch(0.42_0.128_255/0.25)] focus-within:z-10">
      <div className="relative aspect-square overflow-hidden bg-white">
        {/*
         * No link here on purpose — the title below carries a stretched
         * `after:inset-0` overlay that makes the whole card clickable with a
         * single, properly-labelled link.
         */}
        <Img
          src={shownImage?.image_url || "/placeholder.svg"}
          alt={shownImage?.alt_text_ar || preview?.name_ar || product.name_ar}
          fill
          priority={priority}
          sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 260px"
          className="object-contain p-4 transition-transform duration-300 group-hover/card:scale-[1.04]"
        />

        {/* Badges */}
        <div className="pointer-events-none absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
          {hasDiscount && <Badge variant="sale">خصم {discountPercentage}%</Badge>}
          {product.is_new && !hasDiscount && (
            <Badge variant="accent">جديد</Badge>
          )}
          {outOfStock && <Badge variant="secondary">غير متوفر</Badge>}
        </div>

        {/* Quick actions. Always visible on touch, hover-revealed on desktop. */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 opacity-100 transition-opacity duration-300 lg:opacity-0 lg:group-hover/card:opacity-100 lg:group-focus-within/card:opacity-100">
          <WishlistButton productId={product.id} isWishlisted={isWishlisted} />
          <CompareToggle productId={product.id} />
        </div>
      </div>

      <div className="flex grow flex-col p-4">
        {product.brand?.name_ar && (
          <span className="mb-1 text-xs font-medium text-muted-foreground">
            {product.brand.name_ar}
          </span>
        )}

        <h3 className="mb-2 min-h-10 text-sm leading-snug font-semibold sm:text-[0.95rem]">
          <Link
            href={`/product/${product.slug}`}
            className="line-clamp-2 after:absolute after:inset-0 after:z-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {product.name_ar}
          </Link>
        </h3>

        {/*
         * Colour dots, not the image swatches the buy box uses. A card is dense
         * and already carries a photo; the buy box has room for a thumbnail per
         * finish. Both link, which is what matters — the whole point of
         * collapsing the grid is that the sibling URLs stay crawlable from it.
         *
         * `relative z-10` lifts these above the stretched `after:inset-0`
         * overlay on the title link, which would otherwise swallow the clicks.
         */}
        {swatches.length > 0 && (
          <ul
            className="relative z-10 mb-2 flex flex-wrap items-center gap-1.5"
            onMouseLeave={() => setPreviewId(null)}
          >
            {swatches.map((variant) => {
              const label =
                describeVariant(variant.variant_values, axes) || variant.name_ar;
              /*
               * Read the COLOUR axis value, not the joined label. Passing
               * `describeVariant(...)` here was a real bug: a two-axis group
               * produces "أسود · 43 بوصة", which matches no colour, so every
               * dot silently fell through to the blank fallback.
               */
              const hex = colorAxis
                ? colorSwatchHex(readAxisValue(variant.variant_values, colorAxis))
                : null;
              const isCurrent = variant.id === product.id;

              const shared = {
                href: `/product/${variant.slug}`,
                prefetch: false as const,
                "aria-label": `${label} — ${formatCurrency(variant.price)}`,
                title: label,
                onMouseEnter: () => setPreviewId(variant.id),
                onFocus: () => setPreviewId(variant.id),
                onBlur: () => setPreviewId(null),
              };

              return (
                <li key={variant.id}>
                  {hex ? (
                    <Link
                      {...shared}
                      className={[
                        "block h-5 w-5 rounded-full border transition",
                        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                        isCurrent
                          ? "border-primary ring-1 ring-primary"
                          : "border-border hover:border-primary/60",
                      ].join(" ")}
                      style={{ backgroundColor: hex }}
                    />
                  ) : (
                    <Link
                      {...shared}
                      className={[
                        "block max-w-24 truncate rounded-full border px-2 py-0.5 text-[10px] leading-4 transition",
                        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                        isCurrent
                          ? "border-primary text-primary ring-1 ring-primary"
                          : "border-border text-muted-foreground hover:border-primary/60",
                      ].join(" ")}
                    >
                      {label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-auto flex flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-lg font-bold text-primary">
              {formatCurrency(preview?.price ?? product.price)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">
                {formatCurrency(product.old_price!)}
              </span>
            )}
          </div>

          {/*
           * Fixed-height slots. These rows are conditional, and cards sit in a
           * `align-items: stretch` flex row, so letting them collapse made one
           * card's countdown/low-stock line resize every sibling in the rail —
           * and the countdown is client-only, so siblings reflowed on hydration.
           */}
          <div className="h-5">
            {hasTimedOffer && (
              <CountdownTimer endDate={product.sale_end_date!} />
            )}
          </div>
          <div className="h-4">
            {lowStock && (
              <span className="text-xs font-bold text-sale">
                {product.stock_quantity === 1
                  ? "متبقي قطعة واحدة فقط"
                  : "متبقي قطعتين فقط"}
              </span>
            )}
          </div>
        </div>

        {/* z-10 lifts the controls above the card-wide link overlay. */}
        <div className="relative z-10 mt-3">
          {outOfStock ? (
            <Button className="w-full" size="lg" variant="secondary" disabled>
              غير متوفر حالياً
            </Button>
          ) : mounted && quantity > 0 ? (
            <div className="flex h-11 w-full items-center justify-between rounded-md border border-border px-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="إنقاص الكمية"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleUpdateQuantity(quantity - 1);
                }}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="font-semibold tabular-nums">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="زيادة الكمية"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (
                    product.stock_quantity !== undefined &&
                    quantity >= product.stock_quantity
                  ) {
                    toast.error("عفواً، الكمية المطلوبة غير متوفرة");
                    return;
                  }
                  handleUpdateQuantity(quantity + 1);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button className="w-full" size="lg" onClick={handleAddToCart}>
              <ShoppingCart className="ml-2 h-4 w-4" />
              أضف للسلة
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
