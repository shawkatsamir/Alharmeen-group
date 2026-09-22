import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/shared/types/database.types";
import {
  resolveProductTierKey,
  roundMoney,
  type DeliveryTier,
  type FreeShippingRule,
} from "@/features/checkout/lib/shipping";

export type Governorate = Database["public"]["Tables"]["governorates"]["Row"];
export type Locality = Database["public"]["Tables"]["localities"]["Row"];

export interface ShippingOptions {
  governorates: Governorate[];
  localities: Locality[];
  tiers: DeliveryTier[];
  rules: FreeShippingRule[];
  roadFactor: number;
  maxDeliveryKm: number;
  fallbackTierKey: string;
  /** Digits only, empty when unconfigured. Used for the out-of-range prompt. */
  whatsappNumber: string;
  /** Wallet destinations shown when a prepaid method is chosen. Blank if unset. */
  paymentDestinations: {
    vodafone_cash: string;
    instapay: string;
    bank_transfer: string;
  };
}

export interface CartPricing {
  /** Resolved delivery tier per product, same chain the server walks. */
  tierKeys: string[];
  /** Current unit price per product id, from the database. */
  prices: Record<string, number>;
  /** Sum of current price × quantity — what `createOrder` will charge. */
  subtotal: number;
}

/**
 * What the server will charge for these (product id, quantity) pairs, minus
 * delivery: current prices and each product's delivery tier.
 *
 * Fetched rather than read off CartItem: carts are persisted in localStorage,
 * so `item.price` can be days old and an existing cart predates any new field.
 * `createOrder` re-reads the same rows, so previewing from them is the only
 * way the quoted and charged numbers agree.
 *
 * THROWS on error rather than returning an empty result. An empty tier list
 * resolves to the smallest tier, which quoted a fridge at the small-appliance
 * price while the server charged the large one. A visible "could not
 * calculate" is better than a confident wrong number.
 */
export async function getCartPricing(
  items: readonly { id: string; quantity: number }[],
  fallbackTierKey: string,
): Promise<CartPricing> {
  if (items.length === 0) return { tierKeys: [], prices: {}, subtotal: 0 };

  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    // `parent:parent_id(...)` is the correct self-referencing embed form.
    .select(
      "id, price, delivery_tier, category:categories(delivery_tier, parent:parent_id(delivery_tier))",
    )
    .in(
      "id",
      items.map((item) => item.id),
    );

  if (error) {
    console.error("Error fetching cart pricing:", error);
    throw error;
  }

  const one = <T,>(value: T | T[] | null): T | null =>
    Array.isArray(value) ? (value[0] ?? null) : value;

  const prices: Record<string, number> = {};
  const tierKeys = (data ?? []).map((product) => {
    prices[product.id] = product.price;
    const category = one(product.category);
    return resolveProductTierKey({
      productTier: product.delivery_tier,
      categoryTier: category?.delivery_tier ?? null,
      parentCategoryTier: one(category?.parent)?.delivery_tier ?? null,
      fallback: fallbackTierKey,
    });
  });

  const subtotal = roundMoney(
    items.reduce(
      (sum, item) =>
        sum + roundMoney((prices[item.id] ?? 0) * Math.floor(item.quantity)),
      0,
    ),
  );

  return { tierKeys, prices, subtotal };
}

const SETTING_KEYS = [
  "delivery_road_factor",
  "max_delivery_km",
  "payment_vodafone_cash_number",
  "payment_instapay_handle",
  "payment_bank_account",
  "contact_whatsapp_number",
] as const;

const DEFAULT_ROAD_FACTOR = 1.3;
const DEFAULT_MAX_DELIVERY_KM = 150;

/**
 * Browser mirror of `services/server/shipping.ts`, for the checkout form and
 * the product-page delivery estimate.
 *
 * Every read here is public (`anon` SELECT policies) so it works for guest
 * checkout. The numbers it produces are a *preview* — `createOrder` re-reads
 * the same rows and recomputes before writing the order, so a tampered client
 * cannot influence what is charged.
 */
export async function getShippingOptions(): Promise<ShippingOptions> {
  const supabase = createClient();

  const [
    governoratesResult,
    localitiesResult,
    tiersResult,
    rulesResult,
    settingsResult,
  ] = await Promise.all([
    supabase
      .from("governorates")
      .select("*")
      .eq("is_deliverable", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("localities")
      .select("*")
      .eq("is_deliverable", true)
      .order("name_ar", { ascending: true }),
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
      .in("key", [...SETTING_KEYS]),
  ]);

  for (const [label, result] of [
    ["governorates", governoratesResult],
    ["localities", localitiesResult],
    ["delivery tiers", tiersResult],
  ] as const) {
    if (result.error) console.error(`Error fetching ${label}:`, result.error);
  }

  const byKey = new Map(
    (settingsResult.data ?? []).map((row) => [row.key, row.value]),
  );
  const readText = (key: string) => {
    const value = byKey.get(key);
    return typeof value === "string" ? value.trim() : "";
  };
  const readNumber = (key: string, fallback: number) => {
    const value = byKey.get(key);
    return typeof value === "number" && Number.isFinite(value) && value > 0
      ? value
      : fallback;
  };

  const tiers = (tiersResult.data ?? []) as DeliveryTier[];

  return {
    governorates: governoratesResult.data ?? [],
    localities: localitiesResult.data ?? [],
    tiers,
    rules: (rulesResult.data ?? []) as FreeShippingRule[],
    roadFactor: readNumber("delivery_road_factor", DEFAULT_ROAD_FACTOR),
    maxDeliveryKm: readNumber("max_delivery_km", DEFAULT_MAX_DELIVERY_KM),
    fallbackTierKey: tiers[0]?.key ?? "small",
    whatsappNumber: readText("contact_whatsapp_number").replace(/\D/g, ""),
    paymentDestinations: {
      vodafone_cash: readText("payment_vodafone_cash_number"),
      instapay: readText("payment_instapay_handle"),
      bank_transfer: readText("payment_bank_account"),
    },
  };
}
