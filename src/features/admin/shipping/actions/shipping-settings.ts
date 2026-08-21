"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/admin/lib/require-admin";

export interface ActionResult {
  success: boolean;
  message: string;
}

/**
 * Updates one governorate's delivery rate and availability.
 *
 * `requireAdmin()` first: `governorates` is `anon`-readable, and an RLS-blocked
 * UPDATE returns zero rows with no error, so without the guard a non-admin
 * would see a success toast for a write that never happened. The
 * `.select().single()` below closes the same gap a second time.
 */
export async function updateGovernorate(
  id: number,
  values: { shipping_cost: number; is_deliverable: boolean },
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  if (!Number.isFinite(values.shipping_cost) || values.shipping_cost < 0) {
    return { success: false, message: "تكلفة الشحن يجب أن تكون رقماً موجباً" };
  }

  const { data, error } = await guard.supabase
    .from("governorates")
    .update({
      shipping_cost: values.shipping_cost,
      is_deliverable: values.is_deliverable,
      updated_by: guard.userId,
    })
    .eq("id", id)
    .select("name_ar")
    .single();

  if (error || !data) {
    console.error("Error updating governorate:", error);
    return { success: false, message: "فشل تحديث المحافظة" };
  }

  revalidateShipping();
  return { success: true, message: `تم تحديث ${data.name_ar}` };
}

/** The free-shipping threshold in EGP; null turns the promotion off. */
export async function updateFreeShippingThreshold(
  threshold: number | null,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  if (threshold !== null && (!Number.isFinite(threshold) || threshold <= 0)) {
    return { success: false, message: "الحد يجب أن يكون رقماً موجباً" };
  }

  const { data, error } = await guard.supabase
    .from("app_settings")
    .update({ value: threshold, updated_by: guard.userId })
    .eq("key", "free_shipping_threshold")
    .select("key")
    .single();

  if (error || !data) {
    console.error("Error updating free shipping threshold:", error);
    return { success: false, message: "فشل حفظ الحد" };
  }

  revalidateShipping();
  return {
    success: true,
    message:
      threshold === null ? "تم إيقاف الشحن المجاني" : "تم حفظ حد الشحن المجاني",
  };
}

/**
 * Rates feed the cart, the checkout quote and every order total, so a change
 * has to reach the storefront immediately rather than waiting out the ISR
 * window.
 */
function revalidateShipping() {
  revalidatePath("/admin/shipping");
  revalidatePath("/checkout");
  revalidatePath("/cart");
}
