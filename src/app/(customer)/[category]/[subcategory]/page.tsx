import { getProductsWithFilters } from "@/services/server/products";
import ProductsClient from "./_components/ProductsClient";
import { getSubCategory } from "@/services/server/categories";
import { Suspense } from "react";

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
  const { products, filterOptions, subcategoryName } =
    await getProductsWithFilters(subcategory);

  return (
    <div className="container bg-[#f5f6f8] mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        {subcategoryName || "المنتجات"}
      </h1>

      <Suspense fallback={<div>جاري التحميل...</div>}>
        <ProductsClient
          initialProducts={products}
          filterOptions={filterOptions}
          subcategoryName={subcategoryName}
        />
      </Suspense>
    </div>
  );
}
