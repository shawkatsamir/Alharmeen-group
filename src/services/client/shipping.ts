import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/shared/types/database.types";

export type Governorate = Database["public"]["Tables"]["governorates"]["Row"];

export interface ShippingOptions {
  governorates: Governorate[];
  freeShippingThreshold: number | null;
  /** Wallet destinations shown when a prepaid method is chosen. Blank if unset. */
  paymentDestinations: {
    vodafone_cash: string;
    instapay: string;
    bank_transfer: string;
  };
}

const SETTING_KEYS = [
  "free_shipping_threshold",
  "payment_vodafone_cash_number",
  "payment_instapay_handle",
  "payment_bank_account",
] as const;

/**
 * Browser mirror of `services/server/shipping.ts`, for the checkout form.
 *
 * Both reads are public (`anon` SELECT policies) so this works for guest
 * checkout. The numbers it returns are a *preview* — `createOrder` re-reads
 * both from the database before writing the order.
 */
export async function getShippingOptions(): Promise<ShippingOptions> {
  const supabase = createClient();

  const [governoratesResult, settingsResult] = await Promise.all([
    supabase
      .from("governorates")
      .select("*")
      .eq("is_deliverable", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("app_settings")
      .select("key, value")
      .in("key", [...SETTING_KEYS]),
  ]);

  if (governoratesResult.error) {
    console.error("Error fetching governorates:", governoratesResult.error);
  }

  const byKey = new Map(
    (settingsResult.data ?? []).map((row) => [row.key, row.value]),
  );
  const readText = (key: string) => {
    const value = byKey.get(key);
    return typeof value === "string" ? value.trim() : "";
  };

  const rawThreshold = byKey.get("free_shipping_threshold");

  return {
    governorates: governoratesResult.data ?? [],
    freeShippingThreshold:
      typeof rawThreshold === "number" && rawThreshold > 0
        ? rawThreshold
        : null,
    paymentDestinations: {
      vodafone_cash: readText("payment_vodafone_cash_number"),
      instapay: readText("payment_instapay_handle"),
      bank_transfer: readText("payment_bank_account"),
    },
  };
}
