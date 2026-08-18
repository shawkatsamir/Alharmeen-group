import { getOffers } from "@/services/server/products";
import { ProductListingPage } from "@/features/products/components/ProductListingPage";

export const metadata = {
  title: "عروض خاصة",
  description: "تسوق أفضل العروض والخصومات من مجموعة الحرمين",
};

export const revalidate = 3600;

export default async function OffersPage() {
  const offers = await getOffers();

  return (
    <ProductListingPage
      title="عروض خاصة"
      subtitle="خصومات على تشكيلة مختارة من الأجهزة الأصلية"
      products={offers}
      emptyMessage="لا توجد عروض حالياً"
    />
  );
}
