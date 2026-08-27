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

/**
 * Per-locality distance override and availability.
 *
 * The override skips the road factor entirely — it is the admin overruling the
 * map for a ferry crossing or a road that does not exist, and re-applying the
 * multiplier would re-introduce the guess they just corrected.
 */
export async function updateLocality(
  id: number,
  values: {
    distance_km_override: number | null;
    is_deliverable: boolean;
    coordinates_verified: boolean;
  },
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  const override = values.distance_km_override;
  if (override !== null && (!Number.isFinite(override) || override < 0)) {
    return { success: false, message: "المسافة يجب أن تكون رقماً موجباً" };
  }

  const { data, error } = await guard.supabase
    .from("localities")
    .update({
      distance_km_override: override,
      is_deliverable: values.is_deliverable,
      coordinates_verified: values.coordinates_verified,
      updated_by: guard.userId,
    })
    .eq("id", id)
    .select("name_ar")
    .single();

  if (error || !data) {
    console.error("Error updating locality:", error);
    return { success: false, message: "فشل تحديث المدينة" };
  }

  revalidateShipping();
  return { success: true, message: `تم تحديث ${data.name_ar}` };
}

/** Base fee, per-km rate and the clamps for one vehicle class. */
export async function updateDeliveryTier(
  key: string,
  values: {
    base_fee: number;
    per_km_rate: number;
    min_fee: number;
    max_fee: number;
  },
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  if (Object.values(values).some((n) => !Number.isFinite(n) || n < 0)) {
    return { success: false, message: "كل القيم يجب أن تكون أرقاماً موجبة" };
  }
  if (values.max_fee < values.min_fee) {
    return { success: false, message: "الحد الأقصى يجب أن يكون أكبر من الأدنى" };
  }

  const { data, error } = await guard.supabase
    .from("delivery_tiers")
    .update({ ...values, updated_by: guard.userId })
    .eq("key", key)
    .select("label_ar")
    .single();

  if (error || !data) {
    console.error("Error updating delivery tier:", error);
    return { success: false, message: "فشل تحديث فئة التوصيل" };
  }

  revalidateShipping();
  return { success: true, message: `تم تحديث ${data.label_ar}` };
}

export async function saveFreeShippingRule(values: {
  id?: number;
  max_distance_km: number;
  min_order_total: number;
}): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  if (
    !Number.isFinite(values.max_distance_km) ||
    values.max_distance_km <= 0 ||
    !Number.isFinite(values.min_order_total) ||
    values.min_order_total <= 0
  ) {
    return { success: false, message: "المسافة والحد يجب أن يكونا أكبر من صفر" };
  }

  const payload = {
    max_distance_km: values.max_distance_km,
    min_order_total: values.min_order_total,
    updated_by: guard.userId,
  };

  const { error } = values.id
    ? await guard.supabase
        .from("free_shipping_rules")
        .update(payload)
        .eq("id", values.id)
    : await guard.supabase.from("free_shipping_rules").insert(payload);

  if (error) {
    // One band per distance, or two rules would fight over the same trip.
    if (error.code === "23505") {
      return { success: false, message: "يوجد بالفعل قاعدة بنفس المسافة" };
    }
    console.error("Error saving free shipping rule:", error);
    return { success: false, message: "فشل حفظ القاعدة" };
  }

  revalidateShipping();
  return { success: true, message: "تم حفظ قاعدة الشحن المجاني" };
}

export async function deleteFreeShippingRule(
  id: number,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  const { error } = await guard.supabase
    .from("free_shipping_rules")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting free shipping rule:", error);
    return { success: false, message: "فشل حذف القاعدة" };
  }

  revalidateShipping();
  return { success: true, message: "تم حذف القاعدة" };
}

/**
 * Shop location and distance policy.
 *
 * Moving the origin invalidates every stored `straight_km`, so this recomputes
 * them in the same call — leaving them stale would silently price every order
 * from the old address.
 */
export async function updateDeliverySettings(values: {
  originName: string;
  originLat: number;
  originLng: number;
  roadFactor: number;
  maxDeliveryKm: number;
}): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  if (
    !Number.isFinite(values.originLat) ||
    Math.abs(values.originLat) > 90 ||
    !Number.isFinite(values.originLng) ||
    Math.abs(values.originLng) > 180
  ) {
    return { success: false, message: "إحداثيات الموقع غير صحيحة" };
  }
  if (!Number.isFinite(values.roadFactor) || values.roadFactor < 1) {
    return { success: false, message: "معامل الطريق يجب أن يكون 1 أو أكثر" };
  }
  if (!Number.isFinite(values.maxDeliveryKm) || values.maxDeliveryKm <= 0) {
    return { success: false, message: "أقصى مسافة يجب أن تكون أكبر من صفر" };
  }

  const rows: { key: string; value: string | number }[] = [
    { key: "delivery_origin_name", value: values.originName },
    { key: "delivery_origin_lat", value: values.originLat },
    { key: "delivery_origin_lng", value: values.originLng },
    { key: "delivery_road_factor", value: values.roadFactor },
    { key: "max_delivery_km", value: values.maxDeliveryKm },
  ];

  for (const row of rows) {
    const { error } = await guard.supabase
      .from("app_settings")
      .update({ value: row.value, updated_by: guard.userId })
      .eq("key", row.key);

    if (error) {
      console.error(`Error updating ${row.key}:`, error);
      return { success: false, message: "فشل حفظ إعدادات التوصيل" };
    }
  }

  const { error: recomputeError } = await guard.supabase.rpc(
    "recompute_locality_distances",
  );

  if (recomputeError) {
    console.error("Error recomputing distances:", recomputeError);
    return {
      success: false,
      message: "تم حفظ الإعدادات لكن فشل إعادة حساب المسافات",
    };
  }

  revalidateShipping();
  return { success: true, message: "تم حفظ الإعدادات وإعادة حساب المسافات" };
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
