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

/* -------------------------------------------------------------------------- */
/* Per-axis selectors                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Ordering and identity rules, injected rather than imported.
 *
 * This module stays import-free (it is the zero-mock unit-test target), so the
 * axis registry cannot be reached from here. A `rank` hook rather than a
 * comparator on purpose: the registry only has to answer "what is the magnitude
 * of this value", and the whole total-order construction — which is the part
 * that is easy to get subtly wrong — stays inside this tested module.
 */
export interface AxisSelectorHooks {
  /** Comparison key. Two values with the same key are one option. */
  normalize?: (axis: string, value: string) => string;
  /** Numeric magnitude, or null when the axis has no natural numeric order. */
  rank?: (axis: string, value: string) => number | null;
}

export interface AxisOption<T extends VariantMember> {
  /** Display spelling — the first member in canonical order wins. */
  value: string;
  /** Normalised identity of this option within its row. */
  key: string;
  /** The member this option links to. NEVER null. */
  target: T;
  /** The active member itself carries this value. */
  isActive: boolean;
  /**
   * `target` differs from the active member on this axis ONLY. False means the
   * combination asked for does not exist and the link is a nearest neighbour.
   */
  isExact: boolean;
}

export interface AxisSelector<T extends VariantMember> {
  axis: string;
  /** The active member's value for this axis, or null when it carries none. */
  activeValue: string | null;
  options: AxisOption<T>[];
}

/**
 * One selector row per axis, for a group that varies by more than one thing.
 *
 * ---------------------------------------------------------------------------
 * Two invariants, both load-bearing.
 *
 * 1. `target` is NEVER null. The fallback chain below ends in
 *    `sortVariantMembers` order, which is total, so an option can never be a
 *    dead button. Crawlable links are the entire SEO mechanism of this feature;
 *    a combination that does not exist still links to its nearest neighbour and
 *    is merely *styled* as unavailable.
 *
 * 2. Options default to MEMBER order, not value order. A one-axis group must
 *    come out byte-identical to `sortVariantMembers`, or the colour row that
 *    already shipped silently reshuffles on the next ISR regeneration — these
 *    are statically generated pages, so a reordering is a real content change.
 *    Ranked values sort ascending *ahead of* unranked ones, so an admin typing
 *    "كبير" into a size row appends one option instead of unsorting the row.
 * ---------------------------------------------------------------------------
 *
 * Returns `[]` when there is nothing to choose between. Callers must fall back
 * to a whole-variant row in that case rather than dropping the internal links.
 */
export function buildAxisSelectors<T extends VariantMember>(
  members: readonly T[],
  axes: readonly string[],
  activeId: string,
  hooks: AxisSelectorHooks = {},
): AxisSelector<T>[] {
  const normalize = hooks.normalize ?? ((_axis: string, value: string) => value.trim());
  const rank = hooks.rank ?? (() => null);

  if (members.length < 2 || axes.length === 0) return [];

  const ordered = sortVariantMembers([...members]);
  const orderIndex = new Map<T, number>();
  ordered.forEach((member, index) => orderIndex.set(member, index));

  /** Normalised value per axis, per member. `null` = the member has no value. */
  const keyOf = (member: T, axis: string): string | null => {
    const raw = readAxisValue(member.variant_values, axis);
    if (raw === null) return null;
    const key = normalize(axis, raw);
    return key.length > 0 ? key : null;
  };

  const active = ordered.find((member) => member.id === activeId) ?? null;

  const selectors: AxisSelector<T>[] = [];

  for (const axis of axes) {
    // Seed one option per distinct value, first member in canonical order
    // deciding the display spelling.
    const seen = new Map<string, { value: string; candidates: T[] }>();

    for (const member of ordered) {
      const key = keyOf(member, axis);
      if (key === null) continue;
      const existing = seen.get(key);
      if (existing) existing.candidates.push(member);
      else {
        seen.set(key, {
          value: readAxisValue(member.variant_values, axis) as string,
          candidates: [member],
        });
      }
    }

    // A row offering one value is noise, and mirrors `hasVariantChoice`.
    if (seen.size < 2) continue;

    const options: AxisOption<T>[] = [];

    for (const [key, { value, candidates }] of seen) {
      const target = pickTarget(candidates, active, axis, axes, keyOf, orderIndex);
      options.push({
        value,
        key,
        target,
        isActive: active !== null && keyOf(active, axis) === key,
        isExact:
          active !== null &&
          agreesOnOtherAxes(target, active, axis, axes, keyOf),
      });
    }

    options.sort((a, b) => compareOptions(a, b, axis, rank, orderIndex));

    selectors.push({
      axis,
      activeValue: active ? readAxisValue(active.variant_values, axis) : null,
      options,
    });
  }

  return selectors;
}

