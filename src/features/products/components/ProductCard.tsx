import Link from "next/link";
import { Database } from "@/shared/types/database.types";
import { Button } from "@/shared/components/ui/Button";
import { Img } from "@/shared/components/ui/Image";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/shared/components/ui/Badge";

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  category?: { slug: string };
  images?: { image_url: string }[];
};

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="group border rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white">
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {/* Main Image */}
        <Img
          src={product.images?.[0]?.image_url || "/placeholder.jpg"}
          alt={product.name_ar}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        <Badge className="absolute top-3 right-3 z-10" variant="default">
          جديد
        </Badge>
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
      </div>

      <div className="p-4">
        {/* <p className="text-sm text-gray-500 mb-1">{product.brand}</p> */}
        <h3 className="font-semibold mb-2 line-clamp-2 min-h-[3rem]">
          {product.name_ar}
        </h3>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg font-bold text-primary">
            {product.price.toLocaleString()} ج.م
          </span>
          {product.old_price && (
            <span className="text-sm text-gray-400 line-through">
              {product.old_price.toLocaleString()} ج.م
            </span>
          )}
        </div>

        <Button className="w-full" size="lg">
          <ShoppingCart className="w-4 h-4 ml-2" />
          اضف للسلة
        </Button>
        <Link href={`/product/${product.slug}`} className="text-sm">
          <Button size="sm" variant="outline">
            عرض التفاصيل
          </Button>
        </Link>
      </div>
    </div>
  );
}
