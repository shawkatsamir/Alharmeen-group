import { describe, expect, it } from "vitest";

import { mergeAxisRegistry, type VariantAxisRow } from "./axis-registry";
import {
  AXIS_REGISTRY,
  axisSpecKeys,
  resolveAxis,
  suggestedAxes,
  variantAxisKind,
  variantAxisLabel,
  variantAxisSchemaProperty,
  axisValueRank,
} from "../constants/variant-axes";

function row(overrides: Partial<VariantAxisRow> & { key: string }): VariantAxisRow {
  return {
    label_ar: null,
    kind: null,
    schema_property: null,
    spec_aliases: null,
    display_order: null,
    ...overrides,
  };
}

/**
 * The guarantee this whole change rests on: declaring a new axis cannot alter
 * how an existing one behaves, and an axis nobody has declared still renders.
 */
describe("the fallback chain", () => {
  it("renders an axis that is in neither the table nor the defaults", () => {
    const registry = mergeAxisRegistry([row({ key: "عدد الأبواب", kind: "text" })]);

    // Not in the table, not in AXIS_REGISTRY — still readable, still a pill.
    expect(variantAxisKind("نوع الفرن", registry)).toBe("text");
    expect(variantAxisLabel("نوع الفرن", registry)).toBe("نوع الفرن");
    expect(variantAxisSchemaProperty("نوع الفرن", registry)).toBeUndefined();
    expect(resolveAxis("نوع الفرن", registry)).toEqual({
      kind: "text",
      label: "نوع الفرن",
    });
  });

  it("keeps the built-in definition for an axis the table omits", () => {
    const registry = mergeAxisRegistry([row({ key: "عدد الأبواب", kind: "text" })]);

    expect(variantAxisKind("اللون", registry)).toBe("color");
    expect(variantAxisSchemaProperty("اللون", registry)).toBe("color");
    expect(variantAxisLabel("البوصة", registry)).toBe("المقاس");
  });

  it("falls back to the built-in registry when the table cannot be read", () => {
    // `getAxisRegistry` returns AXIS_REGISTRY on error; this pins that the
    // no-rows merge is identical to it rather than an empty object.
    expect(mergeAxisRegistry([])).toEqual(AXIS_REGISTRY);
  });

  it("behaves identically with no registry supplied at all", () => {
    // Every call site that has not been threaded yet passes no registry. Those
    // must keep working exactly as before.
    expect(variantAxisKind("اللون")).toBe("color");
    expect(variantAxisKind("نوع الشواية")).toBe("text");
    expect(variantAxisKind("مجهول")).toBe("text");
    expect(variantAxisLabel("مجهول")).toBe("مجهول");
  });
});

