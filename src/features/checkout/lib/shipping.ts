/**
 * Delivery pricing arithmetic.
 *
 * Kept import-free so it can be unit-tested with zero mocks, and so the same
 * functions run on the server (authoritative, in checkout-actions.ts) and in
 * the browser (preview, in OrderSummary and the product page estimate). If the
 * two ever disagree the customer is quoted one number and charged another, so
 * there is exactly one implementation.
 *
 * This module MIRRORS the database:
 *   - `delivery_tiers`      -> DeliveryTier
 *   - `free_shipping_rules` -> FreeShippingRule
 *   - `haversine_km()`      -> haversineKm()
 * See supabase/migrations/*_delivery_localities.sql and *_delivery_pricing.sql.
 *
 * Why `base_fee + km * rate` rather than pure per-km: a courier trip carries a
 * large fixed cost — loading an 85 kg refrigerator, two handlers, dispatching a
 * vehicle — that does not scale with distance. At 8 EGP/km a 2 km delivery
 * would price at 16 EGP, which does not cover carrying it down the stairs.
 */

export interface DeliveryTier {
  key: string;
  label_ar: string;
  base_fee: number;
  per_km_rate: number;
  min_fee: number;
  max_fee: number;
  /** Ascending size. The largest tier in a cart wins. */
  display_order: number;
}

export interface FreeShippingRule {
  max_distance_km: number;
  min_order_total: number;
}

export interface DeliveryQuote {
  /** What the customer pays for delivery, in EGP. Zero when free or unknown. */
  cost: number;
  isFree: boolean;
  /**
   * True when the destination is past `max_delivery_km`. The shop stops
   * quoting rather than accepting a trip it loses money on; the UI shows a
   * contact prompt instead of a price.
   */
  isOutOfRange: boolean;
  distanceKm: number;
  tierKey: string;
}

/** Prices are quoted in whole 5s — a raw 147.3 EGP reads as arbitrary. */
export const QUOTE_ROUNDING_STEP = 5;

/**
 * Great-circle distance in km. Mirrors `haversine_km()` in Postgres, which
 * computes the stored `localities.straight_km`; this copy exists so the UI can
 * work from raw coordinates (a future map pin) without a round trip.
 *
 * `Math.min(1, ...)` guards the asin domain: floating point can push the
 * argument fractionally above 1 and yield NaN.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return round(6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a))), 2);
}

/**
 * Straight-line km to driving km. Nile Delta roads run about 1.25–1.35x the
 * great-circle distance; the factor is a setting so the shop can calibrate it
 * against real trips.
 */
export function roadDistanceKm(straightKm: number, roadFactor: number): number {
  return round(Math.max(0, straightKm) * roadFactor, 1);
}

/**
 * The distance a quote should use.
 *
 * An explicit override wins outright and skips the road factor — it is the
 * admin saying "whatever the map thinks, this one is 40 km". Returns null when
 * the locality has no coordinates and no override, which sends the caller to
 * the governorate flat-rate fallback.
 */
export function effectiveDistanceKm(params: {
  straightKm: number | null;
  overrideKm: number | null;
  roadFactor: number;
}): number | null {
  const { straightKm, overrideKm, roadFactor } = params;

  if (overrideKm !== null && overrideKm >= 0) return round(overrideKm, 1);
  if (straightKm === null) return null;

  return roadDistanceKm(straightKm, roadFactor);
}

/**
 * Which vehicle class an order is priced at.
 *
 * The largest tier present, never the sum: the items share one trip. Summing
 * would charge a customer twice for a van that goes out once — the one piece
 * of Amazon's shared-cost economics available without Amazon's volume.
 */
export function resolveDeliveryTier(
  tierKeys: readonly string[],
  tiers: readonly DeliveryTier[],
): DeliveryTier | null {
  if (tiers.length === 0) return null;

  const byOrder = [...tiers].sort((a, b) => a.display_order - b.display_order);
  const smallest = byOrder[0];

  let winner = smallest;
  for (const key of tierKeys) {
    const tier = tiers.find((t) => t.key === key);
    if (tier && tier.display_order > winner.display_order) {
      winner = tier;
    }
  }

  return winner;
}

/**
 * Resolves one product's tier through the category tree.
 *
 * Order is product -> category -> parent category -> the smallest tier. The
 * fallback is deliberately the *cheapest* class: an unclassified product should
 * under-charge and be noticed, not silently bill a customer for a truck.
 */
export function resolveProductTierKey(params: {
  productTier: string | null;
  categoryTier: string | null;
  parentCategoryTier: string | null;
  fallback: string;
}): string {
  return (
    params.productTier ??
    params.categoryTier ??
    params.parentCategoryTier ??
    params.fallback
  );
}

/**
 * Whether an order earns free delivery.
 *
 * Rules are distance bands: the narrowest band covering this trip decides.
 * A single global threshold cannot work once distance is priced — it would
 * fund a 700 km trip out of a barely-qualifying order.
 */
export function qualifiesForFreeShipping(
  distanceKm: number,
  subtotal: number,
  rules: readonly FreeShippingRule[],
): boolean {
  const band = [...rules]
    .sort((a, b) => a.max_distance_km - b.max_distance_km)
    .find((rule) => distanceKm <= rule.max_distance_km);

  if (!band) return false;
  return subtotal >= band.min_order_total;
}

export function quoteDelivery(params: {
  distanceKm: number;
  tier: DeliveryTier;
  subtotal: number;
  rules: readonly FreeShippingRule[];
  maxDeliveryKm: number;
}): DeliveryQuote {
  const { distanceKm, tier, subtotal, rules, maxDeliveryKm } = params;

  const base = {
    distanceKm: round(Math.max(0, distanceKm), 1),
    tierKey: tier.key,
  };

  if (base.distanceKm > maxDeliveryKm) {
    return { ...base, cost: 0, isFree: false, isOutOfRange: true };
  }

  if (qualifiesForFreeShipping(base.distanceKm, subtotal, rules)) {
    return { ...base, cost: 0, isFree: true, isOutOfRange: false };
  }

  const raw = tier.base_fee + base.distanceKm * tier.per_km_rate;
  const clamped = Math.min(tier.max_fee, Math.max(tier.min_fee, raw));

  return {
    ...base,
    // Round up, not to nearest: rounding down would hand back margin on every
    // single order for the sake of a prettier number.
    cost: roundUpToStep(clamped, QUOTE_ROUNDING_STEP),
    isFree: false,
    isOutOfRange: false,
  };
}

/**
 * The degraded path: a locality with no coordinates and no override falls back
 * to its governorate's flat rate. No free-shipping rules apply, because without
 * a distance there is no band to match.
 */
export function fallbackGovernorateCost(rate: number): number {
  return Math.max(0, roundUpToStep(rate, QUOTE_ROUNDING_STEP));
}

export function roundUpToStep(value: number, step: number): number {
  if (step <= 0) return roundMoney(value);
  return Math.ceil(round(value, 2) / step) * step;
}

/**
 * Money is `numeric` in Postgres but `number` in TS, so round at the boundary
 * rather than letting float drift reach the database or the invoice.
 */
export function roundMoney(amount: number): number {
  return round(amount, 2);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
