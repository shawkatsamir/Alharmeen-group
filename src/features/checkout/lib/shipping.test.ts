import { describe, expect, it } from "vitest";
import {
  effectiveDistanceKm,
  fallbackGovernorateCost,
  haversineKm,
  qualifiesForFreeShipping,
  quoteDelivery,
  resolveDeliveryTier,
  resolveProductTierKey,
  roadDistanceKm,
  roundMoney,
  roundUpToStep,
  type DeliveryTier,
  type FreeShippingRule,
} from "./shipping";

/** Mirrors the seeded `delivery_tiers` rows. */
const SMALL: DeliveryTier = {
  key: "small",
  label_ar: "أجهزة صغيرة",
  base_fee: 40,
  per_km_rate: 4,
  min_fee: 40,
  max_fee: 500,
  display_order: 1,
};

const LARGE: DeliveryTier = {
  key: "large",
  label_ar: "أجهزة كبيرة",
  base_fee: 120,
  per_km_rate: 8,
  min_fee: 120,
  max_fee: 1500,
  display_order: 2,
};

const TIERS = [SMALL, LARGE];

// The shop, from `app_settings.delivery_origin_*`.
const ORIGIN = { lat: 30.8167, lng: 31.4333 }; // ديرب نجم

describe("haversineKm", () => {
  /*
   * Checked against the values Postgres computed for the seeded localities, so
   * a drift between this and `haversine_km()` fails here rather than silently
   * quoting one number in the browser and charging another on the server.
   */
  it.each([
    ["الزقازيق", 30.5877, 31.502, 26.3],
    ["فاقوس", 30.7286, 31.7975, 36.15],
    ["كفر صقر", 30.7969, 31.6236, 18.31],
    ["العاشر من رمضان", 30.3, 31.75, 64.97],
  ])("matches the database for %s", (_name, lat, lng, expected) => {
    expect(haversineKm(ORIGIN.lat, ORIGIN.lng, lat, lng)).toBeCloseTo(
      expected,
      1,
    );
  });

  it("is zero at the origin", () => {
    expect(haversineKm(ORIGIN.lat, ORIGIN.lng, ORIGIN.lat, ORIGIN.lng)).toBe(0);
  });

  it("is symmetric", () => {
    const there = haversineKm(30.8167, 31.4333, 31.2333, 29.95);
    const back = haversineKm(31.2333, 29.95, 30.8167, 31.4333);
    expect(there).toBe(back);
  });

  /*
   * sqrt() can land a hair above 1 through floating point, and Math.asin of
   * anything >1 is NaN — which would silently become a NaN price.
   */
  it("does not produce NaN for antipodal points", () => {
    const d = haversineKm(90, 0, -90, 0);
    expect(Number.isNaN(d)).toBe(false);
    expect(d).toBeGreaterThan(20000);
  });
});

describe("roadDistanceKm", () => {
  it("applies the road factor", () => {
    expect(roadDistanceKm(26.3, 1.3)).toBe(34.2);
  });

  it("never returns a negative distance", () => {
    expect(roadDistanceKm(-10, 1.3)).toBe(0);
  });
});

describe("effectiveDistanceKm", () => {
  it("uses the road-adjusted straight line by default", () => {
    expect(
      effectiveDistanceKm({ straightKm: 26.3, overrideKm: null, roadFactor: 1.3 }),
    ).toBe(34.2);
  });

  /*
   * The override is the admin overruling the map — a ferry crossing, a road
   * that does not exist. Applying the road factor on top would re-introduce
   * the guess they just corrected.
   */
  it("takes an override verbatim, without the road factor", () => {
    expect(
      effectiveDistanceKm({ straightKm: 26.3, overrideKm: 40, roadFactor: 1.3 }),
    ).toBe(40);
  });

  it("honours an override of zero", () => {
    expect(
      effectiveDistanceKm({ straightKm: 26.3, overrideKm: 0, roadFactor: 1.3 }),
    ).toBe(0);
  });

  it("returns null with no coordinates and no override, for the fallback path", () => {
    expect(
      effectiveDistanceKm({ straightKm: null, overrideKm: null, roadFactor: 1.3 }),
    ).toBeNull();
  });
});

