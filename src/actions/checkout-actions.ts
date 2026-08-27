"use server";

import { createClient } from "@/lib/supabase/server";
import { CheckoutFormValues } from "@/features/checkout/schema";
import { CartItem } from "@/stores/cartStore";
import {
  effectiveDistanceKm,
  fallbackGovernorateCost,
  quoteDelivery,
  resolveDeliveryTier,
  resolveProductTierKey,
  roundMoney,
} from "@/features/checkout/lib/shipping";
import { getDeliveryConfig } from "@/services/server/shipping";
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
  const deliveryConfig = await getDeliveryConfig();

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
      // `parent:parent_id(...)` is the correct self-referencing embed form;
      // the other spelling silently returns nothing.
      "id, name_ar, price, is_active, is_available, delivery_tier, brand:brands(name_ar), images:product_images(image_url, is_primary), category:categories(delivery_tier, parent:parent_id(delivery_tier))",
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

  // PostgREST returns a many-to-one embed as an object, but the generated
  // types describe it as an array. Handle both rather than casting.
  const one = <T,>(value: T | T[] | null): T | null =>
    Array.isArray(value) ? (value[0] ?? null) : value;

  const cartTierKeys = products.map((product) => {
    const category = one(product.category);
    return resolveProductTierKey({
      productTier: product.delivery_tier,
      categoryTier: category?.delivery_tier ?? null,
      parentCategoryTier: one(category?.parent)?.delivery_tier ?? null,
      fallback: deliveryConfig.fallbackTierKey,
    });
  });

  const orderItems = products.map((product) => {
    const quantity = quantities.get(product.id)!;
    const primaryImage =
      product.images?.find((img) => img.is_primary) ?? product.images?.[0];
    const brand = one(product.brand);

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

  /*
   * Delivery is priced from the locality's stored distance, never from the
   * client. The browser shows a preview using the same pure functions, but
   * this is the number that gets charged.
   */
  const { data: locality, error: localityError } = await supabase
    .from("localities")
    .select(
      "id, name_ar, straight_km, distance_km_override, is_deliverable, governorate:governorates(name_ar, shipping_cost, is_deliverable)",
    )
    .eq("id", data.localityId)
    .maybeSingle();

  if (localityError) {
    console.error("Error loading locality:", localityError);
    return { success: false, error: "تعذر حساب تكلفة التوصيل" };
  }

  if (!locality) {
    return { success: false, error: "المدينة المختارة غير صحيحة" };
  }

  const governorate = one(locality.governorate);

  if (!locality.is_deliverable || !governorate?.is_deliverable) {
    return {
      success: false,
      error: `عذراً، لا نقوم بالتوصيل إلى ${locality.name_ar} حالياً`,
    };
  }

  const tier = resolveDeliveryTier(cartTierKeys, deliveryConfig.tiers);
  const distanceKm = effectiveDistanceKm({
    straightKm: locality.straight_km,
    overrideKm: locality.distance_km_override,
    roadFactor: deliveryConfig.roadFactor,
  });

  let shippingCost: number;
  let shippingDistanceKm: number | null = null;
  let deliveryTierKey: string | null = tier?.key ?? null;

  if (distanceKm === null || !tier) {
    // Degraded path: a locality with no coordinates and no override, or a
    // shop with no tiers configured. Fall back to the governorate flat rate
    // rather than refusing an otherwise valid order.
    shippingCost = fallbackGovernorateCost(governorate?.shipping_cost ?? 0);
    deliveryTierKey = null;
  } else {
    const quote = quoteDelivery({
      distanceKm,
      tier,
      subtotal,
      rules: deliveryConfig.rules,
      maxDeliveryKm: deliveryConfig.maxDeliveryKm,
    });

    if (quote.isOutOfRange) {
      return {
        success: false,
        error: `${locality.name_ar} خارج نطاق التوصيل الحالي. برجاء التواصل معنا للاتفاق على التوصيل.`,
      };
    }

    shippingCost = quote.cost;
    shippingDistanceKm = quote.distanceKm;
  }

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
      // Store the canonical names, not what the form posted.
      shipping_governorate: governorate?.name_ar ?? data.governorate,
      shipping_city: locality.name_ar,
      shipping_locality_id: locality.id,
      // Snapshotted so a dispute months later can be reconstructed, and so the
      // shop can compare what it charged against what the trip cost.
      shipping_distance_km: shippingDistanceKm,
      delivery_tier: deliveryTierKey,
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
