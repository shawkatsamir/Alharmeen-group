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
    /*
     * The second most likely collision in normal use, and the one the generic
     * message below served worst: the store owner duplicates a product to make
     * the silver version and leaves the value as it was. "هذه البيانات مستخدمة
     * بالفعل" sent them hunting through the SKU and the slug, which are the two
     * fields the duplicate form already blanks.
     *
     * The message must NOT name a specific axis. Its first version said
     * "(اللون أو المقاس)", which told the owner of a gas cooker varying by
     * screen type to change a colour or a size it does not have — and that was
     * the message behind six consecutive failed saves. The editor now lists the
     * claimed values with the SKU holding each, so pointing there is both
     * accurate for any axis and more useful than naming one.
     *
     * Note the index compares NORMALISED values, so this also fires for
     * "اسود" against an existing "أسود" — same colour, different spelling.
     */
    if (haystack.includes("products_group_variant_norm_uniq")) {
      return {
        field: null,
        message:
          "توجد نسخة بنفس هذه القيمة في المجموعة بالفعل. راجع «مستخدم في المجموعة» بتبويب المواصفات واختر قيمة غير مستخدمة",
      };
    }
    if (haystack.includes("products_group_primary_uniq")) {
      return { field: null, message: "المجموعة لها منتج أساسي بالفعل" };
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
    if (haystack.includes("products_grouped_has_variant_values")) {
      return {
        field: null,
        message: "حدد في تبويب المواصفات القيمة التي تميّز هذه النسخة داخل المجموعة",
      };
    }
    if (haystack.includes("products_group_primary_requires_group")) {
      return { field: null, message: "لا يمكن تعيين منتج أساسي بدون مجموعة" };
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