describe("mergeAxisRegistry", () => {
  it("lets a declared axis win over the built-in default", () => {
    const registry = mergeAxisRegistry([
      row({ key: "نوع الشاشة", label_ar: "الشاشة", kind: "text" }),
    ]);

    expect(variantAxisLabel("نوع الشاشة", registry)).toBe("الشاشة");
  });

  it("promotes a text axis to a size axis, ranking included", () => {
    // The point of the table: this needed a deploy before.
    const registry = mergeAxisRegistry([
      row({ key: "عدد الأبواب", label_ar: "عدد الأبواب", kind: "size" }),
    ]);

    expect(variantAxisKind("عدد الأبواب", registry)).toBe("size");
    expect(axisValueRank("عدد الأبواب", "4 أبواب", registry)).toBe(4);
    // Without the registry it is still an unranked text axis.
    expect(axisValueRank("عدد الأبواب", "4 أبواب")).toBeNull();
  });

  it("lets a row REMOVE a built-in schema property", () => {
    /*
     * Not `?? builtIn?.schemaProperty`. Claiming schema.org `size` for an axis
     * that is not a size is a wrong statement to Google, so an admin who
     * clears the column must actually be able to clear it.
     */
    const registry = mergeAxisRegistry([
      row({ key: "السعة", label_ar: "السعة", kind: "size", schema_property: null }),
    ]);

    expect(variantAxisSchemaProperty("السعة", registry)).toBeUndefined();
    expect(variantAxisSchemaProperty("السعة")).toBe("size");
  });

  it("rejects a kind the renderer does not know, rather than passing it on", () => {
    /*
     * `kind` is what VariantSelector switches on. An unrecognised string would
     * match no branch and render nothing, turning a data problem into a blank
     * product page — so it degrades to the built-in kind, then to text.
     */
    const withBuiltIn = mergeAxisRegistry([
      row({ key: "اللون", label_ar: "اللون", kind: "rainbow" }),
    ]);
    expect(variantAxisKind("اللون", withBuiltIn)).toBe("color");

    const withoutBuiltIn = mergeAxisRegistry([
      row({ key: "نوع الفرن", label_ar: "نوع الفرن", kind: "rainbow" }),
    ]);
    expect(variantAxisKind("نوع الفرن", withoutBuiltIn)).toBe("text");
  });

  it("rejects a schema property schema.org has no meaning for", () => {
    const registry = mergeAxisRegistry([
      row({ key: "نوع الفرن", label_ar: "نوع الفرن", schema_property: "grill" }),
    ]);
    expect(variantAxisSchemaProperty("نوع الفرن", registry)).toBeUndefined();
  });

  it("never renders an empty prompt for a blank label", () => {
    const registry = mergeAxisRegistry([
      row({ key: "نوع الفرن", label_ar: "   ", kind: "text" }),
    ]);
    expect(variantAxisLabel("نوع الفرن", registry)).toBe("نوع الفرن");
  });

  it("skips a row with no key", () => {
    const registry = mergeAxisRegistry([row({ key: "  " })]);
    expect(registry).toEqual(AXIS_REGISTRY);
  });
});

describe("axisSpecKeys", () => {
  it("offers the axis key first, then its aliases", () => {
    /*
     * The catalogue spells colour `الألوان` on 68 products and `اللون` on 7, so
     * "does the spec table agree with the switcher" cannot be answered by
     * looking at one key. Mirrors the SQL `axis_spec_keys()`.
     */
    expect(axisSpecKeys("اللون")).toEqual(["اللون", "الألوان"]);
    expect(axisSpecKeys("الألوان")).toEqual(["الألوان", "اللون"]);
  });

  it("returns just the key for an axis with no aliases", () => {
    expect(axisSpecKeys("نوع الشاشة")).toEqual(["نوع الشاشة"]);
    expect(axisSpecKeys("لم يُعرَّف")).toEqual(["لم يُعرَّف"]);
  });

  it("never repeats the key as its own alias", () => {
    const registry = mergeAxisRegistry([
      row({ key: "اللون", label_ar: "اللون", kind: "color", spec_aliases: ["اللون", "الألوان"] }),
    ]);
    expect(axisSpecKeys("اللون", registry)).toEqual(["اللون", "الألوان"]);
  });
});

describe("suggestedAxes", () => {
  it("orders by display_order, so a declared axis appears where the admin put it", () => {
    const registry = mergeAxisRegistry([
      row({ key: "عدد الأبواب", label_ar: "عدد الأبواب", display_order: 5 }),
    ]);

    expect(suggestedAxes(registry)[0]).toBe("عدد الأبواب");
    // The built-ins keep their relative order behind it.
    expect(suggestedAxes(registry)[1]).toBe("اللون");
  });

  it("is deterministic for axes with no order", () => {
    // No localeCompare anywhere in this path: ICU collation for Arabic differs
    // between the build server and the browser.
    const registry = mergeAxisRegistry([
      row({ key: "ب", label_ar: "ب" }),
      row({ key: "أ", label_ar: "أ" }),
    ]);
    const once = suggestedAxes(registry);
    expect(suggestedAxes(registry)).toEqual(once);
    expect(once.indexOf("أ")).toBeLessThan(once.indexOf("ب"));
  });
});
