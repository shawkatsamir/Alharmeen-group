import { getOffers } from "@/services/server/products";
import { ProductCard } from "@/features/products/components/ProductCard";

export const metadata = {
  title: "عروض خاصة | مجموعة الحرمين",
  description: "تسوق أفضل العروض والخصومات من مجموعة الحرمين",
};

export const revalidate = 3600;

export default async function OffersPage() {
  const offers = await getOffers();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 border-r-4 border-primary pr-4">
          عروض خاصة
        </h1>
        <span className="text-gray-500">
          {offers.length} {offers.length === 1 ? "منتج" : "منتجات"}
        </span>
      </div>

      {offers.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {offers.map((product) => (
            <div key={product.id} className="h-full">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">لا توجد عروض حالياً</p>
        </div>
      )}
    </div>
  );
}
