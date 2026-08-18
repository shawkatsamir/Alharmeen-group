import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components/ui/Breadcrumb";
import { ProductVideos, VideoUrls } from "./ProductVideos";
import { ProductGallery } from "./detail/ProductGallery";
import { ProductBuyBox } from "./detail/ProductBuyBox";
import { ProductSection } from "./detail/ProductSection";
import { ProductAnchorNav } from "./detail/ProductAnchorNav";
import { ProductSpecs } from "./detail/ProductSpecs";
import { ProductAssurance } from "./detail/ProductAssurance";
import { RichContent } from "./detail/RichContent";
import {
  ProductHighlights,
  normalizeFeatures,
} from "./detail/ProductHighlights";
import { groupSpecifications } from "../lib/specifications";
import { hasProductVideos } from "../lib/videos";
import { hasContentBlocks } from "../lib/content-blocks";
import { hasRichContent } from "../lib/rich-content";
import type { Product } from "../types";

interface ProductDetailProps {
  product: Product;
  related?: Product[];
  relatedSlot?: React.ReactNode;
}

/**
 * One universal layout for every product, regardless of brand or category.
 *
 * The catalog is uneven: a Hitachi washing machine carries a 6,000-character
 * description, 19 specs and a video, while the single dishwasher has 13 specs
 * and nothing else. Every section below is therefore conditional — when the
 * data is absent the section is not rendered at all, so the page reflows with
 * no gap and no dangling heading. There are no "قريباً" placeholders.
 */
export function ProductDetail({ product, relatedSlot }: ProductDetailProps) {
  const features = normalizeFeatures(product.features);
  const specGroups = groupSpecifications(product.specifications);

  const showOverview =
    hasContentBlocks(product.content_blocks) ||
    hasRichContent(product.description_ar);
  const showHighlights = features.length > 0;
  const showSpecs = specGroups.length > 0;
  const showAssurance = true; // service promises always apply
  const videos = product.video_urls as unknown as VideoUrls | null;
  // `video_urls` defaults to the truthy `{}`, so emptiness has to be checked by
  // inspecting the values — see lib/videos.ts.
  const showVideos = hasProductVideos(product.video_urls);

  // Only sections that actually rendered get an anchor.
  const anchors = [
    showHighlights && { id: "highlights", label: "المميزات" },
    showOverview && { id: "overview", label: "نظرة عامة" },
    showSpecs && { id: "specs", label: "المواصفات" },
    showVideos && { id: "videos", label: "فيديو" },
    showAssurance && { id: "assurance", label: "الضمان والشحن" },
  ].filter((a): a is { id: string; label: string } => Boolean(a));

  // Products hang off leaf categories, and catalog URLs are two-level, so a
  // link is only built when the parent came back with the query.
  const subcategory = product.category;
  const parentCategory = subcategory?.parent;
  const subcategoryHref =
    parentCategory?.slug && subcategory?.slug
      ? `/${parentCategory.slug}/${subcategory.slug}`
      : null;

  return (
    <div className="min-h-screen bg-surface pb-32 lg:pb-12">
      <div className="container mx-auto px-4 py-6">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">الرئيسية</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {parentCategory?.slug && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={`/${parentCategory.slug}`}>
                      {parentCategory.name_ar}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            {subcategoryHref && subcategory && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={subcategoryHref}>{subcategory.name_ar}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1">
                {product.name_ar.trim()}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
          <ProductGallery
            images={product.images ?? []}
            productName={product.name_ar.trim()}
          />
          <ProductBuyBox product={product} />
        </div>

        <ProductAnchorNav anchors={anchors} />

        <div className="mt-6 space-y-6">
          {showHighlights && (
            <ProductSection id="highlights" title="أبرز المميزات">
              <ProductHighlights features={features} />
            </ProductSection>
          )}

          {showOverview && (
            <ProductSection id="overview" title="نظرة عامة على المنتج">
              <RichContent
                blocks={product.content_blocks}
                legacyHtml={product.description_ar}
              />
            </ProductSection>
          )}

          {showSpecs && (
            <ProductSection id="specs" title="المواصفات الفنية">
              <ProductSpecs groups={specGroups} />
            </ProductSection>
          )}

          {showVideos && (
            <ProductSection id="videos" title="فيديو المنتج">
              <ProductVideos videos={videos as VideoUrls} />
            </ProductSection>
          )}

          <ProductSection id="assurance" title="الضمان والشحن">
            <ProductAssurance
              warrantyInfo={product.warranty_info}
              brandName={product.brand?.name_ar}
            />
          </ProductSection>

          {relatedSlot}
        </div>
      </div>
    </div>
  );
}
