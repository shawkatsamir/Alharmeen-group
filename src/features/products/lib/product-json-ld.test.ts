import { describe, expect, it } from "vitest";
import { buildProductJsonLd } from "./product-json-ld";
import type { Product, ProductGroup, VariantSibling } from "../types";

const BASE = "https://alharmaingroup.com";

const GROUP = {
  id: "grp-sj58c",
  name_ar: "ثلاجة شارب نوفروست 450 لتر",
  name_en: null,
  axes: ["اللون"],
  created_at: "",
  updated_at: "",
} satisfies ProductGroup;

function sibling(
  sku: string,
  slug: string,
  color: string,
  price: number,
  overrides: Partial<VariantSibling> = {},
): VariantSibling {
  return {
    id: sku,
    slug,
    name_ar: `ثلاجة شارب نوفروست 450 لتر ${color} ${sku}`,
    sku,
    price,
    old_price: null,
    is_available: true,
    is_active: true,
    stock_quantity: 5,
    group_id: GROUP.id,
    is_group_primary: false,
    variant_values: { اللون: color },
    images: [{ image_url: `${slug}.jpg`, is_primary: true, alt_text_ar: null }],
    ...overrides,
  };
}

const SIBLINGS: VariantSibling[] = [
  sibling("SJ-58C(ST)", "sharp-450-st", "استانلس", 28000, {
    is_group_primary: true,
  }),
  sibling("SJ-58C(SL)", "sharp-450-sl", "سيلفر", 29420),
  sibling("SJ-58C(BK)", "sharp-450-bk", "أسود", 31600),
];

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "SJ-58C(ST)",
    sku: "SJ-58C(ST)",
    slug: "sharp-450-st",
    name_ar: "ثلاجة شارب نوفروست 450 لتر استانلس SJ-58C(ST)",
    price: 28000,
    old_price: null,
    sale_end_date: null,
    is_available: true,
    stock_quantity: 5,
    group_id: GROUP.id,
    is_group_primary: true,
    variant_values: { اللون: "استانلس" },
    specifications: { السعة: "450 لتر", الضمان: "5 سنوات" },
    images: [{ image_url: "st.jpg", is_primary: true }],
    brand: { name_ar: "شارب" },
    group: GROUP,
    ...overrides,
  } as unknown as Product;
}

describe("buildProductJsonLd — ungrouped product", () => {
  const jsonLd = buildProductJsonLd({
    product: product({ group_id: null, group: null, is_group_primary: false }),
    siblings: [],
    baseUrl: BASE,
    description: "وصف",
  });

  it("emits a plain Product with no group markup", () => {
    expect(jsonLd["@type"]).toBe("Product");
    expect(jsonLd).not.toHaveProperty("inProductGroupWithID");
    expect(jsonLd).not.toHaveProperty("hasVariant");
  });

  it("carries offers with condition and a self URL", () => {
    expect(jsonLd.offers).toMatchObject({
      "@type": "Offer",
      price: 28000,
      priceCurrency: "EGP",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      url: `${BASE}/product/sharp-450-st`,
    });
  });

  it("omits priceValidUntil rather than inventing one", () => {
    expect(jsonLd.offers).not.toHaveProperty("priceValidUntil");
  });

  it("includes priceValidUntil when the shop set a sale end date", () => {
    const withSale = buildProductJsonLd({
      product: product({ group_id: null, group: null, sale_end_date: "2026-09-01" }),
      siblings: [],
      baseUrl: BASE,
      description: "وصف",
    });
    expect(withSale.offers).toMatchObject({ priceValidUntil: "2026-09-01" });
  });
});

