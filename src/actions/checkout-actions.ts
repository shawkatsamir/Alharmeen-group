"use server";

import { createClient } from "@/lib/supabase/server";
import { CheckoutFormValues } from "@/features/checkout/schema";
import { CartItem } from "@/stores/cartStore";
import {
  resolveShippingCost,
  roundMoney,
} from "@/features/checkout/lib/shipping";
import { isPaymentMethod } from "@/features/orders/constants/payment";

export type CreateOrderResult =
  | { success: true; orderId: string }
  | { success: false; error: string };

export async function createOrder(
  data: CheckoutFormValues,
  items: CartItem[],
): Promise<CreateOrderResult> {
  const supabase = await createClient();

  if (items.length === 0) {
    return { success: false, error: "السلة فارغة" };
  }

  // Re-validated here rather than trusting the client: this is a Server Action
  // and the zod schema only ran in the browser.
  if (!isPaymentMethod(data.paymentMethod)) {
    return { success: false, error: "طريقة الدفع غير صالحة" };
  }

  /*
   * Every price is re-read from the database.
   *
   * `items` arrives from the browser's persisted Zustand cart, so `item.price`
   * is attacker-controlled — the previous version summed it directly, which
   * meant a crafted request could buy anything for 1 EGP. The client cart is
   * now treated as nothing more than a list of (product id, quantity).
   */
  const quantities = new Map<string, number>();
  for (const item of items) {
    const quantity = Math.floor(item.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      return { success: false, error: "الكمية غير صحيحة" };
    }
    quantities.set(item.id, (quantities.get(item.id) ?? 0) + quantity);
  }

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(
      "id, name_ar, price, is_active, is_available, brand:brands(name_ar), images:product_images(image_url, is_primary)",
    )
    .in("id", [...quantities.keys()]);

  if (productsError || !products) {
    console.error("Error loading products for order:", productsError);
    return { success: false, error: "تعذر التحقق من المنتجات" };
  }

  if (products.length !== quantities.size) {
    return { success: false, error: "بعض المنتجات لم تعد متاحة" };
  }

  const unavailable = products.find((p) => !p.is_active || !p.is_available);
  if (unavailable) {
    return {
      success: false,
      error: `${unavailable.name_ar.trim()} لم يعد متاحاً`,
    };
  }

  const orderItems = products.map((product) => {
    const quantity = quantities.get(product.id)!;
    const primaryImage =
      product.images?.find((img) => img.is_primary) ?? product.images?.[0];
    // PostgREST returns a many-to-one embed as an object, but the generated
    // types describe it as an array. Handle both rather than casting.
    const brand = Array.isArray(product.brand) ? product.brand[0] : product.brand;

    return {
      product_id: product.id,
      product_name: product.name_ar.trim(),
      product_image: primaryImage?.image_url ?? null,
      brand_name: brand?.name_ar ?? null,
      quantity,
      unit_price: product.price,
      total_price: roundMoney(product.price * quantity),
    };
  });

  const subtotal = roundMoney(
    orderItems.reduce((sum, item) => sum + item.total_price, 0),
  );

  // Shipping likewise comes from the governorates table, never from the client.
  const { data: governorate, error: governorateError } = await supabase
    .from("governorates")
    .select("name_ar, shipping_cost, is_deliverable")
    .eq("name_ar", data.governorate)
    .maybeSingle();

  if (governorateError) {
    console.error("Error loading governorate:", governorateError);
    return { success: false, error: "تعذر حساب تكلفة الشحن" };
  }

  if (!governorate) {
    return { success: false, error: "المحافظة المختارة غير صحيحة" };
  }

  if (!governorate.is_deliverable) {
    return {
      success: false,
      error: `عذراً، لا نقوم بالتوصيل إلى ${governorate.name_ar} حالياً`,
    };
  }

  const { data: thresholdSetting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "free_shipping_threshold")
    .maybeSingle();

  const freeShippingThreshold =
    typeof thresholdSetting?.value === "number" && thresholdSetting.value > 0
      ? thresholdSetting.value
      : null;

  const { cost: shippingCost } = resolveShippingCost({
    rate: governorate.shipping_cost,
    subtotal,
    freeShippingThreshold,
  });

  const discountAmount = 0;
  const total = roundMoney(subtotal + shippingCost - discountAmount);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        phone: data.phone,
        address: data.address, // Update default address with the new one
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      // We don't fail the order if profile update fails, just log it
    }
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user?.id || null, // Handle guest checkout
      customer_name: data.fullName,
      customer_email: data.email,
      customer_phone: data.phone,
      // Store the canonical governorate name, not what the form posted.
      shipping_governorate: governorate.name_ar,
      shipping_city: data.city.trim(),
      shipping_address_line: data.address,
      customer_notes: data.notes,
      subtotal,
      shipping_cost: shippingCost,
      discount_amount: discountAmount,
      total,
      status: "قيد الانتظار",
      payment_method: data.paymentMethod,
      // Derived by `sync_order_payment_totals_trigger` from the order_payments
      // ledger; sent only to satisfy the column's NOT NULL, and overwritten.
      payment_status: "unpaid",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("Error creating order:", orderError);
    return { success: false, error: "فشل في إنشاء الطلب" };
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    orderItems.map((item) => ({
      order_id: order.id,
      ...item,
    })),
  );

  if (itemsError) {
    console.error("Error creating order items:", itemsError);
    // TODO: Rollback order? (Hard in Supabase without functions, but okay for now)
    return { success: false, error: "فشل في إضافة المنتجات للطلب" };
  }

  // Status history is written by the `log_status_change_trigger` on `orders`,
  // which fires on INSERT as well as UPDATE. Inserting here too would duplicate
  // the first step (and RLS blocks this client anyway).

  return { success: true, orderId: order.id };
}
