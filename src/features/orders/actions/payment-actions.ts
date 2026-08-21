"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/features/admin/lib/require-admin";
import { isPaymentRecordMethod } from "../constants/payment";

export interface PaymentActionResult {
  success: boolean;
  message: string;
}

export interface RecordPaymentInput {
  amount: number;
  method: string;
  reference?: string | null;
  notes?: string | null;
}

/**
 * Records money received against an order.
 *
 * Note there is deliberately NO write to `orders.payment_status` or
 * `orders.amount_paid` here. The `sync_order_payment_totals_trigger` on
 * `orders` derives both from this ledger and overwrites anything the
 * application sends — same discipline as `log_status_change_trigger` owning
 * order_status_history.
 */
export async function recordPayment(
  orderId: string,
  input: RecordPaymentInput,
): Promise<PaymentActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  const amount = Number(input.amount);

  if (!Number.isFinite(amount) || amount === 0) {
    return { success: false, message: "المبلغ يجب أن يكون رقماً غير صفري" };
  }

  if (!isPaymentRecordMethod(input.method)) {
    return { success: false, message: "طريقة الدفع غير صالحة" };
  }

  const { data: order, error: orderError } = await guard.supabase
    .from("orders")
    .select("id, total, amount_paid")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return { success: false, message: "الطلب غير موجود" };
  }

  // A refund cannot exceed what was actually collected, or the ledger would
  // claim the shop paid the customer money it never received.
  if (amount < 0 && Math.abs(amount) > order.amount_paid) {
    return {
      success: false,
      message: `لا يمكن استرجاع أكثر من المبلغ المدفوع (${order.amount_paid})`,
    };
  }

  const reference = input.reference?.trim() || null;

  const { error: insertError } = await guard.supabase
    .from("order_payments")
    .insert({
      order_id: orderId,
      amount,
      method: input.method,
      reference,
      notes: input.notes?.trim() || null,
      recorded_by: guard.userId,
    });

  if (insertError) {
    // The partial unique index on (order_id, reference) catches the "admin
    // refreshed and submitted the same transfer twice" mistake.
    if (insertError.code === "23505") {
      return {
        success: false,
        message: `تم تسجيل دفعة بنفس رقم العملية (${reference}) من قبل`,
      };
    }
    console.error("[recordPayment] Insert failed:", insertError);
    return { success: false, message: "فشل تسجيل الدفعة" };
  }

  revalidatePaths(orderId);

  return {
    success: true,
    message:
      amount > 0 ? "تم تسجيل الدفعة بنجاح" : "تم تسجيل الاسترجاع بنجاح",
  };
}

/**
 * Reverses a recorded payment by writing a compensating negative row.
 *
 * Never deletes. A ledger that can be edited loses both `recorded_by` and the
 * original timestamp, which are the two things that make a payment dispute
 * resolvable months later.
 */
export async function voidPayment(
  paymentId: string,
): Promise<PaymentActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  const { data: payment, error: fetchError } = await guard.supabase
    .from("order_payments")
    .select("id, order_id, amount, method, reference")
    .eq("id", paymentId)
    .single();

  if (fetchError || !payment) {
    return { success: false, message: "الدفعة غير موجودة" };
  }

  const { error: insertError } = await guard.supabase
    .from("order_payments")
    .insert({
      order_id: payment.order_id,
      amount: -payment.amount,
      method: payment.method,
      // The original reference is already taken by the row being reversed, and
      // the partial unique index is per (order_id, reference).
      reference: payment.reference ? `${payment.reference}-عكس` : null,
      notes: `إلغاء دفعة سابقة (${payment.id})`,
      recorded_by: guard.userId,
    });

  if (insertError) {
    console.error("[voidPayment] Insert failed:", insertError);
    return { success: false, message: "فشل إلغاء الدفعة" };
  }

  revalidatePaths(payment.order_id);

  return { success: true, message: "تم إلغاء الدفعة" };
}

function revalidatePaths(orderId: string) {
  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  // The customer sees the same balance on their own order pages.
  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);
}
