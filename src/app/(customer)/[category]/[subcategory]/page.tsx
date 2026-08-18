import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getProductsWithFilters } from "@/services/server/products";
import ProductsClient from "./_components/ProductsClient";
import {
  getSubCategory,
  getSubcategoryBySlug,
} from "@/services/server/categories";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components/ui/Breadcrumb";

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

export async function generateMetadata({
  params,
}: SubCategoryPageProps): Promise<Metadata> {
  const { category, subcategory } = await params;
  const found = await getSubcategoryBySlug(subcategory);

  if (!found) return { title: "القسم غير موجود" };

  return {
    title: found.name_ar,
    description:
      found.description_ar?.trim() ||
      `تسوق ${found.name_ar} من الحرمين جروب بأفضل الأسعار في مصر مع ضمان الوكيل المعتمد وشحن لكل المحافظات.`,
    alternates: {
      canonical: `https://alharmaingroup.com/${category}/${subcategory}`,
    },
  };
}

export default async function SubCategoryPage({
  params,
}: SubCategoryPageProps) {
  const { category, subcategory } = await params;
  const [{ products, filterOptions, subcategoryName }, categoryRow] =
    await Promise.all([
      getProductsWithFilters(subcategory),
      getSubcategoryBySlug(subcategory),
    ]);

  const parent = categoryRow?.parent;

  return (
    // The tint belongs to the page, not the container — it used to render as a
    // centered stripe with white gutters.
    <div className="bg-surface">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">الرئيسية</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {parent && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={`/${category}`}>{parent.name_ar}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {subcategoryName || "المنتجات"}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="mb-8 border-r-4 border-primary pr-4 text-2xl font-bold sm:text-3xl">
          {subcategoryName || "المنتجات"}
        </h1>

        <Suspense
          fallback={
            <div className="py-12 text-center text-muted-foreground">
              جاري التحميل...
            </div>
          }
        >
          <ProductsClient
            initialProducts={products}
            filterOptions={filterOptions}
            subcategoryName={subcategoryName}
          />
        </Suspense>
      </div>
    </div>
  );
}
