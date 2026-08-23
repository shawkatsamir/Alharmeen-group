import { describe, expect, it } from "vitest";
import { productFormSchema, toProductRow } from "./schema";
import { emptyProductFormValues } from "./lib/form-defaults";
import type { ProductFormValues } from "./schema";

const GROUP_ID = "11111111-1111-4111-8111-111111111111";
const CATEGORY_ID = "22222222-2222-4222-8222-222222222222";
const BRAND_ID = "33333333-3333-4333-8333-333333333333";

function values(overrides: Partial<ProductFormValues> = {}): ProductFormValues {
  return {
    ...emptyProductFormValues(),
    name_ar: "ثلاجة شارب نوفروست 450 لتر أسود",
    sku: "SJ-58C(BK)",
    slug: "sharp-450-bk",
    category_id: CATEGORY_ID,
    brand_id: BRAND_ID,
    basePrice: 31600,
    ...overrides,
  };
}

function issuePaths(input: ProductFormValues): string[] {
  const parsed = productFormSchema.safeParse(input);
  return parsed.success
    ? []
    : parsed.error.issues.map((issue) => issue.path.join("."));
}

describe("variant group validation", () => {
  it("accepts a product with no group and no axis values", () => {
    expect(productFormSchema.safeParse(values()).success).toBe(true);
  });

  it("accepts a grouped product with an axis value", () => {
    const input = values({
      group_id: GROUP_ID,
      variant_values: [{ axis: "اللون", value: "أسود" }],
    });
    expect(productFormSchema.safeParse(input).success).toBe(true);
  });

  it("rejects a grouped product with no axis value", () => {
    /*
     * The failure that matters. `unique (group_id, variant_values)` treats
     * NULLs as distinct, so the database would happily accept two
     * indistinguishable members of one group — and both would render as
     * unlabelled swatches.
     */
    const input = values({ group_id: GROUP_ID, variant_values: [] });
    expect(issuePaths(input)).toContain("variant_values");
  });

  it("rejects a blank axis value on a grouped product", () => {
    const input = values({
      group_id: GROUP_ID,
      variant_values: [{ axis: "اللون", value: "   " }],
    });
    expect(issuePaths(input)).toContain("variant_values.0.value");
  });

  it("rejects axis values without a group", () => {
    const input = values({
      group_id: null,
      variant_values: [{ axis: "اللون", value: "أسود" }],
    });
    expect(issuePaths(input)).toContain("group_id");
  });

  it("rejects a duplicated axis, which would overwrite itself in jsonb", () => {
    const input = values({
      group_id: GROUP_ID,
      variant_values: [
        { axis: "اللون", value: "أسود" },
        { axis: "اللون", value: "سيلفر" },
      ],
    });
    expect(issuePaths(input)).toContain("variant_values.1.axis");
  });
});

describe("toProductRow — variant columns", () => {
  it("collapses axis rows into a jsonb object", () => {
    const row = toProductRow(
      values({
        group_id: GROUP_ID,
        variant_values: [
          { axis: "اللون", value: " أسود " },
          { axis: "السعة", value: "450 لتر" },
        ],
      }),
    );
    expect(row.group_id).toBe(GROUP_ID);
    expect(row.variant_values).toEqual({ اللون: "أسود", السعة: "450 لتر" });
  });

  it("writes null, not {}, for an ungrouped product", () => {
    // `{}` would make every ungrouped product collide on the partial unique
    // index over (group_id, variant_values).
    const row = toProductRow(values());
    expect(row.group_id).toBeNull();
    expect(row.variant_values).toBeNull();
  });

  it("writes null when a group is set but every value is blank", () => {
    const row = toProductRow(
      values({ group_id: GROUP_ID, variant_values: [{ axis: "اللون", value: "" }] }),
    );
    expect(row.variant_values).toBeNull();
  });

  it("leaves the value spelled exactly as typed", () => {
    // Canonicalisation is a nudge at the input, not a silent rewrite on save —
    // the admin sees stored what they wrote.
    const row = toProductRow(
      values({
        group_id: GROUP_ID,
        variant_values: [{ axis: "اللون", value: "فضي" }],
      }),
    );
    expect(row.variant_values).toEqual({ اللون: "فضي" });
  });
});
