"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Separator } from "@/shared/components/ui/Separator";
import WishlistButton from "@/features/wishlist/components/WishlistButton";
import CompareToggle from "../CompareToggle";
import { CountdownTimer } from "../CountdownTimer";
import { ShareButton } from "./ShareButton";
import { Check, Minus, Plus, ShoppingCart, X } from "lucide-react";
import type { Product } from "../../types";
import { pickSpecHighlights } from "../../lib/specifications";

interface ProductBuyBoxProps {
  product: Product;
}

export function ProductBuyBox({ product }: ProductBuyBoxProps) {
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const cartItem = useCartStore((s) => s.items.find((i) => i.id === product.id));
  const quantity = cartItem?.quantity ?? 0;

  // Cart quantity comes from a persisted zustand store, so it can't be trusted
  // until after hydration. Deferred rather than set synchronously in the effect
  // body, matching ProductCard.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const inStock = product.is_available && product.stock_quantity > 0;
  const hasDiscount = Boolean(
    product.old_price && product.old_price > product.price,
  );
  const saving = hasDiscount ? product.old_price! - product.price : 0;
  const discountPercentage = hasDiscount
    ? Math.round((saving / product.old_price!) * 100)
    : 0;
  const hasTimedOffer =
    hasDiscount &&
    product.sale_end_date &&
    new Date(product.sale_end_date) > new Date();

  const highlights = pickSpecHighlights(product.specifications, 4);

  const primaryImage =
    product.images?.find((i) => i.is_primary)?.image_url ??
    product.images?.[0]?.image_url ??
    "/placeholder.svg";

  const handleAdd = () => {
    addItem({
      id: product.id,
      name: product.name_ar,
      price: product.price,
      image: primaryImage,
      slug: product.slug,
      brand: product.brand?.name_ar || "",
    });
    toast.success("تم إضافة المنتج إلى السلة");
  };

  const handleQuantity = (next: number) => {
    if (next <= 0) {
      removeItem(product.id);
      return;
    }
    if (next > product.stock_quantity) {
      toast.error("عفواً، الكمية المطلوبة غير متوفرة");
      return;
    }
    updateQuantity(product.id, next);
  };

  const priceBlock = (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="text-3xl font-bold text-primary">
        {product.price.toLocaleString("en-EG")} ج.م
      </span>
      {hasDiscount && (
        <>
          <span className="text-lg text-muted-foreground line-through">
            {product.old_price!.toLocaleString("en-EG")} ج.م
          </span>
          <Badge variant="sale">وفر {saving.toLocaleString("en-EG")} ج.م</Badge>
        </>
      )}
    </div>
  );

  const quantityControl =
    mounted && quantity > 0 ? (
      <div className="flex h-12 w-full items-center justify-between rounded-md border border-border px-2 sm:w-40">
        <Button
          variant="ghost"
          size="icon"
          aria-label="إنقاص الكمية"
          onClick={() => handleQuantity(quantity - 1)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold tabular-nums">{quantity}</span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="زيادة الكمية"
          disabled={quantity >= product.stock_quantity}
          onClick={() => handleQuantity(quantity + 1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    ) : (
      <Button
        size="lg"
        className="h-12 w-full sm:w-auto sm:min-w-52"
        onClick={handleAdd}
        disabled={!inStock}
      >
        <ShoppingCart className="ml-2 h-5 w-5" />
        {inStock ? "أضف للسلة" : "نفذت الكمية"}
      </Button>
    );

  return (
    <>
      <div className="rounded-xl border border-border bg-surface-raised p-6 lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:p-8">
        {product.brand?.name_ar && (
          <Link
            href={`/brand/${product.brand.slug}`}
            className="mb-2 inline-block text-sm font-medium text-primary hover:underline"
          >
            {product.brand.name_ar}
          </Link>
        )}

        <h1 className="text-xl leading-snug font-bold text-foreground sm:text-2xl">
          {product.name_ar.trim()}
        </h1>

        {product.sku && (
          <p className="mt-2 text-xs text-muted-foreground">
            كود المنتج: <span className="font-medium">{product.sku}</span>
          </p>
        )}

        <Separator className="my-5" />

        {priceBlock}

        {hasDiscount && (
          <p className="mt-2 text-sm font-medium text-sale">
            خصم {discountPercentage}%
          </p>
        )}

        {hasTimedOffer && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-sale-soft p-3">
            <span className="text-sm font-medium text-sale">ينتهي العرض خلال</span>
            <CountdownTimer endDate={product.sale_end_date!} />
          </div>
        )}

        <Separator className="my-5" />

        <div className="flex items-center gap-2">
          {inStock ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-sm font-medium text-success">
              <Check className="h-4 w-4" />
              متوفر في المخزون
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sale-soft px-3 py-1 text-sm font-medium text-sale">
              <X className="h-4 w-4" />
              غير متوفر حالياً
            </span>
          )}
          {inStock && product.stock_quantity <= product.low_stock_threshold && (
            <span className="text-sm font-medium text-sale">
              باقي {product.stock_quantity} قطع فقط
            </span>
          )}
        </div>

        {/* At-a-glance specs. Skipped entirely when the product has none. */}
        {highlights.length > 0 && (
          <dl className="mt-5 grid grid-cols-2 gap-3">
            {highlights.map((spec) => (
              <div
                key={spec.key}
                className="rounded-lg bg-surface-sunken px-3 py-2"
              >
                <dt className="text-xs text-muted-foreground">{spec.label}</dt>
                <dd className="mt-0.5 truncate text-sm font-semibold" title={spec.value}>
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <Separator className="my-5" />

        <div className="flex flex-wrap items-center gap-3">
          {quantityControl}
          <div className="flex items-center gap-2">
            <WishlistButton productId={product.id} />
            <CompareToggle productId={product.id} />
            <ShareButton title={product.name_ar.trim()} />
          </div>
        </div>
      </div>

      {/*
       * Mobile buy bar. Sits above MobileBottomNav (h-16) rather than on top of
       * it. Hidden on lg where the buy box itself is sticky.
       */}
      <div className="fixed inset-x-0 bottom-16 z-40 flex items-center gap-3 border-t border-border bg-surface-raised/95 px-4 py-3 shadow-[0_-4px_16px_-8px_rgb(0_0_0/0.2)] backdrop-blur lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">
            {product.name_ar.trim()}
          </p>
          <p className="text-lg font-bold text-primary">
            {product.price.toLocaleString("en-EG")} ج.م
          </p>
        </div>
        {mounted && quantity > 0 ? (
          <div className="flex h-11 items-center gap-1 rounded-md border border-border px-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="إنقاص الكمية"
              onClick={() => handleQuantity(quantity - 1)}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-6 text-center font-semibold tabular-nums">
              {quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="زيادة الكمية"
              disabled={quantity >= product.stock_quantity}
              onClick={() => handleQuantity(quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button size="lg" onClick={handleAdd} disabled={!inStock}>
            <ShoppingCart className="ml-2 h-4 w-4" />
            {inStock ? "أضف للسلة" : "نفذت"}
          </Button>
        )}
      </div>
    </>
  );
}
