"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/shared/components/ui/Button";
import { Img } from "@/shared/components/ui/Image";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/shared/components/ui/Badge";
import { Product } from "../types";
import { toast } from "sonner";
import { CountdownTimer } from "./CountdownTimer";
import WishlistButton from "@/features/wishlist/components/WishlistButton";
import CompareToggle from "./CompareToggle";
import { useRouter } from "next/navigation";

interface ProductCardProps {
  product: Product;
  isWishlisted?: boolean;
}

export function ProductCard({
  product,
  isWishlisted = false,
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

  const router = useRouter();
  const handleCardClick = () => {
    router.push(`/product/${product.slug}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group border md:rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white h-full flex flex-col"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {/* Main Image */}
        <Img
          src={product.images?.[0]?.image_url || "/placeholder.svg"}
          alt={product.name_ar}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Badges */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          {product.is_new && !hasDiscount && (
            <Badge variant="default">جديد</Badge>
          )}
          {hasDiscount && (
            <Badge variant="destructive">وفر {discountPercentage}%</Badge>
          )}
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />

        <div className="absolute top-3 left-3 z-10 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-2">
          <WishlistButton productId={product.id} isWishlisted={isWishlisted} />
          <CompareToggle productId={product.id} />
        </div>
      </div>

      <div className="p-4 flex flex-col grow">
        <h3 className="font-semibold mb-2 line-clamp-2 min-h-12">
          {product.name_ar}
        </h3>
        <div className="flex flex-col gap-1 mb-3 mt-auto">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">
              {product.price.toLocaleString()} ج.م
            </span>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">
                {product.old_price!.toLocaleString()} ج.م
              </span>
            )}
          </div>
          {hasTimedOffer && <CountdownTimer endDate={product.sale_end_date!} />}
        </div>

        <div className="flex flex-col gap-2">
          {product.stock_quantity === 2 && (
            <span className="text-red-500 text-xs font-bold w-full text-center">
              متبقي قطعتين فقط
            </span>
          )}
          {product.stock_quantity !== undefined &&
          product.stock_quantity <= 0 ? (
            <Button
              className="w-full bg-gray-300 pointer-events-none text-gray-500"
              size="lg"
              disabled
            >
              غير متوفر حاليا
            </Button>
          ) : mounted && quantity > 0 ? (
            <div className="flex items-center gap-3 w-full">
              <div className="flex items-center justify-between w-full border rounded-md h-11 px-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleUpdateQuantity(quantity - 1);
                  }}
                >
                  -
                </Button>
                <span className="font-medium">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-black"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    // Optionally check stock limit here too
                    if (
                      product.stock_quantity !== undefined &&
                      quantity >= product.stock_quantity
                    ) {
                      toast.error("عفوا، الكمية المطلوبة غير متوفرة");
                      return;
                    }
                    handleUpdateQuantity(quantity + 1);
                  }}
                >
                  +
                </Button>
              </div>
            </div>
          ) : (
            <Button className="w-full" size="lg" onClick={handleAddToCart}>
              <ShoppingCart className="w-4 h-4 ml-2" />
              اضف للسلة
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
