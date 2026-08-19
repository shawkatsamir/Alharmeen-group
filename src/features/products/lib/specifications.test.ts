import { describe, expect, it } from "vitest";
import {
  countSpecs,
  groupSpecifications,
  pickSpecHighlights,
} from "./specifications";

describe("groupSpecifications", () => {
  it("returns an empty array for anything that is not a plain object", () => {
    expect(groupSpecifications(null)).toEqual([]);
    expect(groupSpecifications(undefined)).toEqual([]);
    expect(groupSpecifications({})).toEqual([]);
    expect(groupSpecifications([])).toEqual([]);
    expect(groupSpecifications("string")).toEqual([]);
    expect(groupSpecifications(42)).toEqual([]);
  });

  it("groups a real vacuum-cleaner spec set into labelled sections", () => {
    // Keys taken verbatim from the Tornado TVC-1600MD row.
    const groups = groupSpecifications({
      "النوع": "برميلية",
      "الضمان": "سنتان",
      "بلد المنشأ": "مصر",
      "موديل المنتج": "TVC-1600MD",
      "القدرة الكهربائية": "1600 وات",
      "قوة الشفط": "20 كيلو باسكال",
      "مستوى كفاءة الطاقة": "A",
      "الأبعاد - الطول": "40 سم",
      "الأبعاد - العرض": "28 سم",
      "الوزن الصافي": "5 كجم",
      "نوع الفلتر": "هيبا",
      "طول السلك": "5 متر",
    });

    const ids = groups.map((g) => g.id);
    expect(ids).toEqual(["general", "performance", "dimensions", "details"]);

    const byId = Object.fromEntries(groups.map((g) => [g.id, g]));
    expect(byId.general.label).toBe("معلومات عامة");
    expect(byId.general.entries.map((e) => e.key)).toEqual([
      "النوع",
      "الضمان",
      "بلد المنشأ",
      "موديل المنتج",
    ]);
    expect(byId.dimensions.entries.map((e) => e.key)).toEqual([
      "الأبعاد - الطول",
      "الأبعاد - العرض",
      "الوزن الصافي",
    ]);
    expect(byId.details.entries.map((e) => e.key)).toEqual([
      "نوع الفلتر",
      "طول السلك",
    ]);
  });

  it("routes protection keys to safety rather than performance", () => {
    // "حماية ضغط المياه" contains a performance-ish word; safety must win.
    const groups = groupSpecifications({
      "حماية ضغط المياه": "نعم",
      "حماية الاحتراق الجاف": "نعم",
      "قفل ضد عبث الأطفال": "نعم",
      "الفصل التلقائي": "نعم",
      "القدرة الكهربائية": "1000 وات",
    });

    const byId = Object.fromEntries(groups.map((g) => [g.id, g]));
    expect(byId.safety.entries).toHaveLength(4);
    expect(byId.performance.entries.map((e) => e.key)).toEqual([
      "القدرة الكهربائية",
    ]);
  });

  it("handles the one row entered with English snake_case keys", () => {
    const groups = groupSpecifications({
      color: "استانلس",
      doors: "2",
      origin: "مصر",
      capacity_liters: "396",
      cooling_system: "نوفروست",
      energy_efficiency: "A+",
    });

    const all = groups.flatMap((g) => g.entries);
    const labels = Object.fromEntries(all.map((e) => [e.key, e.label]));
    expect(labels.color).toBe("اللون");
    expect(labels.capacity_liters).toBe("السعة (لتر)");
    expect(labels.energy_efficiency).toBe("مستوى كفاءة الطاقة");
    // `doors` has no translation, so it falls back to a humanized key.
    expect(labels.doors).toBe("عدد الأبواب");
  });

  it("humanizes an unknown English key instead of dropping it", () => {
    const groups = groupSpecifications({ some_new_field: "قيمة" });
    expect(groups[0].entries[0]).toMatchObject({
      key: "some_new_field",
      label: "some new field",
      value: "قيمة",
    });
  });

  it("drops keys whose value is empty, so no blank rows render", () => {
    const groups = groupSpecifications({
      "النوع": "برميلية",
      "الضمان": "",
      "بلد المنشأ": null,
      "الوزن الصافي": "   ",
    });
    expect(countSpecs(groups)).toBe(1);
    expect(groups[0].entries[0].key).toBe("النوع");
  });

  it("renders booleans as Arabic yes/no", () => {
    const groups = groupSpecifications({
      "قفل ضد عبث الأطفال": true,
      "إنذار صوتي": false,
    });
    const values = groups[0].entries.map((e) => e.value);
    expect(values).toEqual(["نعم", "لا"]);
  });

  it("flattens array and object values rather than printing [object Object]", () => {
    const groups = groupSpecifications({
      "الملحقات": ["فرشاة", "خرطوم"],
      "الأبعاد": { width: "60", height: "85" },
    });
    const all = groups.flatMap((g) => g.entries);
    expect(all.find((e) => e.key === "الملحقات")?.value).toBe("فرشاة، خرطوم");
    expect(all.find((e) => e.key === "الأبعاد")?.value).toContain("width: 60");
  });

  it("puts everything in the catch-all when nothing matches a rule", () => {
    const groups = groupSpecifications({ "خاصية غريبة": "قيمة" });
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe("details");
    expect(groups[0].label).toBe("المواصفات التفصيلية");
  });

  it("scales from a 13-key product to a 48-key product with the same rules", () => {
    const thin = groupSpecifications({
      "النوع": "أ",
      "الضمان": "ب",
      "السعة": "ج",
    });
    expect(thin.length).toBeGreaterThan(0);
    expect(thin.length).toBeLessThanOrEqual(5);

    const wide: Record<string, string> = {};
    for (let i = 0; i < 48; i++) wide[`حماية رقم ${i}`] = "نعم";
    const fat = groupSpecifications(wide);
    expect(fat).toHaveLength(1);
    expect(countSpecs(fat)).toBe(48);
  });
});

describe("countSpecs", () => {
  it("sums entries across groups", () => {
    expect(countSpecs([])).toBe(0);
    expect(
      countSpecs(
        groupSpecifications({ "النوع": "أ", "الوزن الصافي": "ب", "س": "ج" }),
      ),
    ).toBe(3);
  });
});

describe("pickSpecHighlights", () => {
  it("returns an empty array when there is nothing to show", () => {
    expect(pickSpecHighlights(null)).toEqual([]);
    expect(pickSpecHighlights({})).toEqual([]);
  });

  it("picks priority keys in priority order, not insertion order", () => {
    const picked = pickSpecHighlights({
      "بلد المنشأ": "مصر",
      "النوع": "أوتوماتيك",
      "السعة": "8 كجم",
      "معدل الدوران": "1400 لفة",
    });
    expect(picked.map((e) => e.key)).toEqual([
      "السعة",
      "معدل الدوران",
      "النوع",
      "بلد المنشأ",
    ]);
  });

  it("respects the limit", () => {
    const picked = pickSpecHighlights(
      { "السعة": "أ", "معدل الدوران": "ب", "النوع": "ج", "بلد المنشأ": "د" },
      2,
    );
    expect(picked).toHaveLength(2);
    expect(picked.map((e) => e.key)).toEqual(["السعة", "معدل الدوران"]);
  });

  it("skips priority keys the product does not have", () => {
    const picked = pickSpecHighlights({ "النوع": "برميلية" });
    expect(picked.map((e) => e.key)).toEqual(["النوع"]);
  });

  it("returns nothing when the product has only non-priority keys", () => {
    expect(pickSpecHighlights({ "طول السلك": "5 متر" })).toEqual([]);
  });
});
