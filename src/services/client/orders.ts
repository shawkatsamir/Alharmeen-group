import { createClient } from "@/lib/supabase/client";
import { Order } from "../server/orders";

export async function getOrders() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      *,
      items:order_items(*)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as Order[];
}

export const getOrderItems = async (orderId: string) => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  if (error) throw error;
  return data;
};
