import Link from "next/link";
import { Metadata } from "next";
import { Heart } from "lucide-react";
import { getWishlistProducts } from "@/features/wishlist/actions/wishlist";
import { ProductGrid } from "@/shared/components/ui/ProductGrid";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import type { Product } from "@/features/products/types";

export const metadata: Metadata = {
  title: "المفضلة",
  description: "قائمة المنتجات المفضلة لديك",
};

export const revalidate = 0; // Dynamic page

export default async function WishlistPage() {
  const products = (await getWishlistProducts()) as Product[];

  return (
    <div className="bg-surface">
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 border-r-4 border-primary pr-4 text-2xl font-bold sm:text-3xl">
          المفضلة
        </h1>

        {products.length > 0 ? (
          <ProductGrid
            products={products}
            wishlistIds={products.map((p) => p.id)}
          />
        ) : (
          <EmptyState
            icon={<Heart className="h-6 w-6 text-muted-foreground" />}
            title="لا توجد منتجات في المفضلة لديك"
            description="اضغط على أيقونة القلب في أي منتج لإضافته هنا."
            action={
              <Link
                href="/"
                className="text-sm font-medium text-primary hover:underline"
              >
                تصفح المنتجات
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
