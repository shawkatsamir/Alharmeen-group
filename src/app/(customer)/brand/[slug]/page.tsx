import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getBrandBySlug,
  getBrands,
  getProductsByBrand,
} from "@/services/server/products";
import { Section } from "@/shared/components/ui/Section";
import { ProductGrid } from "@/shared/components/ui/ProductGrid";
import { Img } from "@/shared/components/ui/Image";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components/ui/Breadcrumb";

export const revalidate = 3600;

interface BrandPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const brands = await getBrands();
  return brands.map((brand) => ({ slug: brand.slug }));
}

export async function generateMetadata({
  params,
}: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);

  if (!brand) return { title: "الماركة غير موجودة" };

  return {
    title: `منتجات ${brand.name_ar}`,
    description:
      brand.description_ar?.trim() ||
      `تسوق منتجات ${brand.name_ar} الأصلية من الحرمين جروب، وكيل معتمد، بضمان الوكيل وأفضل الأسعار في مصر.`,
    alternates: { canonical: `https://alharmaingroup.com/brand/${slug}` },
  };
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);

  if (!brand) notFound();

  const products = await getProductsByBrand(brand.id);

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
              <BreadcrumbPage>{brand.name_ar}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mt-6 flex flex-wrap items-center gap-5 rounded-xl border border-border bg-surface-raised p-6">
          {/* No brand has a logo_url yet — fall back to a wordmark. */}
          {brand.logo_url ? (
            <div className="relative h-16 w-32 shrink-0">
              <Img
                src={brand.logo_url}
                alt={brand.name_ar}
                fill
                sizes="128px"
                className="object-contain"
              />
            </div>
          ) : (
            <span className="flex h-16 shrink-0 items-center rounded-lg bg-primary-soft px-5 text-lg font-bold text-primary">
              {brand.name_ar}
            </span>
          )}

          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">
              منتجات {brand.name_ar}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {products.length} منتج · وكيل معتمد بضمان رسمي
            </p>
            {brand.description_ar && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {brand.description_ar}
              </p>
            )}
          </div>
        </div>
      </div>

      <Section>
        {products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <div className="rounded-xl border border-border bg-surface-raised py-16 text-center">
            <p className="text-muted-foreground">
              لا توجد منتجات من {brand.name_ar} حالياً
            </p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              العودة إلى الرئيسية
            </Link>
          </div>
        )}
      </Section>
    </div>
  );
}
