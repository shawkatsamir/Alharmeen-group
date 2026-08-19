import { describe, expect, it } from "vitest";
import { isValidSlug, slugify, slugifyProduct, withSlugSuffix } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates Latin text", () => {
    expect(slugify("Hoover Vacuum Cleaner 2200 Watt")).toBe(
      "hoover-vacuum-cleaner-2200-watt",
    );
  });

  it("collapses runs of punctuation into a single hyphen and trims the ends", () => {
    expect(slugify("  Sharp -- SJ/PC48A (ST)!  ")).toBe("sharp-sj-pc48a-st");
  });

  it("strips Latin diacritics rather than dropping the letter", () => {
    expect(slugify("Café Crème")).toBe("cafe-creme");
  });

  it("returns an empty string for Arabic-only input", () => {
    // Arabic contains no [a-z0-9], so it collapses away entirely. Callers must
    // fall back to the SKU rather than saving an empty slug.
    expect(slugify("سخان مياه تورنيدو")).toBe("");
  });

  it("is empty for nullish input", () => {
    expect(slugify(null)).toBe("");
    expect(slugify(undefined)).toBe("");
    expect(slugify("")).toBe("");
  });
});

describe("slugifyProduct", () => {
  it("reproduces the convention used by the existing catalog", () => {
    expect(
      slugifyProduct({
        nameEn: "Hoover Vacuum Cleaner 2200 Watt HEPA Filter Black",
        sku: "TTELA2200PRE",
      }),
    ).toBe("hoover-vacuum-cleaner-2200-watt-hepa-filter-black-ttela2200pre");

    expect(
      slugifyProduct({
        nameEn: "Sharp Pail Can Vacuum Cleaner 1800 Watt Blue Color Cloth Filter",
        sku: "EC-CA1820-X",
      }),
    ).toBe(
      "sharp-pail-can-vacuum-cleaner-1800-watt-blue-color-cloth-filter-ec-ca1820-x",
    );
  });

  it("falls back to the SKU when there is no English name", () => {
    // 65 of 75 catalog rows have no name_en.
    expect(slugifyProduct({ nameEn: null, sku: "GH-MP10SN-W" })).toBe(
      "gh-mp10sn-w",
    );
  });

  it("falls back to the SKU when the name is Arabic", () => {
    expect(
      slugifyProduct({ nameEn: "سخان مياه تورنيدو", sku: "EWH-S55CSE-F" }),
    ).toBe("ewh-s55cse-f");
  });

  it("does not repeat a SKU that the English name already ends with", () => {
    expect(
      slugifyProduct({
        nameEn: "Hoover Vacuum Cleaner TTELA2200PRE",
        sku: "TTELA2200PRE",
      }),
    ).toBe("hoover-vacuum-cleaner-ttela2200pre");
  });

  it("uses the name alone when there is no SKU", () => {
    expect(slugifyProduct({ nameEn: "Midea Freezer", sku: "" })).toBe(
      "midea-freezer",
    );
  });

  it("returns an empty string when nothing is usable", () => {
    expect(slugifyProduct({ nameEn: "ثلاجة", sku: "" })).toBe("");
  });
});

describe("withSlugSuffix", () => {
  it("leaves the first attempt untouched", () => {
    expect(withSlugSuffix("midea-freezer", 1)).toBe("midea-freezer");
    expect(withSlugSuffix("midea-freezer", 0)).toBe("midea-freezer");
  });

  it("appends a deterministic counter so a retry produces the same slug", () => {
    expect(withSlugSuffix("midea-freezer", 2)).toBe("midea-freezer-2");
    expect(withSlugSuffix("midea-freezer", 3)).toBe("midea-freezer-3");
  });
});

describe("isValidSlug", () => {
  it("accepts the shape the catalog uses", () => {
    expect(isValidSlug("gh-mp10sn-w")).toBe(true);
    expect(isValidSlug("midea")).toBe(true);
  });

  it("rejects anything that would break the product URL", () => {
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("Midea-Freezer")).toBe(false); // uppercase
    expect(isValidSlug("midea freezer")).toBe(false); // space
    expect(isValidSlug("-midea")).toBe(false);
    expect(isValidSlug("midea-")).toBe(false);
    expect(isValidSlug("midea--freezer")).toBe(false);
    expect(isValidSlug("/midea")).toBe(false); // the leading-slash bug fixed in migration 20260818121000
    expect(isValidSlug("ثلاجة")).toBe(false);
  });
});
