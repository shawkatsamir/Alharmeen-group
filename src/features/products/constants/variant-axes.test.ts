import { describe, expect, it } from "vitest";
import {
  AXIS_REGISTRY,
  CANONICAL_COLORS,
  COLOR_SWATCH_HEX,
  VARIANT_AXES,
  axisValueRank,
  canonicalizeColor,
  colorSwatchHex,
  findColorAxis,
  isSameColor,
  isVariantAxis,
  normalizeAxisValue,
  normalizeColorName,
  variantAxisKind,
  variantAxisLabel,
  variantAxisPrompt,
  variantAxisSchemaProperty,
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

  it("every suggested axis has a registry entry", () => {
    // Exhaustiveness lock: a suggestion the registry does not know would render
    // as an unlabelled pill in the admin picker.
    for (const axis of VARIANT_AXES) {
      expect(AXIS_REGISTRY[axis]).toBeDefined();
    }
  });
});

describe("axis kinds", () => {
  it("classifies colour, size and text axes", () => {
    expect(variantAxisKind("اللون")).toBe("color");
    expect(variantAxisKind("الألوان")).toBe("color");
    expect(variantAxisKind("المقاس")).toBe("size");
    expect(variantAxisKind("السعة")).toBe("size");
    expect(variantAxisKind("حجم الشاشة")).toBe("size");
    expect(variantAxisKind("نوع الشواية")).toBe("text");
  });

  it("defaults an unregistered axis to a readable text pill", () => {
    // The robustness contract: an axis nobody anticipated must never render as
    // a blank colour swatch.
    expect(variantAxisKind("عدد الأبواب")).toBe("text");
    expect(variantAxisKind("")).toBe("text");
    expect(variantAxisLabel("عدد الأبواب")).toBe("عدد الأبواب");
  });

  it("maps only axes with an honest schema.org property", () => {
    expect(variantAxisSchemaProperty("اللون")).toBe("color");
    expect(variantAxisSchemaProperty("المقاس")).toBe("size");
    expect(variantAxisSchemaProperty("موديل المنتج")).toBe("model");
    // No schema.org property describes a grill, so none is invented.
    expect(variantAxisSchemaProperty("نوع الشواية")).toBeUndefined();
    expect(variantAxisSchemaProperty("عدد الأبواب")).toBeUndefined();
  });

  it("finds the colour axis of a group, or reports none", () => {
    expect(findColorAxis(["اللون", "المقاس"])).toBe("اللون");
    expect(findColorAxis(["المقاس", "الألوان"])).toBe("الألوان");
    expect(findColorAxis(["نوع الشواية"])).toBeNull();
    expect(findColorAxis([])).toBeNull();
  });
});

describe("normalizeAxisValue — digits", () => {
  it("folds Arabic-Indic digits to ASCII", () => {
    expect(normalizeAxisValue("المقاس", "٤٣ بوصة")).toBe("43 بوصه");
    expect(normalizeAxisValue("المقاس", "٤٣")).toBe("43");
  });

  it("folds extended Arabic-Indic (Persian) digits to ASCII", () => {
    expect(normalizeAxisValue("المقاس", "۴۳ بوصة")).toBe("43 بوصه");
  });

  it("treats the three digit spellings of one size as one value", () => {
    const ascii = normalizeAxisValue("المقاس", "43 بوصة");
    expect(normalizeAxisValue("المقاس", "٤٣ بوصة")).toBe(ascii);
    expect(normalizeAxisValue("المقاس", "۴۳ بوصة")).toBe(ascii);
  });

  it("does not touch the Arabic punctuation between the two digit blocks", () => {
    /*
     * The character-class trap. A single range [٠-۹] spans U+0660–U+06F9 and
     * would swallow ٪ (U+066A), ٫ (U+066B) and a large slice of Arabic letters.
     * These must survive untouched.
     */
    expect(normalizeAxisValue("المقاس", "٪")).toBe("٪");
    expect(normalizeAxisValue("المقاس", "٫")).toBe("٫");
    expect(normalizeAxisValue("المقاس", "50٪ توفير")).toBe("50٪ توفير");
    expect(normalizeAxisValue("المقاس", "٢٫٥ لتر")).toBe("2٫5 لتر");
    // A letter from the middle of the gap (U+06A9, Persian kaf).
    expect(normalizeAxisValue("النوع", "ک")).toBe("ک");
  });
});

