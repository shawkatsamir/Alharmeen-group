"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js"; // Admin Client library
import { revalidatePath } from "next/cache";

export async function cancelMyOrder(orderId: string) {
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;

  if (!user) return { success: false, message: "Unauthorized" };

  // 1. Fetch current status to ensure it's safe to cancel
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .eq("user_id", user.id) // Ensure ownership
    .single();

  if (fetchError || !order) {
    return { success: false, message: "Order not found" };
  }

  // 2. The Business Rule Check
  // Statuses are stored in Arabic in the database based on OrderCard.tsx
  const CANCELABLE_STATUSES = [
    "pending",
    "confirmed",
    "قيد الانتظار",
    "تم التأكيد",
  ];

  if (!CANCELABLE_STATUSES.includes(order.status)) {
    return {
      success: false,
      message:
        "Cannot cancel order because it is already being processed or shipped.",
    };
  }

  // This client has "God Mode" permissions. We only use it after passing all checks above.
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  // 3. Perform the Cancellation
  // We use a transaction-like approach: Update Status + Log History
  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({ status: "ملغي" })
    .eq("id", orderId);

  if (updateError) {
    return { success: false, message: "Failed to cancel order" };
  }

  // 4. Log to History
  // Since we don't have a specific 'admin' here, we can leave 'changed_by' null
  // or your database trigger will handle it.
  await supabaseAdmin.from("order_status_history").insert({
    order_id: orderId,
    previous_status: order.status,
    new_status: "ملغي",
    // notes: 'Cancelled by customer'
  });

  // 5. Refresh UI
  revalidatePath("/account/orders");

  return { success: true, message: "Order cancelled successfully" };
}
