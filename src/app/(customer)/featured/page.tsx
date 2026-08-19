import { getFeaturedProducts } from "@/services/server/products";
import { ProductListingPage } from "@/features/products/components/ProductListingPage";

export const metadata = {
  title: "اخترنا لك",
  description: "تشكيلة مختارة من أفضل الأجهزة المنزلية من مجموعة الحرمين",
};

export const revalidate = 3600;

export default async function FeaturedPage() {
  const products = await getFeaturedProducts();

  return (
    <ProductListingPage
      title="اخترنا لك"
      subtitle="تشكيلة منتقاة من فريقنا"
      products={products}
      emptyMessage="لا توجد منتجات حالياً"
    />
  );
}
