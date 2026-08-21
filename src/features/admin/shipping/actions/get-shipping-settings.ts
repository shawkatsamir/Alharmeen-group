"use server";

import { requireAdmin } from "@/features/admin/lib/require-admin";
import type { Database } from "@/shared/types/database.types";

type GovernorateRow = Database["public"]["Tables"]["governorates"]["Row"];

export interface GovernorateWithTraffic extends GovernorateRow {
  order_count: number;
  revenue: number;
}

export interface ShippingSettings {
  governorates: GovernorateWithTraffic[];
  freeShippingThreshold: number | null;
}

/**
 * Everything /admin/shipping renders: the rate table joined to real order
 * traffic, so the client can price each governorate against how much business
 * actually comes from it.
 */
export async function getShippingSettings(): Promise<ShippingSettings> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return { governorates: [], freeShippingThreshold: null };
  }

  const [governoratesResult, statsResult, thresholdResult] = await Promise.all([
    guard.supabase
      .from("governorates")
      .select("*")
      .order("display_order", { ascending: true }),
    guard.supabase.rpc("governorate_order_stats"),
    guard.supabase
      .from("app_settings")
      .select("value")
      .eq("key", "free_shipping_threshold")
      .maybeSingle(),
  ]);

  if (governoratesResult.error) {
    console.error("Error loading governorates:", governoratesResult.error);
    return { governorates: [], freeShippingThreshold: null };
  }

  if (statsResult.error) {
    console.error("Error loading governorate traffic:", statsResult.error);
  }

  const traffic = new Map(
    (statsResult.data ?? []).map((row) => [
      row.governorate,
      { order_count: Number(row.order_count), revenue: Number(row.revenue) },
    ]),
  );

  const rawThreshold = thresholdResult.data?.value;

  return {
    governorates: (governoratesResult.data ?? []).map((governorate) => ({
      ...governorate,
      order_count: traffic.get(governorate.name_ar)?.order_count ?? 0,
      revenue: traffic.get(governorate.name_ar)?.revenue ?? 0,
    })),
    freeShippingThreshold:
      typeof rawThreshold === "number" && rawThreshold > 0
        ? rawThreshold
        : null,
  };
}
