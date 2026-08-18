import { createClient } from "@/lib/supabase/client";
import {
  ADMIN_TAB_STATUSES,
  type AdminOrderTab,
} from "@/features/orders/constants/order-status";
import { Order } from "../server/orders";

export interface GetOrdersOptions {
  page?: number;
  limit?: number;
  status?: AdminOrderTab;
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
    // Tab -> status groups come from the shared registry so no status can fall
    // through every tab (تم الشحن used to be invisible in the admin list).
    query = query.in("status", [...ADMIN_TAB_STATUSES[options.status]]);
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

  // Same groups as the list query above — counts and rows must agree.
  const countByTab = (tab: Exclude<AdminOrderTab, "all">) =>
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", [...ADMIN_TAB_STATUSES[tab]]);

  const [total, pending, completed, canceled, returned] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }),
    countByTab("pending"),
    countByTab("completed"),
    countByTab("canceled"),
    countByTab("returned"),
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
