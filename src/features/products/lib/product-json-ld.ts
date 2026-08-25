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
import { variantAxisSchemaProperty } from "../constants/variant-axes";
import { readAxisValue } from "./variant-group";

/**
 * Properties Google understands in `variesBy`. `model` is not one of them.
 *
 * This stays here rather than in the axis registry because it is a fact about
 * Google, not about the catalogue. Which property an axis maps to IS a catalogue
 * fact and lives in `variantAxisSchemaProperty`, so registering a new axis is
 * one edit instead of two.
 */
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
    const property = variantAxisSchemaProperty(axis);
    const value = readAxisValue(variantValues, axis);
    if (property && value) out[property] = value;
  }
  return out;
}

/**
 * Axis values as `PropertyValue` entries, for axes with no schema.org property.
 *
 * Without this a group varying by something Google has no vocabulary for — a
 * grill, a door count — emits `hasVariant` entries that differ only by name,
 * SKU and URL. That is the "unlinked and unmarked" state this whole feature
 * exists to eliminate, so the axis is stated as a generic property rather than
 * dropped silently.
 */
function unmappedAxisProperties(variantValues: unknown, axes: readonly string[]) {
  const entries = axes
    .filter((axis) => !variantAxisSchemaProperty(axis))
    .map((axis) => ({ axis, value: readAxisValue(variantValues, axis) }))
    .filter((entry): entry is { axis: string; value: string } => entry.value !== null)
    .map((entry) => ({
      "@type": "PropertyValue",
      name: entry.axis,
      value: entry.value,
    }));
  return entries.length > 0 ? entries : undefined;
}

/**
 * Concatenate property lists, first occurrence of a name winning.
 *
 * The axis key IS a spec key by design, so a product whose grill axis is also a
 * spec row would otherwise state it twice.
 */
function mergeProperties(
  ...lists: ({ "@type": string; name: string; value: string }[] | undefined)[]
) {
  const seen = new Set<string>();
  const merged = lists
    .flatMap((list) => list ?? [])
    .filter((entry) => !seen.has(entry.name) && seen.add(entry.name));
  return merged.length > 0 ? merged : undefined;
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
    additionalProperty: mergeProperties(
      specificationProperties(product.specifications),
      unmappedAxisProperties(product.variant_values, axes),
    ),
  };

  const groupId = product.group?.id;
  const hasChoice = siblings.length > 1 && Boolean(groupId);

  if (!hasChoice) {
    return { "@context": "https://schema.org", ...self };
  }

  const variesBy = axes
    .map((axis) => variantAxisSchemaProperty(axis))
    .filter(
      (property): property is "color" | "size" =>
        property !== undefined && VARIES_BY_SUPPORTED.has(property),
    );

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
      // Siblings carry no `specifications` in the lean query, so this is the
      // only thing distinguishing variants on an axis Google has no word for.
      additionalProperty: unmappedAxisProperties(sibling.variant_values, axes),
      offers: offersFor(sibling, baseUrl),
    })),
  };
}