describe("buildProductJsonLd — group primary", () => {
  const jsonLd = buildProductJsonLd({
    product: product(),
    siblings: SIBLINGS,
    baseUrl: BASE,
    description: "وصف المجموعة",
  });

  it("emits ProductGroup carrying every variant", () => {
    expect(jsonLd["@type"]).toBe("ProductGroup");
    expect(jsonLd.productGroupID).toBe(GROUP.id);
    expect(jsonLd.name).toBe(GROUP.name_ar);
    expect(jsonLd.hasVariant).toHaveLength(3);
  });

  it("declares what varies, using schema.org property names", () => {
    expect(jsonLd.variesBy).toEqual(["color"]);
  });

  it("gives each variant its own url, sku, colour and offer", () => {
    const variants = jsonLd.hasVariant as Record<string, unknown>[];
    expect(variants.map((v) => v.color)).toEqual(["استانلس", "سيلفر", "أسود"]);
    expect(variants.map((v) => v.url)).toEqual([
      `${BASE}/product/sharp-450-st`,
      `${BASE}/product/sharp-450-sl`,
      `${BASE}/product/sharp-450-bk`,
    ]);
    // The primary's own Product lives inside hasVariant, so its offer must
    // survive there rather than being dropped in favour of the group node.
    expect(variants[0].offers).toMatchObject({ price: 28000 });
    expect(variants[2].offers).toMatchObject({ price: 31600 });
  });

  it("marks an out-of-stock variant as such without dropping it", () => {
    const withSoldOut = buildProductJsonLd({
      product: product(),
      siblings: [
        SIBLINGS[0],
        sibling("SJ-58C(BK)", "sharp-450-bk", "أسود", 31600, {
          stock_quantity: 0,
        }),
      ],
      baseUrl: BASE,
      description: "وصف",
    });
    const variants = withSoldOut.hasVariant as Record<string, unknown>[];
    expect(variants).toHaveLength(2);
    expect(variants[1].offers).toMatchObject({
      availability: "https://schema.org/OutOfStock",
    });
  });
});

describe("buildProductJsonLd — non-primary variant", () => {
  const jsonLd = buildProductJsonLd({
    product: product({
      id: "SJ-58C(BK)",
      sku: "SJ-58C(BK)",
      slug: "sharp-450-bk",
      is_group_primary: false,
      variant_values: { اللون: "أسود" },
      price: 31600,
    }),
    siblings: SIBLINGS,
    baseUrl: BASE,
    description: "وصف",
  });

  it("stays a Product and points at its group", () => {
    expect(jsonLd["@type"]).toBe("Product");
    expect(jsonLd.inProductGroupWithID).toBe(GROUP.id);
    // Only the primary carries the group node, or every variant page would
    // claim to be the group.
    expect(jsonLd).not.toHaveProperty("hasVariant");
  });

  it("carries its own varying property", () => {
    expect(jsonLd.color).toBe("أسود");
  });

  it("keeps a self-referential url — siblings are not canonicalised away", () => {
    expect(jsonLd.url).toBe(`${BASE}/product/sharp-450-bk`);
  });
});

