import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/shared/types/database.types";

export type OrderPayment =
  Database["public"]["Tables"]["order_payments"]["Row"];

/**
 * One order's payment ledger, oldest first.
 *
 * Cookie-bound client on purpose: RLS scopes the rows to the signed-in owner
 * (or an admin). Reading this with `createStaticClient()` would silently
 * return nothing, because without cookies the request is anonymous.
 */
export async function getOrderPayments(
  orderId: string,
): Promise<OrderPayment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("order_payments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching order payments:", error);
    return [];
  }

  return data ?? [];
}
