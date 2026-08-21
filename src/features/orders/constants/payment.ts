/**
 * Single source of truth for payment status and payment methods.
 *
 * This module MIRRORS the database:
 *   - `orders_payment_status_check`   -> PAYMENT_STATUSES
 *   - `orders_payment_method_check`   -> PAYMENT_METHODS
 *   - `derive_payment_status()`       -> derivePaymentStatus()
 * See supabase/migrations/*_order_payments_ledger.sql.
 * If you change the rules here, change them there in the same commit.
 *
 * Keep this file free of imports, for the same reason order-status.ts is:
 * it is the zero-mock unit-test target (payment.test.ts). Icons live in
 * ./payment-icons.ts.
 *
 * ---------------------------------------------------------------------------
 * Two deliberate departures from the order-status convention:
 *
 * 1. Values are English tokens, not Arabic. `orders.payment_status` already
 *    held `unpaid`/`paid` behind a live CHECK constraint, and these map onto
 *    the codes a payment gateway (Paymob, Fawry) would return if one is ever
 *    added. The Arabic lives in the label maps below.
 *
 * 2. There is no state machine. Payment status is *derived* from the
 *    `order_payments` ledger — an amount, not a transition — so there is no
 *    TRANSITIONS table and nothing to advance. Payment status is also
 *    orthogonal to order status: an order can be جاري التجهيز and
 *    مدفوعة جزئياً at the same time.
 * ---------------------------------------------------------------------------
 */

export const PAYMENT_STATUSES = [
  "unpaid",
  "partially_paid",
  "paid",
  "refunded",
  /**
   * Retained only for backward compatibility with the pre-ledger constraint.
   * The manual wallet flow never produces it, and the admin UI does not offer
   * it — but stored rows must stay valid.
   */
  "failed",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** What the customer chose at checkout. */
export const PAYMENT_METHODS = [
  "cod",
  "vodafone_cash",
  "instapay",
  "bank_transfer",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * How an individual payment actually arrived, which is not always what the
 * customer picked — someone who chose InstaPay may end up sending Vodafone
 * Cash, and cash can change hands on the doorstep. Superset of PAYMENT_METHODS,
 * matching the `order_payments.method` CHECK constraint.
 */
export const PAYMENT_RECORD_METHODS = [
  ...PAYMENT_METHODS,
  "cash",
] as const satisfies readonly string[];

export type PaymentRecordMethod = (typeof PAYMENT_RECORD_METHODS)[number];

/** Methods where the shop expects money before the order ships. */
export const PREPAID_METHODS = [
  "vodafone_cash",
  "instapay",
  "bank_transfer",
] as const satisfies readonly PaymentMethod[];

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return (
    typeof value === "string" &&
    (PAYMENT_STATUSES as readonly string[]).includes(value)
  );
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    typeof value === "string" &&
    (PAYMENT_METHODS as readonly string[]).includes(value)
  );
}

export function isPaymentRecordMethod(
  value: unknown,
): value is PaymentRecordMethod {
  return (
    typeof value === "string" &&
    (PAYMENT_RECORD_METHODS as readonly string[]).includes(value)
  );
}

export function isPrepaidMethod(method: string): boolean {
  return (PREPAID_METHODS as readonly string[]).includes(method);
}

/**
 * The TypeScript twin of `derive_payment_status()` in Postgres.
 *
 * The database is authoritative — a trigger recomputes this on every write to
 * `orders`, so nothing in the app can set payment_status. This copy exists so
 * the UI can predict the outcome (previewing what recording an amount will do)
 * and so the rules can be unit-tested without a database.
 */
export function derivePaymentStatus(
  amountPaid: number,
  total: number,
  hasRefund: boolean,
): PaymentStatus {
  if (amountPaid <= 0 && hasRefund) return "refunded";
  if (amountPaid <= 0) return "unpaid";
  if (amountPaid >= total) return "paid";
  return "partially_paid";
}

/**
 * What the customer still owes. This is the number the admin quotes on the
 * phone and the one the customer needs to see, so it gets its own helper
 * rather than being recomputed inline at each call site.
 *
 * Never negative: an overpayment is a refund question, not a negative balance.
 */
export function amountRemaining(total: number, amountPaid: number): number {
  return Math.max(0, Math.round((total - amountPaid + Number.EPSILON) * 100) / 100);
}

/** True when money has been taken and the order is being unwound. */
export function needsRefund(
  amountPaid: number,
  orderStatus: string,
): boolean {
  return amountPaid > 0 && (orderStatus === "ملغي" || orderStatus === "مرتجع");
}

export const PAYMENT_STATUS_LABELS: Readonly<Record<PaymentStatus, string>> = {
  unpaid: "لم يتم الدفع",
  partially_paid: "مدفوعة جزئياً",
  paid: "مدفوع بالكامل",
  refunded: "تم الاسترجاع",
  failed: "فشل الدفع",
} as const;

export const PAYMENT_METHOD_LABELS: Readonly<Record<PaymentMethod, string>> = {
  cod: "الدفع عند الاستلام",
  vodafone_cash: "فودافون كاش",
  instapay: "إنستاباي",
  bank_transfer: "تحويل بنكي",
} as const;

export const PAYMENT_RECORD_METHOD_LABELS: Readonly<
  Record<PaymentRecordMethod, string>
> = {
  ...PAYMENT_METHOD_LABELS,
  cash: "نقداً",
} as const;

/** Status pill classes for customer-facing surfaces. */
export const PAYMENT_STATUS_COLORS: Readonly<Record<PaymentStatus, string>> = {
  unpaid: "bg-amber-100 text-amber-800 border-amber-200",
  partially_paid: "bg-sky-100 text-sky-800 border-sky-200",
  paid: "bg-green-100 text-green-800 border-green-200",
  refunded: "bg-gray-100 text-gray-700 border-gray-200",
  failed: "bg-red-100 text-red-800 border-red-200",
} as const;

/** Status pill classes for the admin table, which supports dark mode. */
export const ADMIN_PAYMENT_STATUS_COLORS: Readonly<
  Record<PaymentStatus, string>
> = {
  unpaid: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
  partially_paid:
    "text-sky-600 bg-sky-50 dark:bg-sky-900/20 dark:text-sky-400",
  paid: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
  refunded: "text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400",
  failed: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400",
} as const;
