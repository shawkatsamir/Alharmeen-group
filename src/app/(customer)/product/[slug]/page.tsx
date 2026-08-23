import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllProductSlugs,
  getProductBySlug,
  getRelatedProducts,
  getVariantSiblings,
} from "@/services/server/products";
import { ProductDetail } from "@/features/products/components/ProductDetail";
import ProductSlider from "@/features/products/components/ProductSlider";
import { toPlainTextExcerpt } from "@/features/products/lib/rich-content";
import { contentBlocksToPlainText } from "@/features/products/lib/content-blocks";
import { buildProductJsonLd } from "@/features/products/lib/product-json-ld";
import type { Product } from "@/features/products/types";

export const revalidate = 3600;

const SITE_URL = "https://alharmaingroup.com";

/**
 * Meta description precedence, shared by `generateMetadata` and the JSON-LD.
 *
 * `description_ar` is 3,000-6,000 characters of HTML, which made an unusable
 * meta description when passed through raw. Prefer the curated
 * `meta_description_ar`, else a plain-text excerpt.
 *
 * Blocks come before `description_ar` for the same reason the page renders them
 * first: they supersede the legacy HTML. Products authored in the admin editor
 * have no `description_ar` at all, so without this they fall through to the
 * generic fallback.
 *
 * Extracted because the two callers had drifted — the JSON-LD copy omitted the
 * `content_blocks` branch, so every block-authored product shipped structured
 * data with an empty description.
 */
function resolveDescription(product: Product, limit: number): string {
  return (
    product.meta_description_ar?.trim() ||
    toPlainTextExcerpt(contentBlocksToPlainText(product.content_blocks), limit) ||
    toPlainTextExcerpt(product.description_ar, limit) ||
    `تسوق ${product.name_ar.trim()} من الحرمين جروب بأفضل الأسعار في مصر`
  );
}

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

  const name = product.name_ar.trim();
  const canonicalUrl = `${SITE_URL}/product/${slug}`;
  const primaryImage =
    product.images?.find((img) => img.is_primary)?.image_url ??
    product.images?.[0]?.image_url;

  const description = resolveDescription(product, 160);

  return {
    title: product.meta_title_ar?.trim() || name,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: name,
      description,
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

  // Siblings and related products are independent reads; `getProductBySlug` is
  // React-cached, so this adds two round trips rather than three.
  const [siblings, related] = await Promise.all([
    getVariantSiblings(product.group_id),
    getRelatedProducts(product, 10),
  ]);

  const jsonLd = buildProductJsonLd({
    product,
    siblings,
    baseUrl: SITE_URL,
    // Structured data wants plain text, not the raw HTML blob.
    description: resolveDescription(product, 300),
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetail
        product={product}
        siblings={siblings}
        relatedSlot={
          related.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-border">
              <ProductSlider title="منتجات مشابهة" products={related} />
            </div>
          ) : null
        }
      />
    </>
  );
}
