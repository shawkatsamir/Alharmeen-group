/**
 * Translate Postgres write failures into Arabic messages tied to a form field.
 *
 * `products.sku` and `products.slug` are both UNIQUE, and a collision is the
 * single most likely way a save fails in normal use — the store owner copies an
 * existing product to make a variant. The raw PostgREST error is an English
 * string mentioning the constraint name, which is useless in the UI.
 */

/** Shape of the error object supabase-js returns; not worth importing a type for. */
interface PostgrestErrorLike {
  code?: string;
  message?: string;
  details?: string | null;
}

export interface FieldError {
  field: "sku" | "slug" | null;
  message: string;
}

const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";
const FOREIGN_KEY_VIOLATION = "23503";

export function describeProductWriteError(
  error: PostgrestErrorLike | null | undefined,
): FieldError {
  if (!error) return { field: null, message: "تعذر حفظ المنتج" };

  const haystack = `${error.message ?? ""} ${error.details ?? ""}`;

  if (error.code === UNIQUE_VIOLATION) {
    if (haystack.includes("products_sku_key")) {
      return { field: "sku", message: "رمز المنتج (SKU) مستخدم بالفعل" };
    }
    if (haystack.includes("products_slug_key")) {
      return { field: "slug", message: "الرابط مستخدم بالفعل، اختر رابطاً آخر" };
    }
    return { field: null, message: "هذه البيانات مستخدمة بالفعل" };
  }

  if (error.code === CHECK_VIOLATION) {
    // The most likely check to trip is buying_price > 0, since an empty field
    // reaching the database as 0 rather than null is an easy mistake.
    if (haystack.includes("buying_price")) {
      return { field: null, message: "سعر الشراء يجب أن يكون أكبر من صفر" };
    }
    if (haystack.includes("content_blocks")) {
      return { field: null, message: "محتوى المنتج بصيغة غير صالحة" };
    }
    return { field: null, message: "بعض القيم خارج النطاق المسموح" };
  }

  if (error.code === FOREIGN_KEY_VIOLATION) {
    return { field: null, message: "القسم أو الماركة المختارة غير موجودة" };
  }

  return { field: null, message: "تعذر حفظ المنتج" };
}

export function isUniqueViolation(
  error: PostgrestErrorLike | null | undefined,
): boolean {
  return error?.code === UNIQUE_VIOLATION;
}
