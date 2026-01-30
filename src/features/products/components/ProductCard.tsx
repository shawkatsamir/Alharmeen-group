"use client";

import Link from "next/link";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/shared/components/ui/Button";
import { Img } from "@/shared/components/ui/Image";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/shared/components/ui/Badge";
import { Product } from "../types";
import { toast } from "sonner";
import { CountdownTimer } from "./CountdownTimer";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
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

  const handleAddToCart = () => {
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

  return (
    <div className="group border md:rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white h-full flex flex-col">
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
          <Button className="w-full" size="lg" onClick={handleAddToCart}>
            <ShoppingCart className="w-4 h-4 ml-2" />
            اضف للسلة
          </Button>
          <Link href={`/product/${product.slug}`} className="w-full">
            <Button size="sm" variant="outline" className="w-full">
              عرض التفاصيل
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
