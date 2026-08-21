"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/features/admin/lib/require-admin";
import {
  canTransition,
  getNextStatuses,
  isOrderStatus,
} from "../constants/order-status";

/**
 * Admin status change.
 *
 * Note there is deliberately NO write to order_status_history here. The
 * `log_status_change_trigger` on `orders` is the sole writer of that table
 * (SECURITY DEFINER, so it bypasses RLS). Adding an insert here would produce
 * a duplicate row for every transition.
 */
export async function updateOrderStatus(orderId: string, newStatus: string) {
  // Previously unguarded: this is an exported Server Action, so it was
  // callable by any authenticated user and relied entirely on whatever UPDATE
  // policy `orders` happens to have configured in the dashboard.
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  const supabase = guard.supabase;

  if (!isOrderStatus(newStatus)) {
    return { success: false, message: "حالة الطلب غير صالحة" };
  }

  try {
    const { data: currentOrder, error: fetchError } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    if (fetchError || !currentOrder) {
      return { success: false, message: "الطلب غير موجود" };
    }

    const previousStatus = currentOrder.status;

    if (previousStatus === newStatus) {
      return { success: true, message: `الحالة بالفعل: ${newStatus}` };
    }

    if (!isOrderStatus(previousStatus)) {
      // Legacy row holding a value the machine doesn't know (e.g. the old
      // English "pending"). Refuse rather than guess a transition.
      return {
        success: false,
        message: `حالة الطلب الحالية غير معروفة: ${previousStatus}`,
      };
    }

    // The same forward-only machine is enforced by a BEFORE UPDATE trigger in
    // the database. This check exists so the UI can fail with a readable
    // message instead of surfacing a raw Postgres exception.
    if (!canTransition(previousStatus, newStatus)) {
      const allowed = getNextStatuses(previousStatus);
      return {
        success: false,
        message: allowed.length
          ? `لا يمكن تغيير الحالة من «${previousStatus}» إلى «${newStatus}». المسموح: ${allowed.join("، ")}`
          : `«${previousStatus}» حالة نهائية ولا يمكن تغييرها`,
      };
    }

    const updateData: { status: string; delivered_at?: string } = {
      status: newStatus,
    };
    if (newStatus === "تم التوصيل") {
      updateData.delivered_at = new Date().toISOString();
    }

    // .select().single() matters: without it an UPDATE blocked by RLS returns
    // no error and zero rows, and this action would report a false success.
    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .select("id")
      .single();

    if (updateError || !updated) {
      console.error("[updateOrderStatus] Update failed:", updateError);
      return {
        success: false,
        message: updateError?.message ?? "فشل تحديث حالة الطلب",
      };
    }

    revalidatePath("/admin/orders");
    revalidatePath("/admin/dashboard");
    // The customer's own views render the same status, so they must be
    // revalidated too or the buyer keeps seeing the stale step.
    revalidatePath("/account/orders");
    revalidatePath(`/account/orders/${orderId}`);

    return { success: true, message: "تم تحديث حالة الطلب بنجاح" };
  } catch (error) {
    console.error("[updateOrderStatus] Unexpected error:", error);
    return { success: false, message: "حدث خطأ غير متوقع" };
  }
}
