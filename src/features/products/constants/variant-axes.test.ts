import { describe, expect, it } from "vitest";
import {
  CANONICAL_COLORS,
  VARIANT_AXES,
  canonicalizeColor,
  colorSwatchHex,
  isSameColor,
  isVariantAxis,
  normalizeColorName,
  variantAxisPrompt,
} from "./variant-axes";

/*
 * The expected values in "matches the Postgres normalize_color_name" were taken
 * from running the SQL function against the live database. They are the
 * contract between this file and
 * supabase/migrations/20260823090000_variant_data_hygiene.sql — if one of them
 * starts failing, the two implementations have drifted and BOTH need fixing.
 */
describe("normalizeColorName", () => {
  it("matches the Postgres normalize_color_name", () => {
    expect(normalizeColorName("  أَسْوَد ")).toBe("اسود");
    expect(normalizeColorName("اسود")).toBe("اسود");
    expect(normalizeColorName("سيلفر  زجاجي")).toBe("سيلفر زجاجي");
  });

  it("folds hamza forms, ta marbuta, alef maqsura and tatweel", () => {
    expect(normalizeColorName("أبيض")).toBe(normalizeColorName("ابيض"));
    expect(normalizeColorName("إينوكس")).toBe(normalizeColorName("اينوكس"));
    expect(normalizeColorName("آزرق")).toBe(normalizeColorName("ازرق"));
    expect(normalizeColorName("فضة")).toBe("فضه");
    expect(normalizeColorName("رمادى")).toBe("رمادي");
    expect(normalizeColorName("أســود")).toBe("اسود");
  });

  it("strips tashkeel so a vowelled paste still matches", () => {
    expect(isSameColor("أَسْوَد", "أسود")).toBe(true);
    expect(isSameColor("سِيلْفَر", "سيلفر")).toBe(true);
  });

  it("collapses whitespace including newlines and tabs", () => {
    // The catalogue really did hold SKUs ending in a newline; colours are
    // entered through the same paste-from-supplier-sheet route.
    expect(normalizeColorName("\n أسود \t")).toBe("اسود");
    expect(normalizeColorName("استانلس\n\nغامق")).toBe("استانلس غامق");
  });

  it("lowercases Latin colour names", () => {
    expect(normalizeColorName("Silver")).toBe("silver");
    expect(isSameColor("BLACK", "black")).toBe(true);
  });

  it("treats empty and nullish input as no colour", () => {
    expect(normalizeColorName(null)).toBe("");
    expect(normalizeColorName(undefined)).toBe("");
    expect(normalizeColorName("   ")).toBe("");
    // An absent colour must never equal another absent colour, or every
    // unpopulated variant would collide with every other one.
    expect(isSameColor(null, null)).toBe(false);
    expect(isSameColor("", "")).toBe(false);
  });
});

describe("canonicalizeColor", () => {
  it("folds the drifted spellings found in the catalogue", () => {
    expect(canonicalizeColor("اسود")).toBe("أسود");
    expect(canonicalizeColor("فضي")).toBe("سيلفر");
    expect(canonicalizeColor("استانلس ستيل")).toBe("استانلس");
  });

  it("keeps dark stainless distinct from plain stainless", () => {
    // RF-480TV and RF-580TV each sell both finishes. Folding these together
    // would collapse two real variants into one.
    expect(canonicalizeColor("استانلس غامق")).toBe("استانلس غامق");
    expect(isSameColor("استانلس غامق", "استانلس")).toBe(false);
  });

  it("leaves unrecognised colours alone but tidies whitespace", () => {
    expect(canonicalizeColor("  أوف   وايت ")).toBe("أوف وايت");
    expect(canonicalizeColor("اينوكس")).toBe("اينوكس");
    expect(canonicalizeColor("Rose Gold")).toBe("Rose Gold");
  });

  it("is idempotent", () => {
    for (const value of ["اسود", "فضي", "استانلس ستيل", "اينوكس", "أسود"]) {
      expect(canonicalizeColor(canonicalizeColor(value))).toBe(
        canonicalizeColor(value),
      );
    }
  });

  it("canonical targets are themselves canonical", () => {
    // Guards against an alias entry whose replacement is itself an alias, which
    // would make the fold order-dependent.
    for (const target of Object.values(CANONICAL_COLORS)) {
      expect(canonicalizeColor(target)).toBe(target);
    }
  });
});

describe("colorSwatchHex", () => {
  it("resolves through the alias map", () => {
    // "فضي" has no hex entry of its own; it must resolve via "سيلفر".
    expect(colorSwatchHex("فضي")).toBe(colorSwatchHex("سيلفر"));
    expect(colorSwatchHex("اسود")).toBe(colorSwatchHex("أسود"));
  });

  it("gives stainless and dark stainless different chips", () => {
    expect(colorSwatchHex("استانلس")).not.toBe(colorSwatchHex("استانلس غامق"));
  });

  it("returns null for an unknown colour rather than a wrong chip", () => {
    expect(colorSwatchHex("Rose Gold")).toBeNull();
    expect(colorSwatchHex(null)).toBeNull();
  });
});

describe("axes", () => {
  it("recognises the known axis keys", () => {
    expect(isVariantAxis("اللون")).toBe(true);
    expect(isVariantAxis("السعة")).toBe(true);
    expect(isVariantAxis("الضمان")).toBe(false);
    expect(isVariantAxis(null)).toBe(false);
  });

  it("prompts using the label, falling back to the raw key", () => {
    expect(variantAxisPrompt("اللون")).toBe("اختر اللون");
    expect(variantAxisPrompt("موديل المنتج")).toBe("اختر الموديل");
    expect(variantAxisPrompt("نوع التحميل")).toBe("اختر نوع التحميل");
  });

  it("lists colour first, since it is the axis the UI ships with", () => {
    expect(VARIANT_AXES[0]).toBe("اللون");
  });
});
