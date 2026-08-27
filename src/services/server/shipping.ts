import { createStaticClient } from "@/lib/supabase/server";
import type { Database } from "@/shared/types/database.types";
import type {
  DeliveryTier,
  FreeShippingRule,
} from "@/features/checkout/lib/shipping";

export type Governorate = Database["public"]["Tables"]["governorates"]["Row"];
export type Locality = Database["public"]["Tables"]["localities"]["Row"];

export interface DeliveryConfig {
  tiers: DeliveryTier[];
  rules: FreeShippingRule[];
  /** Straight-line to road distance multiplier. */
  roadFactor: number;
  /** Past this the shop stops quoting and asks the customer to make contact. */
  maxDeliveryKm: number;
  /** Cheapest tier key, used when a product is unclassified. */
  fallbackTierKey: string;
}

const DEFAULT_ROAD_FACTOR = 1.3;
const DEFAULT_MAX_DELIVERY_KM = 150;

/**
 * Delivery destinations for the checkout picker.
 *
 * Uses the cookie-free static client: this is public reference data with an
 * `anon`-readable policy, and reading it must not opt a page out of static
 * generation. Returns [] on error, matching the convention in
 * `services/server/products.ts`.
 */
export async function getGovernorates(): Promise<Governorate[]> {
  const supabase = await createStaticClient();

  const { data, error } = await supabase
    .from("governorates")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching governorates:", error);
    return [];
  }

  return data ?? [];
}

export async function getDeliverableGovernorates(): Promise<Governorate[]> {
  const all = await getGovernorates();
  return all.filter((g) => g.is_deliverable);
}

export async function getLocalities(): Promise<Locality[]> {
  const supabase = await createStaticClient();

  const { data, error } = await supabase
    .from("localities")
    .select("*")
    .eq("is_deliverable", true)
    .order("name_ar", { ascending: true });

  if (error) {
    console.error("Error fetching localities:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Everything the quote engine needs besides the destination itself.
 *
 * Each setting falls back to the same default the migration seeded, so a
 * deleted or malformed row degrades to sane pricing rather than a zero-cost
 * or NaN quote.
 */
export async function getDeliveryConfig(): Promise<DeliveryConfig> {
  const supabase = await createStaticClient();

  const [tiersResult, rulesResult, settingsResult] = await Promise.all([
    supabase
      .from("delivery_tiers")
      .select("*")
      .order("display_order", { ascending: true }),
    supabase
      .from("free_shipping_rules")
      .select("max_distance_km, min_order_total")
      .order("max_distance_km", { ascending: true }),
    supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["delivery_road_factor", "max_delivery_km"]),
  ]);

  if (tiersResult.error) {
    console.error("Error fetching delivery tiers:", tiersResult.error);
  }

  const settings = new Map(
    (settingsResult.data ?? []).map((row) => [row.key, row.value]),
  );
  const readNumber = (key: string, fallback: number) => {
    const value = settings.get(key);
    return typeof value === "number" && Number.isFinite(value) && value > 0
      ? value
      : fallback;
  };

  const tiers = (tiersResult.data ?? []) as DeliveryTier[];

  return {
    tiers,
    rules: (rulesResult.data ?? []) as FreeShippingRule[],
    roadFactor: readNumber("delivery_road_factor", DEFAULT_ROAD_FACTOR),
    maxDeliveryKm: readNumber("max_delivery_km", DEFAULT_MAX_DELIVERY_KM),
    fallbackTierKey: tiers[0]?.key ?? "small",
  };
}
