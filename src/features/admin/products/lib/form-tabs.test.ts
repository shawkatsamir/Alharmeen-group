import { describe, expect, it } from "vitest";

import { emptyProductFormValues } from "./form-defaults";
import {
  describeFormErrors,
  FIELD_TABS,
  fieldMessage,
  findTabWithError,
  firstMessage,
  PRODUCT_FORM_TABS,
  rowValueMessages,
} from "./form-tabs";

/**
 * react-hook-form's error shape for the state the "add a variant" form OPENS
 * in: prefilled from a sibling, group preselected, axis value deliberately
 * blank. This is the exact object that used to route nowhere.
 */
const BLANK_AXIS_VALUE_ERRORS = {
  variant_values: [{ value: { type: "too_small", message: "قيمة الخاصية مطلوبة" } }],
};

describe("FIELD_TABS", () => {
  it("covers every field the form can hold", () => {
    // Runtime twin of the `Record<keyof ProductFormValues, …>` type: catches a
    // field added to the schema with a default but no tab, which the type alone
    // would catch only if someone re-ran typecheck.
    const fields = Object.keys(emptyProductFormValues());
    const mapped = Object.keys(FIELD_TABS);

    expect([...fields].sort()).toEqual([...mapped].sort());
  });

  it("points every field at a real tab", () => {
    const ids = PRODUCT_FORM_TABS.map((tab) => tab.id) as string[];
    for (const [field, tab] of Object.entries(FIELD_TABS)) {
      expect(ids, field).toContain(tab);
    }
  });

  it("routes the variant group fields to the specs tab", () => {
    // The regression. Both were absent, so the one error the duplicate-prefill
    // form opens with had no tab to switch to.
    expect(FIELD_TABS.group_id).toBe("specs");
    expect(FIELD_TABS.variant_values).toBe("specs");
  });
});

describe("findTabWithError", () => {
  it("finds the specs tab from a blank axis value", () => {
    expect(findTabWithError(Object.keys(BLANK_AXIS_VALUE_ERRORS))).toBe("specs");
  });

  it("prefers the earliest tab when several fields fail", () => {
    expect(findTabWithError(["meta_title_ar", "variant_values", "sku"])).toBe(
      "basic",
    );
  });

  it("returns undefined for an unknown field", () => {
    expect(findTabWithError(["not_a_field"])).toBeUndefined();
  });

  it("returns undefined for no errors", () => {
    // What `onInvalid` used to be handed on the first failed submit, because it
    // read `formState.errors` from a stale render closure instead of the
    // errors react-hook-form passes in.
    expect(findTabWithError([])).toBeUndefined();
  });
});

describe("describeFormErrors", () => {
  it("quotes the message from inside a repeatable field", () => {
    expect(describeFormErrors(BLANK_AXIS_VALUE_ERRORS)).toEqual({
      tab: "specs",
      message: "قيمة الخاصية مطلوبة",
    });
  });

  it("handles a whole-field issue on variant_values", () => {
    expect(
      describeFormErrors({
        variant_values: { message: "حدد قيمة الخاصية التي يتميز بها هذا المنتج داخل المجموعة" },
      }),
    ).toEqual({
      tab: "specs",
      message: "حدد قيمة الخاصية التي يتميز بها هذا المنتج داخل المجموعة",
    });
  });

  it("reports the earliest tab, not the first key in the object", () => {
    const summary = describeFormErrors({
      variant_values: [{ value: { message: "قيمة الخاصية مطلوبة" } }],
      sku: { message: "رمز المنتج (SKU) مطلوب" },
    });

    expect(summary).toEqual({ tab: "basic", message: "رمز المنتج (SKU) مطلوب" });
  });

  it("falls back to a generic prompt when nothing maps", () => {
    expect(describeFormErrors({})).toEqual({ message: "راجع الحقول المطلوبة" });
    expect(describeFormErrors({ mystery: { message: "x" } })).toEqual({
      message: "راجع الحقول المطلوبة",
    });
  });

  it("reads a nested object field", () => {
    expect(
      describeFormErrors({ video_urls: { unboxing: { message: "رابط غير صالح" } } }),
    ).toEqual({ tab: "media", message: "رابط غير صالح" });
  });
});

describe("firstMessage", () => {
  it("never walks into the DOM ref", () => {
    // `ref` is a live element in the browser; recursing into it would walk the
    // document and can return a string from somewhere unrelated.
    const circular: Record<string, unknown> = { message: undefined };
    circular.ref = { message: "من المرجع" };
    expect(firstMessage(circular)).toBeUndefined();
  });

  it("ignores the Zod issue code", () => {
    expect(firstMessage({ type: "too_small" })).toBeUndefined();
  });

  it("ignores empty messages", () => {
    expect(firstMessage({ message: "" })).toBeUndefined();
  });
});

describe("rowValueMessages / fieldMessage", () => {
  it("maps row errors by index, keeping the holes", () => {
    expect(
      rowValueMessages([
        undefined,
        { value: { message: "قيمة الخاصية مطلوبة" } },
      ]),
    ).toEqual([undefined, "قيمة الخاصية مطلوبة"]);
  });

  it("returns no rows for a whole-field error", () => {
    expect(rowValueMessages({ message: "اختر المجموعة أولاً" })).toEqual([]);
  });

  it("reads a whole-field message and skips arrays", () => {
    expect(fieldMessage({ message: "اختر المجموعة أولاً" })).toBe(
      "اختر المجموعة أولاً",
    );
    expect(fieldMessage([{ value: { message: "x" } }])).toBeUndefined();
    expect(fieldMessage(undefined)).toBeUndefined();
  });
});
