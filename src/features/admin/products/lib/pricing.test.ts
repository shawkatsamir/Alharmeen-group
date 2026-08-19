import { describe, expect, it } from "vitest";
import { normalizeOfferPricing, toOfferFormValues } from "./pricing";

const unwrap = (result: ReturnType<typeof normalizeOfferPricing>) => {
  if (!result.ok) throw new Error(`expected ok, got: ${result.message}`);
  return result.value;
};

describe("normalizeOfferPricing", () => {
  it("stores the plain price and clears the offer columns when the offer is off", () => {
    expect(
      unwrap(normalizeOfferPricing({ basePrice: 10000, offerEnabled: false })),
    ).toEqual({
      price: 10000,
      old_price: null,
      sale_end_date: null,
      is_special_offer: false,
    });
  });

  it("clears leftover offer input when the offer is switched off", () => {
    // The form keeps the sale fields mounted; switching the toggle off must not
    // leave a stale old_price behind, which would show a phantom discount.
    expect(
      unwrap(
        normalizeOfferPricing({
          basePrice: 10000,
          offerEnabled: false,
          salePrice: 8000,
          saleEndDate: "2027-01-01T00:00:00.000Z",
        }),
      ),
    ).toEqual({
      price: 10000,
      old_price: null,
      sale_end_date: null,
      is_special_offer: false,
    });
  });

  it("puts the discounted price in `price` and the original in `old_price`", () => {
    // This is the direction the storefront depends on; inverting it turns every
    // discount badge into a price increase.
    expect(
      unwrap(
        normalizeOfferPricing({
          basePrice: 10000,
          offerEnabled: true,
          salePrice: 8000,
          saleEndDate: "2027-01-01T00:00:00.000Z",
        }),
      ),
    ).toEqual({
      price: 8000,
      old_price: 10000,
      sale_end_date: "2027-01-01T00:00:00.000Z",
      is_special_offer: true,
    });
  });

  it("sets is_special_offer with the offer, since /offers selects on that flag alone", () => {
    const value = unwrap(
      normalizeOfferPricing({ basePrice: 100, offerEnabled: true, salePrice: 80 }),
    );
    expect(value.is_special_offer).toBe(true);
    expect(value.sale_end_date).toBeNull();
  });

  it("treats a blank end date as open-ended", () => {
    const value = unwrap(
      normalizeOfferPricing({
        basePrice: 100,
        offerEnabled: true,
        salePrice: 80,
        saleEndDate: "   ",
      }),
    );
    expect(value.sale_end_date).toBeNull();
  });

  it("rejects a sale price that is not below the base price", () => {
    expect(
      normalizeOfferPricing({ basePrice: 100, offerEnabled: true, salePrice: 100 }),
    ).toEqual({ ok: false, message: "سعر العرض يجب أن يكون أقل من السعر الأصلي" });

    expect(
      normalizeOfferPricing({ basePrice: 100, offerEnabled: true, salePrice: 120 }),
    ).toEqual({ ok: false, message: "سعر العرض يجب أن يكون أقل من السعر الأصلي" });
  });

  it("requires a sale price when the offer is enabled", () => {
    expect(
      normalizeOfferPricing({ basePrice: 100, offerEnabled: true }),
    ).toEqual({ ok: false, message: "سعر العرض مطلوب عند تفعيل العرض" });

    expect(
      normalizeOfferPricing({ basePrice: 100, offerEnabled: true, salePrice: null }),
    ).toEqual({ ok: false, message: "سعر العرض مطلوب عند تفعيل العرض" });
  });

  it("rejects a non-positive base price", () => {
    expect(normalizeOfferPricing({ basePrice: 0, offerEnabled: false }).ok).toBe(false);
    expect(normalizeOfferPricing({ basePrice: -5, offerEnabled: false }).ok).toBe(false);
    expect(normalizeOfferPricing({ basePrice: NaN, offerEnabled: false }).ok).toBe(false);
  });

  it("rejects a non-positive sale price", () => {
    expect(
      normalizeOfferPricing({ basePrice: 100, offerEnabled: true, salePrice: 0 }).ok,
    ).toBe(false);
  });
});

describe("toOfferFormValues", () => {
  it("round-trips a product that is on offer", () => {
    expect(
      toOfferFormValues({
        price: 8000,
        old_price: 10000,
        sale_end_date: "2027-01-01T00:00:00.000Z",
        is_special_offer: true,
      }),
    ).toEqual({
      basePrice: 10000,
      offerEnabled: true,
      salePrice: 8000,
      saleEndDate: "2027-01-01T00:00:00.000Z",
    });
  });

  it("round-trips a product that is not on offer", () => {
    expect(
      toOfferFormValues({
        price: 10000,
        old_price: null,
        sale_end_date: null,
        is_special_offer: false,
      }),
    ).toEqual({
      basePrice: 10000,
      offerEnabled: false,
      salePrice: null,
      saleEndDate: null,
    });
  });

  it("trusts old_price over the flag", () => {
    // is_special_offer can be toggled on its own in the Supabase table editor,
    // leaving no discount to show. The form should open with the offer off
    // rather than with an empty sale price.
    expect(
      toOfferFormValues({
        price: 10000,
        old_price: null,
        sale_end_date: null,
        is_special_offer: true,
      }).offerEnabled,
    ).toBe(false);
  });

  it("ignores an old_price that is not actually a discount", () => {
    expect(
      toOfferFormValues({
        price: 10000,
        old_price: 9000,
        sale_end_date: null,
        is_special_offer: false,
      }),
    ).toEqual({
      basePrice: 10000,
      offerEnabled: false,
      salePrice: null,
      saleEndDate: null,
    });
  });

  it("survives a full round trip through normalizeOfferPricing", () => {
    const stored = unwrap(
      normalizeOfferPricing({
        basePrice: 12500,
        offerEnabled: true,
        salePrice: 9999,
        saleEndDate: "2027-03-01T00:00:00.000Z",
      }),
    );
    expect(toOfferFormValues(stored)).toEqual({
      basePrice: 12500,
      offerEnabled: true,
      salePrice: 9999,
      saleEndDate: "2027-03-01T00:00:00.000Z",
    });
  });
});
