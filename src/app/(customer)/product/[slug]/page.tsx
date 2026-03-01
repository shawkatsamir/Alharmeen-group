import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getProductBySlug,
  getAllProductSlugs,
} from "@/services/server/products";
import ProductClient from "./_components/ProductClient";

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "المنتج غير موجود" };
  }

  const canonicalUrl = `https://alharmaingroup.com/product/${slug}`;
  const primaryImage =
    product.images?.find((img) => img.is_primary)?.image_url ??
    product.images?.[0]?.image_url;

  return {
    title: product.name_ar,
    description:
      product.description_ar ??
      `تسوق ${product.name_ar} من الحرمين جروب بأفضل الأسعار في مصر`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: product.name_ar,
      description: product.description_ar ?? undefined,
      url: canonicalUrl,
      type: "website",
      images: primaryImage ? [{ url: primaryImage }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name_ar,
    description: product.description_ar,
    sku: product.sku,
    url: `https://alharmaingroup.com/product/${slug}`,
    image: product.images?.map((img) => img.image_url) ?? [],
    brand: product.brand
      ? { "@type": "Brand", name: product.brand.name_ar }
      : undefined,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "EGP",
      availability:
        product.is_available && product.stock_quantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `https://alharmaingroup.com/product/${slug}`,
    },
    additionalProperty: product.specifications
      ? Object.entries(
          product.specifications as Record<string, string>,
        ).map(([key, value]) => ({
          "@type": "PropertyValue",
          name: key,
          value: value,
        }))
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductClient product={product} />
    </>
  );
}