describe("buildProductJsonLd — edge cases", () => {
  it("emits no group markup when the group has only one active member", () => {
    // getVariantSiblings already collapses these to [], but a group of one must
    // never announce a variant relationship that does not exist.
    const jsonLd = buildProductJsonLd({
      product: product(),
      siblings: [SIBLINGS[0]],
      baseUrl: BASE,
      description: "وصف",
    });
    expect(jsonLd["@type"]).toBe("Product");
    expect(jsonLd).not.toHaveProperty("inProductGroupWithID");
  });

  it("drops variesBy for an axis Google does not understand", () => {
    const jsonLd = buildProductJsonLd({
      product: product({
        group: { ...GROUP, axes: ["موديل المنتج"] },
        variant_values: { "موديل المنتج": "SJ-58C" },
      }),
      siblings: SIBLINGS,
      baseUrl: BASE,
      description: "وصف",
    });
    // `model` is a real schema.org property but not a supported variesBy value.
    expect(jsonLd).not.toHaveProperty("variesBy");
    expect(jsonLd["@type"]).toBe("ProductGroup");
  });

  it("maps a size axis so screens and capacities are not left unmarked", () => {
    const jsonLd = buildProductJsonLd({
      product: product({
        group: { ...GROUP, axes: ["المقاس"] },
        variant_values: { المقاس: "43 بوصة" },
      }),
      siblings: [
        sibling("TV-43", "tv-43", "x", 12000, {
          variant_values: { المقاس: "43 بوصة" },
        }),
        sibling("TV-55", "tv-55", "x", 18000, {
          variant_values: { المقاس: "55 بوصة" },
        }),
      ],
      baseUrl: BASE,
      description: "وصف",
    });
    expect(jsonLd.variesBy).toEqual(["size"]);
    const variants = jsonLd.hasVariant as Record<string, unknown>[];
    expect(variants.map((v) => v.size)).toEqual(["43 بوصة", "55 بوصة"]);
  });

  it("states an unmapped axis as a PropertyValue rather than emitting nothing", () => {
    /*
     * The real Midea microwave case: two variants differing only by a grill.
     * schema.org has no property for that, so without this every hasVariant
     * entry would differ by name/sku/url alone — the exact "unlinked and
     * unmarked" state this file exists to prevent.
     */
    const grillGroup = { ...GROUP, axes: ["نوع الشواية"] };
    const jsonLd = buildProductJsonLd({
      product: product({
        group: grillGroup,
        variant_values: { "نوع الشواية": "بشواية" },
        specifications: null,
      }),
      siblings: [
        sibling("EG0P042MX-S", "midea-grill", "x", 7100, {
          variant_values: { "نوع الشواية": "بشواية" },
        }),
        sibling("EM0P042MX-S", "midea-plain", "x", 6600, {
          variant_values: { "نوع الشواية": "بدون شواية" },
        }),
      ],
      baseUrl: BASE,
      description: "وصف",
    });

    expect(jsonLd).not.toHaveProperty("variesBy");
    const variants = jsonLd.hasVariant as Record<string, unknown>[];
    expect(variants[0].additionalProperty).toEqual([
      { "@type": "PropertyValue", name: "نوع الشواية", value: "بشواية" },
    ]);
    expect(variants[1].additionalProperty).toEqual([
      { "@type": "PropertyValue", name: "نوع الشواية", value: "بدون شواية" },
    ]);
  });

  it("does not state an axis twice when it is also a spec row", () => {
    const jsonLd = buildProductJsonLd({
      product: product({
        group_id: null,
        group: { ...GROUP, axes: ["نوع الشواية"] },
        variant_values: { "نوع الشواية": "بشواية" },
        specifications: { "نوع الشواية": "بشواية", السعة: "32 لتر" },
      }),
      siblings: [],
      baseUrl: BASE,
      description: "وصف",
    });
    const names = (jsonLd.additionalProperty as { name: string }[]).map(
      (p) => p.name,
    );
    expect(names).toEqual(["نوع الشواية", "السعة"]);
  });

  it("survives specifications that are not an object", () => {
    for (const specifications of [null, "text", ["a"], 42]) {
      const jsonLd = buildProductJsonLd({
        product: product({
          group_id: null,
          group: null,
          specifications: specifications as never,
        }),
        siblings: [],
        baseUrl: BASE,
        description: "وصف",
      });
      expect(jsonLd.additionalProperty).toBeUndefined();
    }
  });

  it("drops blank specification values instead of emitting empty properties", () => {
    const jsonLd = buildProductJsonLd({
      product: product({
        group_id: null,
        group: null,
        specifications: { السعة: "450 لتر", اللون: "   ", النوع: "" },
      }),
      siblings: [],
      baseUrl: BASE,
      description: "وصف",
    });
    expect(jsonLd.additionalProperty).toEqual([
      { "@type": "PropertyValue", name: "السعة", value: "450 لتر" },
    ]);
  });

  it("falls back to the product name when the group has none", () => {
    const jsonLd = buildProductJsonLd({
      product: product({ group: { ...GROUP, name_ar: "   " } }),
      siblings: SIBLINGS,
      baseUrl: BASE,
      description: "وصف",
    });
    expect(jsonLd.name).toBe("ثلاجة شارب نوفروست 450 لتر استانلس SJ-58C(ST)");
  });
});
