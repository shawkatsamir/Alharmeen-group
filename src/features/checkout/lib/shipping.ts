/**
 * Shipping cost arithmetic.
 *
 * Kept import-free so it can be unit-tested with zero mocks, and so the same
 * function runs on the server (authoritative, in checkout-actions.ts) and in
 * the browser (preview, in OrderSummary). If these two ever disagree the
 * customer is quoted one number and charged another, so there is exactly one
 * implementation.
 */

export interface ShippingQuote {
  /** What the customer pays for delivery, in EGP. */
  cost: number;
  /** True when a rate existed but the order qualified for free shipping. */
  isFree: boolean;
}

export function resolveShippingCost(params: {
  /** The governorate's configured rate. */
  rate: number;
  /** Order subtotal before shipping. */
  subtotal: number;
  /** Free above this subtotal; null disables the promotion. */
  freeShippingThreshold: number | null;
}): ShippingQuote {
  const { rate, subtotal, freeShippingThreshold } = params;

  const qualifiesForFree =
    freeShippingThreshold !== null &&
    freeShippingThreshold > 0 &&
    subtotal >= freeShippingThreshold;

  if (qualifiesForFree) {
    return { cost: 0, isFree: true };
  }

  // A negative rate can only come from bad data; never credit the customer.
  return { cost: Math.max(0, rate), isFree: rate <= 0 };
}

/**
 * Money is `numeric` in Postgres but `number` in TS, so round at the boundary
 * rather than letting float drift reach the database or the invoice.
 */
export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}