describe("resolveDeliveryTier", () => {
  /*
   * The whole point: one trip carries the cart. Summing would bill the
   * customer twice for a van that goes out once.
   */
  it("returns the largest tier in a mixed cart, not the sum", () => {
    expect(resolveDeliveryTier(["small", "large", "small"], TIERS)).toBe(LARGE);
  });

  it("returns the small tier for an all-small cart", () => {
    expect(resolveDeliveryTier(["small", "small"], TIERS)).toBe(SMALL);
  });

  it("falls back to the smallest tier for an empty cart", () => {
    expect(resolveDeliveryTier([], TIERS)).toBe(SMALL);
  });

  it("ignores unknown tier keys rather than throwing", () => {
    expect(resolveDeliveryTier(["nonsense"], TIERS)).toBe(SMALL);
    expect(resolveDeliveryTier(["nonsense", "large"], TIERS)).toBe(LARGE);
  });

  it("returns null when no tiers are configured", () => {
    expect(resolveDeliveryTier(["small"], [])).toBeNull();
  });
});

describe("resolveProductTierKey", () => {
  it("prefers the product override", () => {
    expect(
      resolveProductTierKey({
        productTier: "large",
        categoryTier: "small",
        parentCategoryTier: "small",
        fallback: "small",
      }),
    ).toBe("large");
  });

  it("falls through to the category, then its parent", () => {
    expect(
      resolveProductTierKey({
        productTier: null,
        categoryTier: null,
        parentCategoryTier: "large",
        fallback: "small",
      }),
    ).toBe("large");
  });

  /*
   * An unclassified product should under-charge and get noticed, never
   * silently bill a customer for a truck they did not need.
   */
  it("falls back to the cheapest class when nothing is set", () => {
    expect(
      resolveProductTierKey({
        productTier: null,
        categoryTier: null,
        parentCategoryTier: null,
        fallback: "small",
      }),
    ).toBe("small");
  });
});

describe("qualifiesForFreeShipping", () => {
  const RULES: FreeShippingRule[] = [
    { max_distance_km: 20, min_order_total: 15000 },
    { max_distance_km: 60, min_order_total: 35000 },
    { max_distance_km: 120, min_order_total: 60000 },
  ];

  it("uses the narrowest band that covers the trip", () => {
    // 30 km falls in the 60 km band, so 35k is the bar — 20k is not enough.
    expect(qualifiesForFreeShipping(30, 20000, RULES)).toBe(false);
    expect(qualifiesForFreeShipping(30, 35000, RULES)).toBe(true);
  });

  it("applies the cheapest bar close to the shop", () => {
    expect(qualifiesForFreeShipping(15, 15000, RULES)).toBe(true);
  });

  it("is inclusive at both the distance and the value boundary", () => {
    expect(qualifiesForFreeShipping(20, 15000, RULES)).toBe(true);
  });

  /*
   * The failure a single global threshold would cause: a qualifying order
   * funding a trip far beyond what its margin covers.
   */
  it("never gives free delivery beyond the widest band", () => {
    expect(qualifiesForFreeShipping(200, 500000, RULES)).toBe(false);
  });

  it("is off entirely when no rules are configured", () => {
    expect(qualifiesForFreeShipping(5, 1000000, [])).toBe(false);
  });
});

