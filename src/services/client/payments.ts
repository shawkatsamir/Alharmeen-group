import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/shared/types/database.types";

export type OrderPayment =
  Database["public"]["Tables"]["order_payments"]["Row"] & {
    recorder: { full_name: string } | null;
  };

/**
 * The payment ledger for one order, oldest first so it reads as a history.
 *
 * RLS decides the audience: admins see every order's payments, a signed-in
 * customer sees only their own. Guest orders have no user_id and so are not
 * reachable here — the success page renders their instructions from the order
 * row itself instead.
 */
export async function getOrderPayments(
  orderId: string,
): Promise<OrderPayment[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("order_payments")
    .select("*, recorder:profiles(full_name)")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching order payments:", error);
    return [];
  }

  return (data ?? []).map((row) => {
    // Many-to-one embeds come back as objects at runtime but are typed as
    // arrays by the generated types; handle both rather than casting.
    const { recorder, ...rest } = row as typeof row & {
      recorder: { full_name: string } | { full_name: string }[] | null;
    };
    return {
      ...rest,
      recorder: Array.isArray(recorder) ? (recorder[0] ?? null) : recorder,
    };
  });
}
