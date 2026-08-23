import { cache } from "react";
import { createStaticClient } from "@/lib/supabase/server";
import type { Brand, Product, VariantSibling } from "@/features/products/types";

export type { Product };

/**
 * Every product read in this module returns the same relation shape, which is
 * what `features/products/types.ts#Product` declares. Keep them in step.
 *
 * This used to be declared here and then re-typed inline at seven call sites,
 * so adding `group:product_groups(*)` meant eight edits and seven chances to
 * miss one. Every fetcher now uses the constant.
 */
const PRODUCT_SELECT = `
      *,
      brand:brands(*),
      category:categories(*),
      images:product_images(*),
      group:product_groups(*)
    ` as const;

/**
 * The detail page additionally needs the parent category for its breadcrumb.
 *
 * `parent:parent_id(*)` — hinting the FK *column* — is what resolves the
 * self-reference as to-one. Hinting the table (`categories!parent_id`) resolves
 * it as to-many and returns the (empty) children array instead, which silently
 * prerendered every product page as a 404 the last time it was got wrong.
 */
const PRODUCT_DETAIL_SELECT = `
      *,
      brand:brands(*),
      category:categories(*, parent:parent_id(*)),
      images:product_images(*),
      group:product_groups(*)
    ` as const;

/**
 * Enough to render a swatch: identity, price, availability and one image.
 *
 * Deliberately not `*` — a variant page embeds every sibling, and `*` would
 * ship each sibling's `content_blocks` and `description_ar` (3,000-6,000
 * characters apiece) to the browser for copy that is never rendered.
 */
const VARIANT_SIBLING_SELECT = `
      id, slug, name_ar, sku, price, old_price,
      is_available, is_active, stock_quantity,
      group_id, is_group_primary, variant_values,
      images:product_images(image_url, is_primary, alt_text_ar)
    ` as const;

export async function getProducts(options?: {
  limit?: number;
  offset?: number;
  featured?: boolean;
}): Promise<Product[]> {
  const supabase = await createStaticClient();
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true);

  if (options?.featured) {
    query = query.eq("is_featured", true);
  }

  // Deterministic order — otherwise the homepage rails reshuffle between
  // ISR regenerations.
  query = query.order("created_at", { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 10) - 1,
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

  return data as Product[];
}

/**
 * Wrapped in React `cache()` because the detail route reads it twice per
 * render — once in `generateMetadata` and once in the page body — and now a
 * third time to resolve the variant group. Without this, one page view is three
 * identical round trips.
 *
 * The cache is per-request, so it does not hold stale data across ISR
 * regenerations.
 */
export const getProductBySlug = cache(async function getProductBySlug(
  slug: string,
): Promise<Product | null> {
  const supabase = await createStaticClient();
  const { data, error } = await supabase
    .from("products")
    // Embeds the parent category too, so the detail page can build the
    // `/[category]/[subcategory]` breadcrumb without a second round trip.
    .select(PRODUCT_DETAIL_SELECT)
    .eq("slug", slug)
    .single();

  if (error) {
    console.error(`Error fetching product with slug ${slug}:`, error);
    return null;
  }

  return data as Product;
});

/**
 * The other variants of a product's group, the current one included.
 *
 * Returns `[]` — never a group of one — when the product has no group, so
 * callers can treat "no group" and "group with nothing to choose between"
 * identically.
 *
 * Archived variants are excluded: an `is_active = false` product has no page to
 * link to, and `generateStaticParams` never built one, so a swatch pointing at
 * it would be an internal link to a 404.
 */
export const getVariantSiblings = cache(async function getVariantSiblings(
  groupId: string | null,
): Promise<VariantSibling[]> {
  if (!groupId) return [];

  const supabase = await createStaticClient();
  const { data, error } = await supabase
    .from("products")
    .select(VARIANT_SIBLING_SELECT)
    .eq("group_id", groupId)
    .eq("is_active", true);

  if (error) {
    console.error(`Error fetching variant siblings for group ${groupId}:`, error);
    return [];
  }

  const members = (data ?? []) as VariantSibling[];
  // A lone survivor is not a choice — see `hasVariantChoice`.
  return members.length > 1 ? members : [];
});

export async function getProductsByCategory(
  categoryId: string,
): Promise<Product[]> {
  const supabase = await createStaticClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("category_id", categoryId)
    .eq("is_active", true);

  if (error) {
    console.error(`Error fetching products for category ${categoryId}:`, error);
    return [];
  }

  return data as Product[];
}

export async function getProductsByBrand(brandId: string): Promise<Product[]> {
  const supabase = await createStaticClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("brand_id", brandId)
    .eq("is_active", true);

  if (error) {
    console.error(`Error fetching products for brand ${brandId}:`, error);
    return [];
  }

  return data as Product[];
}

export async function getFeaturedProducts(
  options: {
    limit?: number;
    offset?: number;
  } = {},
): Promise<Product[]> {
  return getProducts({ ...options, featured: true });
}

export async function getBestSellerProducts(
  options: {
    limit?: number;
    offset?: number;
  } = {},
): Promise<Product[]> {
  const supabase = await createStaticClient();
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_best_seller", true)
    .eq("is_active", true)
    // Without an explicit order Postgres returns rows in an arbitrary order,
    // so the rail reshuffled on every ISR regeneration.
    .order("sales_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 10) - 1,
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching best seller products:", error);
    return [];
  }

  return data as Product[];
}

export async function getOffers(
  options: {
    limit?: number;
    offset?: number;
  } = {},
): Promise<Product[]> {
  const supabase = await createStaticClient();
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_special_offer", true)
    .eq("is_active", true)
    // Soonest-ending offers first; stable tiebreak so ISR output is repeatable.
    .order("sale_end_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 10) - 1,
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching offers:", error);
    return [];
  }

  return data as Product[];
}

