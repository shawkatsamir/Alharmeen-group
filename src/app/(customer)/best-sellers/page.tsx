import { getBestSellerProducts } from "@/services/server/products";
import { ProductListingPage } from "@/features/products/components/ProductListingPage";

export const metadata = {
  title: "الأكثر مبيعاً",
  description: "تسوق المنتجات الأكثر مبيعاً من مجموعة الحرمين",
};

export const revalidate = 3600;

export default async function BestSellersPage() {
  const products = await getBestSellerProducts();

  return (
    <ProductListingPage
      title="الأكثر مبيعاً"
      subtitle="المنتجات التي يختارها عملاؤنا أكثر من غيرها"
      products={products}
      emptyMessage="لا توجد منتجات حالياً"
    />
  );
}
