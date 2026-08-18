"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

import {
  canCustomerCancel,
  CUSTOMER_CANCELABLE_STATUSES,
} from "../constants/order-status";

/**
 * Customer-initiated cancellation.
 *
 * Allowed until the order ships; after that the correction path is مرتجع.
 * The service-role client is needed because `orders` has no customer UPDATE
 * policy — every ownership and business rule is therefore checked here, above,
 * before that client is used.
 *
 * No order_status_history write: `log_status_change_trigger` handles it.
 */
export async function cancelMyOrder(orderId: string) {
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;

  if (!user) return { success: false, message: "يجب تسجيل الدخول أولاً" };

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .eq("user_id", user.id) // ownership
    .single();

  if (fetchError || !order) {
    return { success: false, message: "الطلب غير موجود" };
  }

  if (!canCustomerCancel(order.status)) {
    return {
      success: false,
      message: `لا يمكن إلغاء الطلب في حالة «${order.status}». الإلغاء متاح فقط قبل الشحن (${CUSTOMER_CANCELABLE_STATUSES.join("، ")}).`,
    };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // createAdminClient() would silently fall back to the publishable key,
    // which RLS then blocks — surface the misconfiguration instead.
    console.error("[cancelMyOrder] SUPABASE_SERVICE_ROLE_KEY is not set");
    return { success: false, message: "تعذر إلغاء الطلب حالياً" };
  }

  const supabaseAdmin = createAdminClient();

  // .eq("user_id") is redundant given the check above, but this client bypasses
  // RLS entirely — defense in depth is cheap here. .select().single() ensures a
  // no-op update can't be reported as success.
  const { data: cancelled, error: updateError } = await supabaseAdmin
    .from("orders")
    .update({ status: "ملغي" })
    .eq("id", orderId)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (updateError || !cancelled) {
    console.error("[cancelMyOrder] Update failed:", updateError);
    return { success: false, message: "فشل إلغاء الطلب" };
  }

  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/admin/orders");

  return { success: true, message: "تم إلغاء الطلب بنجاح" };
}
