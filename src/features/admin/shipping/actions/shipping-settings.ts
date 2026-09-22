"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/admin/lib/require-admin";
import { isInEgypt } from "@/features/checkout/lib/shipping";

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
 * Per-locality coordinates, distance override and availability.
 *
 * The override skips the road factor entirely — it is the admin overruling the
 * map for a ferry crossing or a road that does not exist, and re-applying the
 * multiplier would re-introduce the guess they just corrected.
 *
 * Coordinates are optional in the payload: when present, the
 * `localities_set_straight_km` trigger recomputes `straight_km` in the same
 * UPDATE, so this action never writes a distance itself.
 */
export async function updateLocality(
  id: number,
  values: {
    distance_km_override: number | null;
    is_deliverable: boolean;
    coordinates_verified: boolean;
    coordinates?: { lat: number; lng: number };
  },
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  const override = values.distance_km_override;
  if (override !== null && (!Number.isFinite(override) || override < 0)) {
    return { success: false, message: "المسافة يجب أن تكون رقماً موجباً" };
  }

  // Checked here for an Arabic message; the DB CHECK is the backstop.
  if (
    values.coordinates &&
    !isInEgypt(values.coordinates.lat, values.coordinates.lng)
  ) {
    return { success: false, message: "الإحداثيات غير صحيحة أو خارج مصر" };
  }

  const { data, error } = await guard.supabase
    .from("localities")
    .update({
      distance_km_override: override,
      is_deliverable: values.is_deliverable,
      coordinates_verified: values.coordinates_verified,
      ...(values.coordinates && {
        lat: values.coordinates.lat,
        lng: values.coordinates.lng,
      }),
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

  if (!isInEgypt(values.originLat, values.originLng)) {
    return { success: false, message: "إحداثيات الموقع غير صحيحة أو خارج مصر" };
  }
  if (!Number.isFinite(values.roadFactor) || values.roadFactor < 1) {
    return { success: false, message: "معامل الطريق يجب أن يكون 1 أو أكثر" };
  }
  if (!Number.isFinite(values.maxDeliveryKm) || values.maxDeliveryKm <= 0) {
    return { success: false, message: "أقصى مسافة يجب أن تكون أكبر من صفر" };
  }

  // One transaction in Postgres: upsert all five settings, then recompute.
  // The previous five separate UPDATEs could leave the origin half-moved, and
  // an UPDATE on a missing key matched zero rows while reporting success.
  const { data: recomputed, error } = await guard.supabase.rpc(
    "update_delivery_settings",
    {
      p_origin_name: values.originName,
      p_origin_lat: values.originLat,
      p_origin_lng: values.originLng,
      p_road_factor: values.roadFactor,
      p_max_delivery_km: values.maxDeliveryKm,
    },
  );

  if (error) {
    console.error("Error saving delivery settings:", error);
    return { success: false, message: "فشل حفظ إعدادات التوصيل" };
  }

  revalidateShipping();
  return {
    success: true,
    message: `تم حفظ الإعدادات وإعادة حساب المسافات لـ ${recomputed ?? 0} مدينة`,
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
