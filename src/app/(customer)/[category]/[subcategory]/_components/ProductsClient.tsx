"use client";

import { Database } from "@/shared/types/database.types";
import { ProductCard } from "@/features/products/components/ProductCard";

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  category?: { slug: string };
  images?: { image_url: string }[];
};

interface ProductsClientProps {
  initialProducts: Product[];
}

export default function ProductsClient({
  initialProducts,
}: ProductsClientProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {initialProducts.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
      {initialProducts.length === 0 && (
        <div className="col-span-full text-center py-12 text-gray-500">
          لا توجد منتجات في هذا القسم حالياً
        </div>
      )}
    </div>
  );
}
