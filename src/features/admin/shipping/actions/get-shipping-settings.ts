"use server";

import { requireAdmin } from "@/features/admin/lib/require-admin";
import type { Database } from "@/shared/types/database.types";
import type {
  DeliveryTier,
  FreeShippingRule,
} from "@/features/checkout/lib/shipping";

type GovernorateRow = Database["public"]["Tables"]["governorates"]["Row"];
type LocalityRow = Database["public"]["Tables"]["localities"]["Row"];

export interface GovernorateWithTraffic extends GovernorateRow {
  order_count: number;
  revenue: number;
}

export interface LocalityWithTraffic extends LocalityRow {
  governorate_name: string;
  /** coalesce(override, straight_km * road_factor) — what a quote would use. */
  effective_km: number | null;
  order_count: number;
}

export interface FreeShippingRuleRow extends FreeShippingRule {
  id: number;
}

export interface DeliverySettings {
  originName: string;
  originLat: number | null;
  originLng: number | null;
  roadFactor: number;
  maxDeliveryKm: number;
}

export interface ShippingSettings {
  governorates: GovernorateWithTraffic[];
  localities: LocalityWithTraffic[];
  tiers: DeliveryTier[];
  rules: FreeShippingRuleRow[];
  settings: DeliverySettings;
}

const EMPTY: ShippingSettings = {
  governorates: [],
  localities: [],
  tiers: [],
  rules: [],
  settings: {
    originName: "",
    originLat: null,
    originLng: null,
    roadFactor: 1.3,
    maxDeliveryKm: 150,
  },
};

/**
 * Everything /admin/shipping renders.
 *
 * The locality list is the coordinate audit: seeded coordinates are
 * approximate, and a wrong one mis-prices silently with no error. Sorting by
 * distance makes an implausible value obvious at a glance.
 */
export async function getShippingSettings(): Promise<ShippingSettings> {
  const guard = await requireAdmin();
  if (!guard.ok) return EMPTY;

  const [
    governoratesResult,
    localitiesResult,
    statsResult,
    tiersResult,
    rulesResult,
    settingsResult,
    orderLocalitiesResult,
  ] = await Promise.all([
    guard.supabase
      .from("governorates")
      .select("*")
      .order("display_order", { ascending: true }),
    guard.supabase
      .from("localities")
      .select("*, governorate:governorates(name_ar)")
      .order("straight_km", { ascending: false, nullsFirst: true }),
    guard.supabase.rpc("governorate_order_stats"),
    guard.supabase
      .from("delivery_tiers")
      .select("*")
      .order("display_order", { ascending: true }),
    guard.supabase
      .from("free_shipping_rules")
      .select("id, max_distance_km, min_order_total")
      .order("max_distance_km", { ascending: true }),
    guard.supabase
      .from("app_settings")
      .select("key, value")
      .in("key", [
        "delivery_origin_name",
        "delivery_origin_lat",
        "delivery_origin_lng",
        "delivery_road_factor",
        "max_delivery_km",
      ]),
    // Only the id column, so this stays cheap as the order table grows.
    guard.supabase.from("orders").select("shipping_locality_id"),
  ]);

  if (governoratesResult.error) {
    console.error("Error loading governorates:", governoratesResult.error);
    return EMPTY;
  }
  if (statsResult.error) {
    console.error("Error loading governorate traffic:", statsResult.error);
  }

  const byKey = new Map(
    (settingsResult.data ?? []).map((row) => [row.key, row.value]),
  );
  const readNumber = (key: string, fallback: number | null) => {
    const value = byKey.get(key);
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : fallback;
  };
  const originName = byKey.get("delivery_origin_name");
  const roadFactor = readNumber("delivery_road_factor", 1.3) ?? 1.3;

  const governorateTraffic = new Map(
    (statsResult.data ?? []).map((row) => [
      row.governorate,
      { order_count: Number(row.order_count), revenue: Number(row.revenue) },
    ]),
  );

  const localityTraffic = new Map<number, number>();
  for (const row of orderLocalitiesResult.data ?? []) {
    if (row.shipping_locality_id === null) continue;
    localityTraffic.set(
      row.shipping_locality_id,
      (localityTraffic.get(row.shipping_locality_id) ?? 0) + 1,
    );
  }

  const localities = (localitiesResult.data ?? []).map((row) => {
    const { governorate, ...locality } = row as typeof row & {
      governorate: { name_ar: string } | { name_ar: string }[] | null;
    };
    const gov = Array.isArray(governorate) ? governorate[0] : governorate;

    const effective =
      locality.distance_km_override ??
      (locality.straight_km !== null
        ? Math.round(locality.straight_km * roadFactor * 10) / 10
        : null);

    return {
      ...locality,
      governorate_name: gov?.name_ar ?? "",
      effective_km: effective,
      order_count: localityTraffic.get(locality.id) ?? 0,
    };
  });

  return {
    governorates: (governoratesResult.data ?? []).map((governorate) => ({
      ...governorate,
      order_count: governorateTraffic.get(governorate.name_ar)?.order_count ?? 0,
      revenue: governorateTraffic.get(governorate.name_ar)?.revenue ?? 0,
    })),
    localities,
    tiers: (tiersResult.data ?? []) as DeliveryTier[],
    rules: (rulesResult.data ?? []) as FreeShippingRuleRow[],
    settings: {
      originName: typeof originName === "string" ? originName : "",
      originLat: readNumber("delivery_origin_lat", null),
      originLng: readNumber("delivery_origin_lng", null),
      roadFactor,
      maxDeliveryKm: readNumber("max_delivery_km", 150) ?? 150,
    },
  };
}
