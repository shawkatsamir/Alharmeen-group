/**
 * Product slug derivation.
 *
 * `products.slug` is UNIQUE and drives `/product/[slug]`, `generateStaticParams`
 * and the sitemap, so it has to be stable, unique and URL-safe. Until now every
 * slug was typed by hand into the Supabase table editor.
 *
 * The existing corpus establishes the convention: slugs are **Latin**, built
 * from the English product name followed by the SKU, e.g.
 *
 *   name_en "Hoover Vacuum Cleaner 2200 Watt HEPA Filter Black" + sku "TTELA2200PRE"
 *     -> hoover-vacuum-cleaner-2200-watt-hepa-filter-black-ttela2200pre
 *
 * Nothing transliterates Arabic, and only 10 of 75 rows even have `name_en`, so
 * `name_ar` is deliberately not an input: transliterating it would produce slugs
 * that look nothing like the 75 already indexed by search engines. When
 * `name_en` is missing the SKU alone is the slug, which is still unique because
 * `products.sku` is itself UNIQUE.
 *
 * Import-free by design so it can be unit-tested with no mocks, in the same
 * spirit as `features/orders/constants/order-status.ts`.
 */

/**
 * Lowercase Latin-alphanumeric slug. Non-Latin scripts (Arabic) contain no
 * `[a-z0-9]` characters, so they collapse to an empty string rather than to
 * mojibake — callers must handle that.
 */
export function slugify(input: string | null | undefined): string {
  if (!input) return "";

  return input
    .normalize("NFKD")
    // Drop the combining marks NFKD just split off (é -> e).
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface ProductSlugSource {
  nameEn?: string | null;
  sku?: string | null;
}

/**
 * Build the suggested slug for a product. Returns `""` when neither input
 * yields Latin characters, which the form surfaces as "enter a slug manually"
 * rather than silently saving something unusable.
 */
export function slugifyProduct({ nameEn, sku }: ProductSlugSource): string {
  const namePart = slugify(nameEn);
  const skuPart = slugify(sku);

  if (!namePart) return skuPart;
  if (!skuPart) return namePart;

  // Store owners often type the SKU into the English name as well. Appending it
  // again would produce `...-ttela2200pre-ttela2200pre`.
  if (namePart === skuPart || namePart.endsWith(`-${skuPart}`)) return namePart;

  return `${namePart}-${skuPart}`;
}

/**
 * Deterministic next candidate when a slug is already taken. `-2`, `-3`, … is
 * appended rather than a random suffix so a retried save produces the same slug
 * instead of accumulating near-duplicates.
 */
export function withSlugSuffix(slug: string, attempt: number): string {
  if (attempt <= 1) return slug;
  return `${slug}-${attempt}`;
}

/** True when a string is safe to store in `products.slug`. */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
