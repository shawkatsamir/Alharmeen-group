import { getBestSellerProducts } from "@/services/server/products";
import { ProductCard } from "@/features/products/components/ProductCard";

export const metadata = {
  title: "الأكثر مبيعاً | مجموعة الحرمين",
  description: "تسوق المنتجات الأكثر مبيعاً من مجموعة الحرمين",
};

export const revalidate = 3600;

export default async function BestSellersPage() {
  const products = await getBestSellerProducts();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 border-r-4 border-primary pr-4">
          الأكثر مبيعاً
        </h1>
        <span className="text-gray-500">
          {products.length} {products.length === 1 ? "منتج" : "منتجات"}
        </span>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div key={product.id} className="h-full">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">لا توجد منتجات حالياً</p>
        </div>
      )}
    </div>
  );
}
