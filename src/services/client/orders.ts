import { createClient } from "@/lib/supabase/client";
import { Order } from "../server/orders";

export interface GetOrdersOptions {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export async function getOrders(options?: GetOrdersOptions) {
  const supabase = createClient();
  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("orders")
    .select(
      `
      *,
      items:order_items(*)
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (options?.status && options.status !== "all") {
    if (options.status === "pending") {
      query = query.in("status", ["قيد الانتظار", "جاري التجهيز"]);
    } else if (options.status === "completed") {
      query = query.eq("status", "تم التوصيل");
    } else if (options.status === "canceled") {
      query = query.eq("status", "ملغي");
    } else if (options.status === "returned") {
      query = query.eq("status", "مرتجع");
    }
  }

  if (options?.search) {
    query = query.ilike("order_number", `%${options.search}%`);
  }

  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return { orders: data as Order[], count: count || 0 };
}

export async function getOrderStats() {
  const supabase = createClient();

  const [total, pending, completed, canceled, returned] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["قيد الانتظار", "جاري التجهيز"]),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "تم التوصيل"),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "ملغي"),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "مرتجع"),
  ]);

  return {
    all: total.count || 0,
    pending: pending.count || 0,
    completed: completed.count || 0,
    canceled: canceled.count || 0,
    returned: returned.count || 0,
  };
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
