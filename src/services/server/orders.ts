import { createClient } from "@/lib/supabase/server";

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  brand_name?: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  previous_status: string;
  new_status: string;
  created_at: string;
  notes?: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_governorate: string;
  shipping_city: string;
  shipping_address_line: string;
  order_number: string;
  subtotal: number;
  shipping_cost: number;
  discount_amount: number;
  total: number;
  status:
    | "قيد الانتظار"
    | "جاري التجهيز"
    | "تم الشحن"
    | "تم التوصيل"
    | "ملغي"
    | "مرتجع";
  payment_method: string;
  payment_status: string;
  created_at: string;
  items: OrderItem[];
  history?: OrderStatusHistory[];
}

export async function getOrders(userId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(
      `
      *,
      items:order_items(*),
      history:order_status_history(*)
    `,
    )
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching orders:", error);
    return [];
  }

  return data as Order[];
}

export async function getOrderById(orderId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
        *,
        items:order_items(*),
        history:order_status_history(*)
      `,
    )
    .eq("id", orderId)
    .single();

  if (error) {
    console.error(`Error fetching order ${orderId}:`, error);
    return null;
  }

  // Sort history by creation date descending (newest first)
  const order = data as Order;
  if (order.history) {
    order.history.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  return order;
}
