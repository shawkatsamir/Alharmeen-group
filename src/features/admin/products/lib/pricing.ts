/**
 * Offer pricing normalization.
 *
 * `products.price` is the **effective** price a customer pays, and
 * `products.old_price` is the pre-offer price shown struck through. That is the
 * opposite of what the column names suggest, and getting it backwards silently
 * inverts every discount badge on the storefront.
 *
 * The rules used to live inline in `UpdateProductModal.tsx`, guarded by
 * `alert()`. They are lifted here so the create page, the edit page and the
 * server action all agree, and so they can be unit-tested.
 *
 * Three fields move together and must never drift apart:
 *
 *   offer off -> price = base, old_price = null, sale_end_date = null,
 *                is_special_offer = false
 *   offer on  -> price = sale, old_price = base, sale_end_date = chosen date,
 *                is_special_offer = true
 *
 * `is_special_offer` is not independent: `getOffers()` in
 * `services/server/products.ts` selects purely on that flag, so a product with a
 * struck-through price but the flag unset would never appear on `/offers`, and a
 * product with the flag set but no `old_price` would appear there showing no
 * discount at all.
 *
 * Import-free by design so it can be unit-tested with no mocks.
 */

export interface OfferPricingInput {
  /** The normal, non-discounted price. */
  basePrice: number;
  /** Whether the offer section is switched on in the form. */
  offerEnabled: boolean;
  /** The discounted price customers pay while the offer runs. */
  salePrice?: number | null;
  /** ISO timestamp, or null for an open-ended offer. */
  saleEndDate?: string | null;
}

/** The four columns this helper owns. Spread straight into the DB payload. */
export interface OfferPricing {
  price: number;
  old_price: number | null;
  sale_end_date: string | null;
  is_special_offer: boolean;
}

export type OfferPricingResult =
  | { ok: true; value: OfferPricing }
  | { ok: false; message: string };

export function normalizeOfferPricing({
  basePrice,
  offerEnabled,
  salePrice,
  saleEndDate,
}: OfferPricingInput): OfferPricingResult {
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return { ok: false, message: "السعر يجب أن يكون رقماً موجباً" };
  }

  if (!offerEnabled) {
    return {
      ok: true,
      value: {
        price: basePrice,
        old_price: null,
        sale_end_date: null,
        is_special_offer: false,
      },
    };
  }

  if (salePrice === null || salePrice === undefined || !Number.isFinite(salePrice)) {
    return { ok: false, message: "سعر العرض مطلوب عند تفعيل العرض" };
  }

  if (salePrice <= 0) {
    return { ok: false, message: "سعر العرض يجب أن يكون رقماً موجباً" };
  }

  if (salePrice >= basePrice) {
    return { ok: false, message: "سعر العرض يجب أن يكون أقل من السعر الأصلي" };
  }

  return {
    ok: true,
    value: {
      price: salePrice,
      old_price: basePrice,
      sale_end_date: saleEndDate?.trim() ? saleEndDate : null,
      is_special_offer: true,
    },
  };
}

/**
 * Inverse of `normalizeOfferPricing`, for loading a stored product back into the
 * form. A product is on offer when it carries an `old_price` above its current
 * price — the flag alone is not trusted, since it can be toggled independently
 * in the table editor.
 */
export function toOfferFormValues(product: {
  price: number;
  old_price: number | null;
  sale_end_date: string | null;
  is_special_offer: boolean;
}): {
  basePrice: number;
  offerEnabled: boolean;
  salePrice: number | null;
  saleEndDate: string | null;
} {
  const hasDiscount =
    product.old_price !== null && product.old_price > product.price;

  if (!hasDiscount) {
    return {
      basePrice: product.price,
      offerEnabled: false,
      salePrice: null,
      saleEndDate: null,
    };
  }

  return {
    basePrice: product.old_price as number,
    offerEnabled: true,
    salePrice: product.price,
    saleEndDate: product.sale_end_date,
  };
}
