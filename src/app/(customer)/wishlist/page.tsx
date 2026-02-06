import { getWishlistProducts } from "@/features/wishlist/actions/wishlist";
import { ProductCard } from "@/features/products/components/ProductCard";
import { Metadata } from "next";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Product } from "@/features/products/types";

export const metadata: Metadata = {
  title: "المفضلة | الحرمين",
  description: "قائمة المنتجات المفضلة لديك",
};

export const revalidate = 0; // Dynamic page

export default async function WishlistPage() {
  const products = await getWishlistProducts();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">المفضلة</h1>
      {products.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">لا توجد منتجات في المفضلة لديك</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {products.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
