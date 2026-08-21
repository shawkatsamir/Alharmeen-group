import { createStaticClient } from "@/lib/supabase/server";
import type { Database } from "@/shared/types/database.types";

export type Governorate = Database["public"]["Tables"]["governorates"]["Row"];

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

/**
 * The free-shipping threshold in EGP, or null when the promotion is off.
 *
 * Stored in `app_settings` as raw JSON so the admin can clear it back to null
 * without a schema change. Anything that isn't a positive number is treated as
 * "disabled" rather than trusted — this value is admin-typed.
 */
export async function getFreeShippingThreshold(): Promise<number | null> {
  const supabase = await createStaticClient();

  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "free_shipping_threshold")
    .maybeSingle();

  if (error || !data) return null;

  const value = data.value;
  return typeof value === "number" && value > 0 ? value : null;
}