/** True when two members carry the same value on every axis except `axis`. */
function agreesOnOtherAxes<T extends VariantMember>(
  a: T,
  b: T,
  axis: string,
  axes: readonly string[],
  keyOf: (member: T, axis: string) => string | null,
): boolean {
  return axes.every((other) => other === axis || keyOf(a, other) === keyOf(b, other));
}

/**
 * Which member an option links to.
 *
 * Ranked: the active member itself (so the active option self-links), then an
 * exact "swap only this axis" match, then the candidate agreeing on the most
 * other axes, then agreement weighted by axis order — `axes` is the group's
 * declared significance order, so keeping your colour beats keeping your size —
 * and finally `sortVariantMembers` order, which is total.
 */
function pickTarget<T extends VariantMember>(
  candidates: readonly T[],
  active: T | null,
  axis: string,
  axes: readonly string[],
  keyOf: (member: T, axis: string) => string | null,
  orderIndex: Map<T, number>,
): T {
  if (active && candidates.includes(active)) return active;
  if (!active) return [...candidates].sort(byOrder(orderIndex))[0];

  const others = axes.filter((other) => other !== axis);

  const scored = candidates.map((candidate) => {
    let agreeing = 0;
    let weight = 0;
    others.forEach((other, i) => {
      if (keyOf(candidate, other) === keyOf(active, other)) {
        agreeing += 1;
        // Earlier axes are more significant, so they carry more weight.
        weight += others.length - i;
      }
    });
    return { candidate, agreeing, weight };
  });

  scored.sort((a, b) => {
    if (a.agreeing !== b.agreeing) return b.agreeing - a.agreeing;
    if (a.weight !== b.weight) return b.weight - a.weight;
    return byOrder(orderIndex)(a.candidate, b.candidate);
  });

  return scored[0].candidate;
}

function byOrder<T extends VariantMember>(orderIndex: Map<T, number>) {
  return (a: T, b: T) =>
    (orderIndex.get(a) ?? Number.MAX_SAFE_INTEGER) -
    (orderIndex.get(b) ?? Number.MAX_SAFE_INTEGER);
}

/**
 * Option order within one row.
 *
 * Deliberately NOT `localeCompare`: ICU collation for Arabic differs between the
 * Node build server and the browser and can shift with an ICU version bump,
 * which is exactly the ISR reshuffle these pages must not suffer. Code-unit
 * comparison is byte-identical everywhere.
 */
function compareOptions<T extends VariantMember>(
  a: AxisOption<T>,
  b: AxisOption<T>,
  axis: string,
  rank: (axis: string, value: string) => number | null,
  orderIndex: Map<T, number>,
): number {
  const rankA = finiteOrNull(rank(axis, a.value));
  const rankB = finiteOrNull(rank(axis, b.value));

  // Ranked values first, so one unrankable entry appends rather than unsorting.
  if ((rankA === null) !== (rankB === null)) return rankA === null ? 1 : -1;
  if (rankA !== null && rankB !== null && rankA !== rankB) return rankA - rankB;

  const orderDelta = byOrder(orderIndex)(a.target, b.target);
  if (orderDelta !== 0) return orderDelta;

  // Total, and stable across engines.
  if (a.value === b.value) return 0;
  return a.value < b.value ? -1 : 1;
}

/** A rank hook returning NaN or ±Infinity must not poison the comparator. */
function finiteOrNull(value: number | null): number | null {
  return value !== null && Number.isFinite(value) ? value : null;
}
