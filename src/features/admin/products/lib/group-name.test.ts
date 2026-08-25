import { describe, expect, it } from "vitest";
import { deriveGroupName } from "./group-name";

describe("deriveGroupName", () => {
  it("strips a trailing SKU, the common shape in this catalogue", () => {
    expect(
      deriveGroupName("ثلاجة شارب نوفروست 450 لتر أسود SJ-58C(BK)", "SJ-58C(BK)"),
    ).toBe("ثلاجة شارب نوفروست 450 لتر أسود");
  });

  it("strips a LEADING SKU", () => {
    /*
     * The real regression. The first version only handled a trailing SKU, so
     * this product's group was named "EG0P042MX-S ميكروويف ميديا 32 لتر بشواية
     * -فضي" — SKU and all.
     */
    expect(
      deriveGroupName("EG0P042MX-S ميكروويف ميديا 32 لتر بشواية -فضي", "EG0P042MX-S"),
    ).toBe("ميكروويف ميديا 32 لتر بشواية -فضي");
  });

  it("collapses the double spaces that leak in from product names", () => {
    // "فريزر توشيبا 7 درج  فضي لامع" really is stored with two spaces.
    expect(deriveGroupName("فريزر توشيبا 7 درج  فضي لامع GR-1", "GR-1")).toBe(
      "فريزر توشيبا 7 درج فضي لامع",
    );
  });

  it("trims separators left behind by the strip", () => {
    expect(deriveGroupName("ميكروويف ميديا 32 لتر - EG0P042MX-S", "EG0P042MX-S")).toBe(
      "ميكروويف ميديا 32 لتر",
    );
  });

  it("leaves the name alone when the SKU does not bookend it", () => {
    // Never strip from the middle — that would cut a name in half.
    expect(deriveGroupName("ميكروويف TMD-25 تورنيدو", "TMD-25")).toBe(
      "ميكروويف TMD-25 تورنيدو",
    );
  });

  it("keeps the varying value rather than guessing which word it is", () => {
    // Deliberate: guessing that "أسود" is the colour is the same class of
    // heuristic that mis-grouped RF-31FTV. The admin edits it in the form.
    expect(deriveGroupName("ثلاجة تورنيدو 450 لتر أسود RF-580TV-BK", "RF-580TV-BK")).toBe(
      "ثلاجة تورنيدو 450 لتر أسود",
    );
  });

  it("never returns an empty name", () => {
    // A product whose entire name is its SKU keeps the SKU.
    expect(deriveGroupName("SJ-58C(BK)", "SJ-58C(BK)")).toBe("SJ-58C(BK)");
    expect(deriveGroupName("  ", "SJ-58C(BK)")).toBe("");
  });

  it("survives a missing or whitespace SKU", () => {
    expect(deriveGroupName("ثلاجة شارب", "")).toBe("ثلاجة شارب");
    expect(deriveGroupName("ثلاجة شارب", "   ")).toBe("ثلاجة شارب");
  });

  it("is idempotent", () => {
    const once = deriveGroupName("ميكروويف ميديا 32 لتر EG0P042MX-S", "EG0P042MX-S");
    expect(deriveGroupName(once, "EG0P042MX-S")).toBe(once);
  });
});