export async function getBrands(): Promise<Brand[]> {
  const supabase = await createStaticClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching brands:", error);
    return [];
  }

  return data;
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const supabase = await createStaticClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching brand with slug ${slug}:`, error);
    return null;
  }

  return data;
}

/**
 * Products from the same category, excluding the current one.
 *
 * Falls back to same-brand products when the category is too thin to fill a
 * rail — several categories hold only 1-3 products, and an empty "منتجات
 * مشابهة" rail is worse than none.
 */
export async function getRelatedProducts(
  product: Pick<Product, "id" | "category_id" | "brand_id" | "group_id">,
  limit = 10,
): Promise<Product[]> {
  const supabase = await createStaticClient();

  /*
   * Siblings of the current product are excluded. They are already on the page
   * as the variant switcher, and listing "أسود" again under "منتجات مشابهة"
   * both wastes the rail and re-creates exactly the near-duplicate repetition
   * that grouping exists to remove.
   *
   * Over-fetch so the exclusion below cannot leave the rail short.
   */
  const fetchLimit = product.group_id ? limit * 2 : limit;

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("category_id", product.category_id)
    .eq("is_active", true)
    .neq("id", product.id)
    .order("is_best_seller", { ascending: false })
    .order("sales_count", { ascending: false })
    .limit(fetchLimit);

  if (error) {
    console.error(`Error fetching related products for ${product.id}:`, error);
    return [];
  }

  const notASibling = (candidate: Product) =>
    !product.group_id || candidate.group_id !== product.group_id;

  const related = ((data ?? []) as Product[]).filter(notASibling).slice(0, limit);
  if (related.length >= 4 || !product.brand_id) return related;

  // Top up from the same brand, skipping anything already included.
  const excluded = [product.id, ...related.map((p) => p.id)];
  const { data: brandData, error: brandError } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("brand_id", product.brand_id)
    .eq("is_active", true)
    .not("id", "in", `(${excluded.join(",")})`)
    .order("sales_count", { ascending: false })
    .limit((limit - related.length) * 2);

  if (brandError) {
    console.error(`Error topping up related products for ${product.id}:`, brandError);
    return related;
  }

  const topUp = ((brandData ?? []) as Product[])
    .filter(notASibling)
    .slice(0, limit - related.length);

  return [...related, ...topUp];
}

export async function getProductsBySubcategory(
  subcategorySlug: string,
): Promise<Product[]> {
  const supabase = await createStaticClient();

  // First get the category ID from the slug
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", subcategorySlug)
    .single();

  if (categoryError || !category) {
    console.error(
      `Error fetching category with slug ${subcategorySlug}:`,
      categoryError,
    );
    return [];
  }

  // Then fetch products for this category
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("category_id", category.id)
    .eq("is_active", true);

  if (error) {
    console.error(
      `Error fetching products for subcategory ${subcategorySlug}:`,
      error,
    );
    return [];
  }

  return data as Product[];
}

export type FilterOptions = {
  brands: { id: string; name_ar: string; slug: string; count: number }[];
  priceRange: { min: number; max: number };
  hasOffers: boolean;
};

export type ProductsWithFilters = {
  products: Product[];
  filterOptions: FilterOptions;
  subcategoryName: string;
};

export async function getProductsWithFilters(
  subcategorySlug: string,
): Promise<ProductsWithFilters> {
  const supabase = await createStaticClient();

  // First get the category info from the slug
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, name_ar")
    .eq("slug", subcategorySlug)
    .single();

  if (categoryError || !category) {
    console.error(
      `Error fetching category with slug ${subcategorySlug}:`,
      categoryError,
    );
    return {
      products: [],
      filterOptions: {
        brands: [],
        priceRange: { min: 0, max: 0 },
        hasOffers: false,
      },
      subcategoryName: "",
    };
  }

  // Fetch products for this category
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("category_id", category.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error(
      `Error fetching products for subcategory ${subcategorySlug}:`,
      error?.message || "No data returned",
    );
    return {
      products: [],
      filterOptions: {
        brands: [],
        priceRange: { min: 0, max: 0 },
        hasOffers: false,
      },
      subcategoryName: category.name_ar ?? "",
    };
  }

  const products = data as Product[];

  // Extract filter options from products
  const brandMap = new Map<
    string,
    { name_ar: string; slug: string; count: number }
  >();
  let minPrice = Infinity;
  let maxPrice = 0;
  let hasOffers = false;

  for (const product of products) {
    // Track brands
    if (product.brand && product.brand.id && product.brand.name_ar) {
      const existing = brandMap.get(product.brand.id);
      if (existing) {
        existing.count++;
      } else {
        brandMap.set(product.brand.id, {
          name_ar: product.brand.name_ar,
          slug: product.brand.slug || "",
          count: 1,
        });
      }
    }

    // Track price range
    if (product.price < minPrice) minPrice = product.price;
    if (product.price > maxPrice) maxPrice = product.price;

    // Track offers
    if (product.old_price && product.old_price > product.price) {
      hasOffers = true;
    }
  }

  // Convert brand map to sorted array
  const brands = Array.from(brandMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count); // Sort by count descending

  return {
    products,
    filterOptions: {
      brands,
      priceRange: {
        min: minPrice === Infinity ? 0 : minPrice,
        max: maxPrice,
      },
      hasOffers,
    },
    subcategoryName: category.name_ar,
  };
}

export async function getAllProductSlugs(): Promise<string[]> {
  const supabase = await createStaticClient();
  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching product slugs:", error);
    return [];
  }

  return data.map((product) => product.slug);
}
