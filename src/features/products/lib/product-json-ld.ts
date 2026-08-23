/**
 * Structured data for a product page.
 *
 * ---------------------------------------------------------------------------
 * Why variant pages emit ProductGroup rather than canonicalising to one URL
 *
 * Separate URLs per colour are not a duplicate-content penalty — Google
 * supports variant URLs directly and publishes `ProductGroup` / `hasVariant`
 * for exactly this shape. What costs rankings is variants that are *unlinked
 * and unmarked*, which is what this shop had: three finishes of one fridge as
 * three unrelated pages with nothing connecting them.
 *
 * So nothing is deindexed. Each variant keeps its own self-canonical URL and
 * can still win its own long-tail query ("ثلاجة شارب سيلفر"), and the markup
 * below supplies the missing relationship:
 *
 *   - the group primary emits `ProductGroup` with every variant in `hasVariant`
 *   - every other variant emits `Product` with `inProductGroupWithID`
 *   - each variant carries its varying property (`color`, `size`, …)
 *
 * The primary's own `Product` lives inside `hasVariant` rather than alongside
 * the group, which is the documented arrangement and keeps its `offers` intact.
 * ---------------------------------------------------------------------------
 */

import type { Product, VariantSibling } from "../types";
import { readAxisValue } from "./variant-group";

/**
 * Axis key -> the schema.org Product property that expresses it.
 *
 * `variesBy` only means something to Google for properties it recognises, so an
 * axis with no sensible mapping is simply omitted from `variesBy` rather than
 * emitted as a made-up property name.
 */
const AXIS_SCHEMA_PROPERTY: Readonly<Record<string, string>> = {
  اللون: "color",
  السعة: "size",
  "موديل المنتج": "model",
} as const;

/** Properties Google understands in `variesBy`. `model` is not one of them. */
const VARIES_BY_SUPPORTED = new Set(["color", "size", "material", "pattern"]);

function productUrl(baseUrl: string, slug: string): string {
  return `${baseUrl}/product/${slug}`;
}

function availability(item: {
  is_available: boolean;
  stock_quantity: number;
}): string {
  return item.is_available && item.stock_quantity > 0
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
}

function offersFor(
  item: {
    price: number;
    slug: string;
    is_available: boolean;
    stock_quantity: number;
    sale_end_date?: string | null;
  },
  baseUrl: string,
) {
  return {
    "@type": "Offer",
    price: item.price,
    priceCurrency: "EGP",
    availability: availability(item),
    itemCondition: "https://schema.org/NewCondition",
    url: productUrl(baseUrl, item.slug),
    // Only when the shop actually committed to an end date. Inventing one to
    // satisfy a rich-results warning would be a claim about pricing we cannot
    // keep.
    ...(item.sale_end_date ? { priceValidUntil: item.sale_end_date } : {}),
  };
}

/** The axis values of a variant, as schema.org properties. */
function axisProperties(
  variantValues: unknown,
  axes: readonly string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const axis of axes) {
    const property = AXIS_SCHEMA_PROPERTY[axis];
    const value = readAxisValue(variantValues, axis);
    if (property && value) out[property] = value;
  }
  return out;
}

function specificationProperties(specifications: unknown) {
  if (
    typeof specifications !== "object" ||
    specifications === null ||
    Array.isArray(specifications)
  ) {
    return undefined;
  }
  const entries = Object.entries(specifications as Record<string, unknown>)
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    .map(([name, value]) => ({
      "@type": "PropertyValue",
      name,
      value: value as string,
    }));
  return entries.length > 0 ? entries : undefined;
}

export interface BuildProductJsonLdArgs {
  product: Product;
  /** Active variants of the group, this product included. Empty when ungrouped. */
  siblings: VariantSibling[];
  baseUrl: string;
  /**
   * Plain-text description, already resolved by the caller through the same
   * precedence `generateMetadata` uses (meta_description_ar -> content_blocks
   * -> description_ar). Passed in rather than derived so this module stays
   * testable and the two never drift again — the JSON-LD used to skip
   * `content_blocks`, so every block-authored product emitted an empty one.
   */
  description: string;
}

export function buildProductJsonLd({
  product,
  siblings,
  baseUrl,
  description,
}: BuildProductJsonLdArgs): Record<string, unknown> {
  const axes = product.group?.axes ?? [];
  const url = productUrl(baseUrl, product.slug);
  const brand = product.brand
    ? { "@type": "Brand", name: product.brand.name_ar }
    : undefined;

  const self = {
    "@type": "Product",
    name: product.name_ar.trim(),
    description,
    sku: product.sku,
    url,
    image: product.images?.map((img) => img.image_url) ?? [],
    brand,
    ...axisProperties(product.variant_values, axes),
    offers: offersFor(product, baseUrl),
    additionalProperty: specificationProperties(product.specifications),
  };

  const groupId = product.group?.id;
  const hasChoice = siblings.length > 1 && Boolean(groupId);

  if (!hasChoice) {
    return { "@context": "https://schema.org", ...self };
  }

  const variesBy = axes
    .map((axis) => AXIS_SCHEMA_PROPERTY[axis])
    .filter((property) => property && VARIES_BY_SUPPORTED.has(property));

  if (!product.is_group_primary) {
    return {
      "@context": "https://schema.org",
      ...self,
      inProductGroupWithID: groupId,
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    "@id": `${url}#group`,
    productGroupID: groupId,
    name: product.group?.name_ar?.trim() || product.name_ar.trim(),
    description,
    url,
    brand,
    ...(variesBy.length > 0 ? { variesBy } : {}),
    hasVariant: siblings.map((sibling) => ({
      "@type": "Product",
      name: sibling.name_ar.trim(),
      sku: sibling.sku,
      url: productUrl(baseUrl, sibling.slug),
      image:
        sibling.images?.find((img) => img.is_primary)?.image_url ??
        sibling.images?.[0]?.image_url,
      ...axisProperties(sibling.variant_values, axes),
      offers: offersFor(sibling, baseUrl),
    })),
  };
}
