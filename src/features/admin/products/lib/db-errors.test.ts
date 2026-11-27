import { describe, expect, it } from "vitest";

import { describeProductWriteError, isUniqueViolation } from "./db-errors";

/** PostgREST surfaces the constraint name inside `message`/`details`. */
function uniqueViolation(constraint: string) {
  return {
    code: "23505",
    message: `duplicate key value violates unique constraint "${constraint}"`,
    details: null,
  };
}

function checkViolation(constraint: string) {
  return {
    code: "23514",
    message: `new row for relation "products" violates check constraint "${constraint}"`,
    details: null,
  };
}

describe("describeProductWriteError", () => {
  it("names the SKU and the slug", () => {
    expect(describeProductWriteError(uniqueViolation("products_sku_key"))).toEqual({
      field: "sku",
      message: "رمز المنتج (SKU) مستخدم بالفعل",
    });
    expect(describeProductWriteError(uniqueViolation("products_slug_key")).field).toBe(
      "slug",
    );
  });

  it("explains a duplicate variant combination as a variant problem", () => {
    /*
     * The case this mapping exists for: duplicate a product to make the silver
     * version, forget to change the value. The generic "هذه البيانات مستخدمة
     * بالفعل" pointed at no field, so the owner searched the SKU and the slug —
     * the two fields the duplicate form already blanks.
     */
    const described = describeProductWriteError(
      uniqueViolation("products_group_variant_norm_uniq"),
    );

    expect(described.field).toBeNull();
    expect(described.message).toContain("المجموعة");
    expect(described.message).toContain("المواصفات");
    expect(described.message).not.toBe("هذه البيانات مستخدمة بالفعل");
  });

  it("never names a specific axis in the duplicate message", () => {
    /*
     * The regression that cost six consecutive failed saves. The message said
     * "غيّر قيمة الخاصية (اللون أو المقاس)" to the owner of a gas cooker whose
     * group varies by نوع الشاشة, so the instruction named two properties the
     * product does not have. No message in this feature may name an axis that
     * is not the group's own.
     */
    const message = describeProductWriteError(
      uniqueViolation("products_group_variant_norm_uniq"),
    ).message;

    for (const axis of ["اللون", "المقاس", "السعة", "نوع الشواية", "حجم الشاشة"]) {
      expect(message, axis).not.toContain(axis);
    }
  });

  it("explains a grouped row with no variant values", () => {
    const described = describeProductWriteError(
      checkViolation("products_grouped_has_variant_values"),
    );

    expect(described.message).toContain("المواصفات");
    expect(described.message).not.toBe("بعض القيم خارج النطاق المسموح");
  });

  it("keeps the existing fallbacks", () => {
    expect(describeProductWriteError(uniqueViolation("something_else")).message).toBe(
      "هذه البيانات مستخدمة بالفعل",
    );
    expect(describeProductWriteError(checkViolation("products_price_check")).message).toBe(
      "بعض القيم خارج النطاق المسموح",
    );
    expect(
      describeProductWriteError({ code: "23503", message: "fk" }).message,
    ).toBe("القسم أو الماركة المختارة غير موجودة");
    expect(describeProductWriteError(null).message).toBe("تعذر حفظ المنتج");
  });

  it("still reports buying_price before the variant checks", () => {
    expect(
      describeProductWriteError(checkViolation("products_buying_price_check")).message,
    ).toBe("سعر الشراء يجب أن يكون أكبر من صفر");
  });
});

describe("isUniqueViolation", () => {
  it("matches 23505 only", () => {
    expect(isUniqueViolation(uniqueViolation("products_sku_key"))).toBe(true);
    expect(isUniqueViolation({ code: "23514" })).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
  });
});
