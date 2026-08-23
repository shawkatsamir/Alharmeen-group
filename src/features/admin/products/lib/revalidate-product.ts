import { revalidatePath } from "next/cache";

/**
 * Every ISR path a product appears on.
 *
 * The storefront is statically generated (`revalidate = 3600` on the home,
 * product, featured, offers and best-seller pages; `60` on subcategory
 * listings), so a mutation that does not revalidate is invisible for up to an
 * hour. The previous `update-product.ts` revalidated only `/product/<slug>`,
 * `/admin/products` and `/`, which left the category and subcategory listings —
 * where the product is actually browsed — showing stale price and stock.
 *
 * Catalog URLs are two-level: `/[category]/[subcategory]`, where the product's
 * own category is the leaf and its `parent` is the top-level entry.
 */
export interface ProductRevalidationTarget {
  slug: string;
  /** Set when the slug changed, so the old URL stops serving a stale page. */
  previousSlug?: string | null;
  /** Slug of the product's own (leaf) category. */
  categorySlug?: string | null;
  /** Slug of that category's parent, i.e. the first URL segment. */
  parentSlug?: string | null;
  /** Previous category, when the product was moved between categories. */
  previousCategorySlug?: string | null;
  previousParentSlug?: string | null;
  brandSlug?: string | null;
  previousBrandSlug?: string | null;
  /**
   * Slugs of the other variants in this product's group.
   *
   * Each variant page statically embeds its siblings' prices and stock in the
   * colour switcher, so changing one variant makes every *other* variant's page
   * wrong until it regenerates — up to an hour. Editing the silver fridge has
   * to rebuild the black one's page too.
   */
  siblingSlugs?: readonly string[] | null;
  /** Siblings of the group the product just left, when it was regrouped. */
  previousSiblingSlugs?: readonly string[] | null;
}

export function revalidateProduct(target: ProductRevalidationTarget): void {
  const paths = new Set<string>([
    "/",
    "/offers",
    "/featured",
    "/best-sellers",
    "/admin/products",
    // generateStaticParams / sitemap read the slug list, so a create, archive
    // or rename has to invalidate it too.
    "/sitemap.xml",
  ]);

  paths.add(`/product/${target.slug}`);
  if (target.previousSlug && target.previousSlug !== target.slug) {
    paths.add(`/product/${target.previousSlug}`);
  }

  addCategoryPaths(paths, target.parentSlug, target.categorySlug);
  addCategoryPaths(paths, target.previousParentSlug, target.previousCategorySlug);

  if (target.brandSlug) paths.add(`/brand/${target.brandSlug}`);
  if (target.previousBrandSlug) paths.add(`/brand/${target.previousBrandSlug}`);

  for (const slug of target.siblingSlugs ?? []) {
    paths.add(`/product/${slug}`);
  }
  for (const slug of target.previousSiblingSlugs ?? []) {
    paths.add(`/product/${slug}`);
  }

  for (const path of paths) {
    revalidatePath(path);
  }
}

function addCategoryPaths(
  paths: Set<string>,
  parentSlug: string | null | undefined,
  categorySlug: string | null | undefined,
): void {
  if (!categorySlug) return;

  if (parentSlug) {
    paths.add(`/${parentSlug}/${categorySlug}`);
    paths.add(`/${parentSlug}`);
  } else {
    // A top-level category with no parent is itself the first URL segment.
    paths.add(`/${categorySlug}`);
  }
}
