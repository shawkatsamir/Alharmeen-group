import { getProductsBySubcategory } from "@/services/server/products";
import ProductsClient from "./_components/ProductsClient";
import { getSubCategory } from "@/services/server/categories";

export const revalidate = 60; // Revalidate every minute

export async function generateStaticParams() {
  const subcategories = await getSubCategory();
  return subcategories;
}

interface SubCategoryPageProps {
  params: Promise<{
    category: string;
    subcategory: string;
  }>;
}

export default async function SubCategoryPage({
  params,
}: SubCategoryPageProps) {
  const { subcategory } = await params;
  const products = await getProductsBySubcategory(subcategory);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        {/* We could fetch the subcategory name here if needed, or rely on info from the products */}
        المنتجات
      </h1>
      <ProductsClient initialProducts={products} />
    </div>
  );
}
