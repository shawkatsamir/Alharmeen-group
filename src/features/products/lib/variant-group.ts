/**
 * Grouping logic for product variants — the colour/size siblings of one
 * physical product.
 *
 * Keep this file free of imports, for the same reason specifications.ts and
 * checkout/lib/shipping.ts are: it is the zero-mock unit-test target
 * (variant-group.test.ts), and it has to run unchanged on the server (listing
 * pages, JSON-LD) and in the browser (filtered grids).
 *
 * It therefore takes *structural* inputs rather than the `Product` type —
 * anything with the handful of variant columns will do, which is also what lets
 * the lean sibling query and the full product row share one implementation.
 *
 * ---------------------------------------------------------------------------
 * The one rule that is easy to get wrong: COLLAPSE AFTER FILTERING.
 *
 * If the shopper filters ٥٠٠٠–٨٠٠٠ ج.م and only the black variant qualifies,
 * the card shown must be the black one. Collapsing first and filtering second
 * would pick a representative the filter had already excluded, and the grid
 * would show a price outside the requested range.
 * ---------------------------------------------------------------------------
 */

/** The variant columns any grouping input must carry. */
export interface VariantMember {
  id: string;
  group_id?: string | null;
  is_group_primary?: boolean | null;
  variant_values?: unknown;
  price?: number | null;
}

export interface VariantGroupView<T extends VariantMember> {
  /** `null` for an ungrouped product, which is still returned as a group of one. */
  groupId: string | null;
  /** The variant that stands for the group in listings. */
  representative: T;
  /** Every member that reached this point, representative included. */
  members: T[];
}

/**
 * Reads one axis value out of a `variant_values` jsonb blob.
 *
 * `variant_values` arrives as `Json`, so it can legally be a string, a number
 * or an array. A CHECK constraint keeps stored values objects, but rows written
 * before the constraint — or by a future careless writer — must not throw here
 * and take a whole listing page down with them.
 */
export function readAxisValue(
  variantValues: unknown,
  axis: string,
): string | null {
  if (
    typeof variantValues !== "object" ||
    variantValues === null ||
    Array.isArray(variantValues)
  ) {
    return null;
  }
  const raw = (variantValues as Record<string, unknown>)[axis];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Every axis value on a member, in the group's declared axis order. */
export function readAxisValues(
  variantValues: unknown,
  axes: readonly string[],
): string[] {
  return axes
    .map((axis) => readAxisValue(variantValues, axis))
    .filter((value): value is string => value !== null);
}

/**
 * A short human label for a variant, e.g. "أسود" or "أسود · 450 لتر".
 * Used for `aria-label` on swatches and for the ProductGroup `variesBy` text.
 */
export function describeVariant(
  variantValues: unknown,
  axes: readonly string[],
): string {
  return readAxisValues(variantValues, axes).join(" · ");
}

/**
 * Deterministic member order: the group primary first, then cheapest, then by
 * id as a final tiebreak.
 *
 * Determinism is the point. These pages are ISR-rendered, and an unstable sort
 * would reshuffle the swatch row on every regeneration — the same reason
 * `getProducts` pins an explicit `created_at` order.
 */
export function sortVariantMembers<T extends VariantMember>(members: T[]): T[] {
  return [...members].sort((a, b) => {
    if (Boolean(a.is_group_primary) !== Boolean(b.is_group_primary)) {
      return a.is_group_primary ? -1 : 1;
    }
    const priceA = typeof a.price === "number" ? a.price : Number.POSITIVE_INFINITY;
    const priceB = typeof b.price === "number" ? b.price : Number.POSITIVE_INFINITY;
    if (priceA !== priceB) return priceA - priceB;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Picks the variant that represents a group in a listing.
 *
 * Preference order: the declared group primary, then the cheapest member, then
 * the first. Falling back to cheapest rather than to the first arrival is
 * deliberate — the grid advertises a price, and quoting anything above the real
 * entry price of the group reads as a price rise to a returning shopper.
 *
 * The primary is only honoured *if it is among the members passed in*, which is
 * what makes collapse-after-filter safe: a primary filtered out by price or by
 * `is_active` simply is not a candidate.
 */
export function pickRepresentative<T extends VariantMember>(members: T[]): T {
  return sortVariantMembers(members)[0];
}

/**
 * Collapses a product list so each variant group appears once.
 *
 * Groups surface at the position of their first member in the input, so a
 * caller's ordering (best sellers, newest, price) is preserved rather than
 * silently replaced by group order.
 *
 * Products with no `group_id` pass through untouched as groups of one, so
 * callers can render the result uniformly without branching.
 */
export function collapseVariants<T extends VariantMember>(
  products: readonly T[],
): VariantGroupView<T>[] {
  const groups = new Map<string, T[]>();
  const output: VariantGroupView<T>[] = [];
  // Placeholder slots keep each group at its first member's position.
  const slotIndex = new Map<string, number>();

  for (const product of products) {
    const groupId = product.group_id ?? null;

    if (groupId === null) {
      output.push({ groupId: null, representative: product, members: [product] });
      continue;
    }

    const existing = groups.get(groupId);
    if (existing) {
      existing.push(product);
      continue;
    }

    groups.set(groupId, [product]);
    slotIndex.set(groupId, output.length);
    // Filled in below; `product` is a safe placeholder because a group always
    // contains at least the member that created it.
    output.push({ groupId, representative: product, members: [product] });
  }

  for (const [groupId, members] of groups) {
    const index = slotIndex.get(groupId);
    if (index === undefined) continue;
    const ordered = sortVariantMembers(members);
    output[index] = {
      groupId,
      representative: ordered[0],
      members: ordered,
    };
  }

  return output;
}

/**
 * Convenience wrapper for callers that only want the collapsed product list —
 * category grids, sliders and search results that render one card per group.
 */
export function collapseToRepresentatives<T extends VariantMember>(
  products: readonly T[],
): T[] {
  return collapseVariants(products).map((group) => group.representative);
}

/**
 * True when a group actually offers a choice.
 *
 * A group of one renders no selector: a single swatch is noise, and — more
 * importantly — it would emit a `ProductGroup` with one `hasVariant`, which
 * tells Google a variant relationship exists where none does.
 */
export function hasVariantChoice<T extends VariantMember>(
  members: readonly T[],
): boolean {
  return members.length > 1;
}
