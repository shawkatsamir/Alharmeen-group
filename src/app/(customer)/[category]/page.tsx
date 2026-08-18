import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCategoryBySlug,
  getCategoryTiles,
} from "@/services/server/categories";
import { getProductsBySubcategory } from "@/services/server/products";
import { Section } from "@/shared/components/ui/Section";
import { ProductGrid } from "@/shared/components/ui/ProductGrid";
import { CategoryGrid } from "@/features/home/components/CategoryGrid";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components/ui/Breadcrumb";

export const revalidate = 3600;

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  const tiles = await getCategoryTiles();
  return tiles.map((tile) => ({ category: tile.slug }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) return { title: "القسم غير موجود" };

  return {
    title: category.name,
    description: `تسوق ${category.name} من الحرمين جروب — ${category.productCount} منتج بأفضل الأسعار في مصر مع ضمان الوكيل المعتمد.`,
    alternates: { canonical: `https://alharmaingroup.com/${slug}` },
  };
}

/**
 * Replaces an 8-line stub that rendered the literal English string
 * "Category Page" — and which every top-level nav link in the header, footer
 * and mobile menu pointed at.
 */
export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) notFound();

  const populatedSubcategories = category.subcategories.filter(
    (s) => s.productCount > 0,
  );

  // A preview row per subcategory beats one undifferentiated wall of products.
  const previews = await Promise.all(
    populatedSubcategories.map(async (sub) => ({
      sub,
      products: (await getProductsBySubcategory(sub.slug)).slice(0, 8),
    })),
  );

  return (
    <div className="bg-surface pb-12">
      <div className="container mx-auto px-4 pt-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">الرئيسية</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{category.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mt-6">
          <h1 className="text-2xl font-bold sm:text-3xl">{category.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {category.productCount} منتج متاح
          </p>
        </div>
      </div>

      {populatedSubcategories.length > 0 && (
        <Section title="الأقسام الفرعية">
          <CategoryGrid
            categories={populatedSubcategories.map((sub) => ({
              id: sub.id,
              // Subcategory tiles link two levels deep, so the slug carries the
              // parent segment.
              slug: `${category.slug}/${sub.slug}`,
              name: sub.name,
              imageUrl: sub.imageUrl,
              productCount: sub.productCount,
              subcategories: [],
            }))}
          />
        </Section>
      )}

      {previews.map(({ sub, products }) =>
        products.length > 0 ? (
          <Section
            key={sub.id}
            title={sub.name}
            seeMoreLink={`/${category.slug}/${sub.slug}`}
          >
            <ProductGrid products={products} priorityCount={0} />
          </Section>
        ) : null,
      )}

      {populatedSubcategories.length === 0 && (
        <Section>
          <div className="rounded-xl border border-border bg-surface-raised py-16 text-center">
            <p className="text-muted-foreground">
              لا توجد منتجات في هذا القسم حالياً
            </p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              العودة إلى الرئيسية
            </Link>
          </div>
        </Section>
      )}
    </div>
  );
}
