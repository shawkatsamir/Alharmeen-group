"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Define valid statuses to match your Database Check Constraint
const VALID_STATUSES = [
  "قيد الانتظار",
  "جاري التجهيز",
  "تم الشحن",
  "تم التوصيل",
  "ملغي",
  "مرتجع",
];

export async function updateOrderStatus(orderId: string, newStatus: string) {
  const supabase = await createClient();

  // 1. Validation: Ensure status is valid
  if (!VALID_STATUSES.includes(newStatus)) {
    return { success: false, message: "Invalid status provided" };
  }

  try {
    // 2. Fetch the CURRENT order to get the "previous_status"
    const { data: currentOrder, error: fetchError } = await supabase
      .from("orders")
      .select("status, user_id")
      .eq("id", orderId)
      .single();

    if (fetchError || !currentOrder) {
      throw new Error("Order not found");
    }

    const previousStatus = currentOrder.status;

    // Optimization: If status hasn't changed, do nothing
    if (previousStatus === newStatus) {
      return {
        success: true,
        message: "Status is already set to " + newStatus,
      };
    }

    // 3. Update the Order Status
    // We also set 'delivered_at' if the new status is 'delivered'
    const updateData: { status: string; delivered_at?: string } = {
      status: newStatus,
    };
    if (newStatus === "تم التوصيل") {
      updateData.delivered_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) {
      console.error("[OrderAction] Update Error:", updateError);
      throw new Error("Failed to update order status: " + updateError.message);
    }

    // 4. Insert into History (The Audit Log)
    const { error: historyError } = await supabase
      .from("order_status_history")
      .insert({
        order_id: orderId,
        previous_status: previousStatus,
        new_status: newStatus,
        // changed_by: We let Supabase handle this via default Auth context if RLS is set,
        // OR you can explicitely fetch the admin ID here if needed.
        // notes: 'Updated via Admin Dashboard'
      });

    if (historyError) {
      console.error("History log failed:", historyError);
      // We don't throw here because the main update succeeded,
      // but in a strict banking app, we would rollback.
    }

    // 5. Revalidate Paths
    // A. Clear the Admin Dashboard list so the dropdown updates
    revalidatePath("/admin/orders");
    revalidatePath("/admin/dashboard");

    // B. Clear the specific Customer Order page (so they see the new progress bar instantly)
    // Note: We don't know the exact URL unless we know the tracking token,
    // but usually customer pages are dynamic or use the user's ID.
    // If you use ISR for public tracking pages, revalidate them here.

    return { success: true, message: "Status updated successfully" };
  } catch (error) {
    console.error("Update Order Status Error:", error);
    return { success: false, message: "Internal Server Error" };
  }
}