describe("normalizeAxisValue — Postgres contract", () => {
  /*
   * Every expected value here was produced by running
   * `public.normalize_axis_value('x', input)` against the live database on
   * 2026-08-25, and covers every distinct axis value currently stored plus the
   * edge cases. This is the contract between
   * src/features/products/constants/variant-axes.ts and
   * supabase/migrations/20260825090000_normalize_axis_value.sql.
   *
   * If one of these starts failing, the two implementations have drifted and
   * BOTH need fixing — and the unique index built on the SQL side needs a
   * REINDEX.
   */
  const CONTRACT: [input: string, sqlKey: string][] = [
    ["", ""],
    ["  أَسْوَد ", "اسود"],
    ["٫", "٫"],
    ["٪", "٪"],
    ["٢٫٥ لتر", "2٫5 لتر"],
    ["43 بوصة", "43 بوصه"],
    ["٤٣ بوصة", "43 بوصه"],
    ["۴۳ بوصة", "43 بوصه"],
    ["450", "450"],
    ["450 لتر", "450 لتر"],
    ["50٪ توفير", "50٪ توفير"],
    ["Silver", "silver"],
    ["أساسي", "اساسي"],
    ["أســود", "اسود"],
    ["أسود", "اسود"],
    ["أسود زجاجي", "اسود زجاجي"],
    ["استانلس", "استانلس"],
    ["استانلس\n\nغامق", "استانلس غامق"],
    ["استانلس غامق", "استانلس غامق"],
    ["بدون شواية", "بدون شوايه"],
    ["بشواية", "بشوايه"],
    ["رمادى غامق", "رمادي غامق"],
    ["رمادى فاتح", "رمادي فاتح"],
    ["سيلفر", "سيلفر"],
    ["سيلفر زجاجي", "سيلفر زجاجي"],
    ["ک", "ک"],
  ];

  it.each(CONTRACT)(
    "matches Postgres for %j",
    (input: string, sqlKey: string) => {
      expect(normalizeAxisValue("x", input)).toBe(sqlKey);
    },
  );
});

describe("normalizeColorName delegation", () => {
  it("delegates to normalizeAxisValue on the colour axis", () => {
    expect(normalizeColorName("أَسْوَد")).toBe(
      normalizeAxisValue("اللون", "أَسْوَد"),
    );
  });

  it("colour normalisation is unchanged for every known swatch", () => {
    // Regression lock: widening the normaliser with digit folding must not have
    // moved any existing colour key.
    const expected: Record<string, string> = {
      "أسود": "اسود",
      "أبيض": "ابيض",
      "أوف وايت": "اوف وايت",
      "سيلفر": "سيلفر",
      "استانلس": "استانلس",
      "استانلس غامق": "استانلس غامق",
      "اينوكس": "اينوكس",
      "رمادي": "رمادي",
      "كحلي": "كحلي",
    };
    for (const [input, key] of Object.entries(expected)) {
      expect(normalizeColorName(input)).toBe(key);
      expect(COLOR_SWATCH_HEX[key]).toBeDefined();
    }
  });
});

describe("axisValueRank", () => {
  it("ranks a size value by the number inside it", () => {
    expect(axisValueRank("المقاس", "43 بوصة")).toBe(43);
    expect(axisValueRank("السعة", "450 لتر")).toBe(450);
    expect(axisValueRank("السعة", "8 كجم")).toBe(8);
  });

  it("ranks Arabic-Indic and ASCII digits identically", () => {
    expect(axisValueRank("المقاس", "٤٣ بوصة")).toBe(
      axisValueRank("المقاس", "43 بوصة"),
    );
  });

  it("ranks a bare number and the same number with a unit the same", () => {
    // Real live data: SJ-58C(BK) says "450" while (ST) says "450 لتر".
    expect(axisValueRank("السعة", "450")).toBe(axisValueRank("السعة", "450 لتر"));
  });

  it("sorts numerically rather than lexicographically", () => {
    const values = ["100 لتر", "43 لتر", "55 لتر"];
    const sorted = [...values].sort(
      (a, b) => axisValueRank("السعة", a)! - axisValueRank("السعة", b)!,
    );
    expect(sorted).toEqual(["43 لتر", "55 لتر", "100 لتر"]);
  });

  it("returns null for a colour", () => {
    expect(axisValueRank("اللون", "أسود")).toBeNull();
  });

  it("does not read a model code as a number", () => {
    // Gated on axis kind, so "SJ-58C" is never ranked as 58.
    expect(axisValueRank("موديل المنتج", "SJ-58C")).toBeNull();
  });

  it("returns null for a size with no digits", () => {
    expect(axisValueRank("المقاس", "كبير")).toBeNull();
    expect(axisValueRank("المقاس", "")).toBeNull();
    expect(axisValueRank("المقاس", null)).toBeNull();
  });

  it("handles a decimal written with either separator", () => {
    expect(axisValueRank("السعة", "2.5 لتر")).toBe(2.5);
    expect(axisValueRank("السعة", "٢٫٥ لتر")).toBe(2.5);
  });
});