describe("quoteDelivery", () => {
  const NO_RULES: FreeShippingRule[] = [];
  const MAX_KM = 150;

  it("charges the base fee at the shop's own doorstep", () => {
    const quote = quoteDelivery({
      distanceKm: 0,
      tier: LARGE,
      subtotal: 30000,
      rules: NO_RULES,
      maxDeliveryKm: MAX_KM,
    });
    // The trip still costs money to load and dispatch — this is exactly what
    // pure per-km pricing gets wrong.
    expect(quote.cost).toBe(120);
    expect(quote.isFree).toBe(false);
  });

  it("adds the per-km component", () => {
    // 120 + 34.2 * 8 = 393.6 -> rounded up to 395
    const quote = quoteDelivery({
      distanceKm: 34.2,
      tier: LARGE,
      subtotal: 30000,
      rules: NO_RULES,
      maxDeliveryKm: MAX_KM,
    });
    expect(quote.cost).toBe(395);
  });

  it("prices a small item on the same trip for less", () => {
    // 40 + 34.2 * 4 = 176.8 -> 180
    const quote = quoteDelivery({
      distanceKm: 34.2,
      tier: SMALL,
      subtotal: 6000,
      rules: NO_RULES,
      maxDeliveryKm: MAX_KM,
    });
    expect(quote.cost).toBe(180);
  });

  it("clamps to the tier ceiling", () => {
    const quote = quoteDelivery({
      distanceKm: 149,
      tier: SMALL,
      subtotal: 6000,
      rules: NO_RULES,
      maxDeliveryKm: MAX_KM,
    });
    // 40 + 149 * 4 = 636, above the 500 ceiling.
    expect(quote.cost).toBe(500);
  });

  it("clamps to the tier floor", () => {
    const cheap: DeliveryTier = { ...SMALL, base_fee: 0, min_fee: 40 };
    const quote = quoteDelivery({
      distanceKm: 1,
      tier: cheap,
      subtotal: 6000,
      rules: NO_RULES,
      maxDeliveryKm: MAX_KM,
    });
    expect(quote.cost).toBe(40);
  });

  it("stops quoting past the maximum radius", () => {
    const quote = quoteDelivery({
      distanceKm: 193.4, // الرمل, Alexandria
      tier: LARGE,
      subtotal: 33500,
      rules: NO_RULES,
      maxDeliveryKm: MAX_KM,
    });
    expect(quote.isOutOfRange).toBe(true);
    expect(quote.cost).toBe(0);
    expect(quote.isFree).toBe(false);
  });

  it("is inclusive at the radius boundary", () => {
    const quote = quoteDelivery({
      distanceKm: 150,
      tier: SMALL,
      subtotal: 6000,
      rules: NO_RULES,
      maxDeliveryKm: MAX_KM,
    });
    expect(quote.isOutOfRange).toBe(false);
  });

  /*
   * Out of range must win over free shipping: a trip the shop will not make
   * cannot be advertised as a free one.
   */
  it("reports out of range even when the order would qualify as free", () => {
    const quote = quoteDelivery({
      distanceKm: 500,
      tier: LARGE,
      subtotal: 1000000,
      rules: [{ max_distance_km: 1000, min_order_total: 1 }],
      maxDeliveryKm: MAX_KM,
    });
    expect(quote.isOutOfRange).toBe(true);
    expect(quote.isFree).toBe(false);
  });

  it("returns zero and flags free when a rule matches", () => {
    const quote = quoteDelivery({
      distanceKm: 15,
      tier: LARGE,
      subtotal: 40000,
      rules: [{ max_distance_km: 20, min_order_total: 15000 }],
      maxDeliveryKm: MAX_KM,
    });
    expect(quote.cost).toBe(0);
    expect(quote.isFree).toBe(true);
    expect(quote.isOutOfRange).toBe(false);
  });

  it("carries the tier and distance through for the order snapshot", () => {
    const quote = quoteDelivery({
      distanceKm: 34.24,
      tier: LARGE,
      subtotal: 30000,
      rules: NO_RULES,
      maxDeliveryKm: MAX_KM,
    });
    expect(quote.tierKey).toBe("large");
    expect(quote.distanceKm).toBe(34.2);
  });

  it("never returns a negative cost from bad distance data", () => {
    const quote = quoteDelivery({
      distanceKm: -50,
      tier: LARGE,
      subtotal: 30000,
      rules: NO_RULES,
      maxDeliveryKm: MAX_KM,
    });
    expect(quote.cost).toBeGreaterThanOrEqual(0);
    expect(quote.distanceKm).toBe(0);
  });
});

describe("fallbackGovernorateCost", () => {
  it("rounds the flat rate to the quoting step", () => {
    expect(fallbackGovernorateCost(50)).toBe(50);
    expect(fallbackGovernorateCost(52)).toBe(55);
  });

  it("never returns a negative rate", () => {
    expect(fallbackGovernorateCost(-10)).toBe(0);
  });
});

describe("rounding", () => {
  /*
   * Up, not to-nearest: rounding down hands back margin on every order for
   * the sake of a prettier number.
   */
  it("rounds a quote up to the next step", () => {
    expect(roundUpToStep(176.8, 5)).toBe(180);
    expect(roundUpToStep(180.01, 5)).toBe(185);
  });

  it("leaves an exact multiple alone", () => {
    expect(roundUpToStep(180, 5)).toBe(180);
  });

  it("collapses float drift before deciding", () => {
    // 0.1 + 0.2 === 0.30000000000000004, which must not push 180 to 185.
    expect(roundUpToStep(180 + (0.1 + 0.2 - 0.3), 5)).toBe(180);
  });

  it("rounds money to two decimals", () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });
});
