"use server";

import { createClient } from "@/lib/supabase/server";
import { CheckoutFormValues } from "@/features/checkout/schema";
import { CartItem } from "@/stores/cartStore";

export type CreateOrderResult =
  | { success: true; orderId: string }
  | { success: false; error: string };

export async function createOrder(
  data: CheckoutFormValues,
  items: CartItem[],
): Promise<CreateOrderResult> {
  const supabase = await createClient();

  // 1. Calculate totals
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const shippingCost = 0; // TODO: Calculate based on governorate
  const discountAmount = 0;
  const total = subtotal + shippingCost - discountAmount;

  // 2. Get user (optional)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2.1 Update Profile (if user exists)
  if (user) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        phone: data.phone,
        address: data.address, // Update default address with the new one
        // We could also update full_name if we wanted:
        // full_name: data.fullName,
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      // We don't fail the order if profile update fails, just log it
    }
  }

  // 3. Insert Order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user?.id || null, // Handle guest checkout
      customer_name: data.fullName,
      customer_email: data.email,
      customer_phone: data.phone,
      shipping_governorate: data.governorate,
      shipping_city: data.city,
      shipping_address_line: data.address,
      customer_notes: data.notes,
      subtotal,
      shipping_cost: shippingCost,
      discount_amount: discountAmount,
      total,
      status: "قيد الانتظار",
      payment_method: "cod", // Default for now
      payment_status: "unpaid",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("Error creating order:", orderError);
    return { success: false, error: "فشل في إنشاء الطلب" };
  }

  // 4. Insert Order Items
  const orderItems = items.map((item) => ({
    order_id: order.id,
    product_id: item.id, // Assuming item.id is UUID. If using different ID, might need lookup.
    product_name: item.name,
    product_image: item.image,
    quantity: item.quantity,
    unit_price: item.price,
    total_price: item.price * item.quantity,
    brand_name: item.brand,
    // product_sku: item.sku, // Add if available in CartItem
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    console.error("Error creating order items:", itemsError);
    // TODO: Rollback order? (Hard in Supabase without functions, but okay for now)
    return { success: false, error: "فشل في إضافة المنتجات للطلب" };
  }

  // 5. Status history is written by the `log_status_change_trigger` on
  // `orders`, which now fires on INSERT as well as UPDATE. Inserting here too
  // would duplicate the first step (and RLS blocks this client anyway).

  return { success: true, orderId: order.id };
}
