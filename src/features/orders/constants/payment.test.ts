import { describe, expect, it } from "vitest";
import {
  ADMIN_PAYMENT_STATUS_COLORS,
  amountRemaining,
  derivePaymentStatus,
  isPaymentMethod,
  isPaymentRecordMethod,
  isPaymentStatus,
  isPrepaidMethod,
  needsRefund,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  PAYMENT_RECORD_METHOD_LABELS,
  PAYMENT_RECORD_METHODS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  PREPAID_METHODS,
  type PaymentStatus,
} from "./payment";

/**
 * Duplicated from the live CHECK constraints rather than imported, so that
 * editing the registry cannot silently edit its own test. Same drift-guard
 * technique as DB_CHECK_CONSTRAINT_VALUES in order-status.test.ts.
 *
 *   orders_payment_status_check
 *   orders_payment_method_check
 *   order_payments.method check
 */
const DB_PAYMENT_STATUS_VALUES = [
  "unpaid",
  "partially_paid",
  "paid",
  "refunded",
  "failed",
];

const DB_PAYMENT_METHOD_VALUES = [
  "cod",
  "vodafone_cash",
  "instapay",
  "bank_transfer",
];

const DB_PAYMENT_RECORD_METHOD_VALUES = [
  "cod",
  "vodafone_cash",
  "instapay",
  "bank_transfer",
  "cash",
];

describe("value lists match the database constraints", () => {
  it("covers exactly the payment statuses the CHECK allows", () => {
    expect([...PAYMENT_STATUSES].sort()).toEqual(
      [...DB_PAYMENT_STATUS_VALUES].sort(),
    );
  });

  it("covers exactly the payment methods the CHECK allows", () => {
    expect([...PAYMENT_METHODS].sort()).toEqual(
      [...DB_PAYMENT_METHOD_VALUES].sort(),
    );
  });

  it("allows cash on a recorded payment but not as a checkout choice", () => {
    expect([...PAYMENT_RECORD_METHODS].sort()).toEqual(
      [...DB_PAYMENT_RECORD_METHOD_VALUES].sort(),
    );
    // A customer cannot *choose* "cash" at checkout — that is what cod means.
    expect(isPaymentMethod("cash")).toBe(false);
    expect(isPaymentRecordMethod("cash")).toBe(true);
  });

  it("rejects values that are not statuses", () => {
    for (const value of ["", "PAID", "معلق", null, undefined, 0]) {
      expect(isPaymentStatus(value)).toBe(false);
    }
  });

  it("rejects values that are not methods", () => {
    for (const value of ["", "stripe", "COD", null, undefined]) {
      expect(isPaymentMethod(value)).toBe(false);
    }
  });
});

/**
 * The truth table mirrored from derive_payment_status() in Postgres. If these
 * two ever disagree, the UI predicts one thing and the trigger stores another.
 */
describe("derivePaymentStatus mirrors the database function", () => {
  const cases: Array<{
    paid: number;
    total: number;
    hasRefund: boolean;
    expected: PaymentStatus;
  }> = [
    { paid: 0, total: 2000, hasRefund: false, expected: "unpaid" },
    { paid: 500, total: 2000, hasRefund: false, expected: "partially_paid" },
    { paid: 1999.99, total: 2000, hasRefund: false, expected: "partially_paid" },
    { paid: 2000, total: 2000, hasRefund: false, expected: "paid" },
    // Overpayment still reads as paid; the excess is a refund question.
    { paid: 2500, total: 2000, hasRefund: false, expected: "paid" },
    { paid: 0, total: 2000, hasRefund: true, expected: "refunded" },
    // A refund that took the balance negative is still a refund.
    { paid: -100, total: 2000, hasRefund: true, expected: "refunded" },
    // Partially refunded but still holding money reads by the amount held.
    { paid: 500, total: 2000, hasRefund: true, expected: "partially_paid" },
    // A zero-total order is paid the moment anything is on it.
    { paid: 0, total: 0, hasRefund: false, expected: "unpaid" },
  ];

  it.each(cases)(
    "paid=$paid total=$total hasRefund=$hasRefund -> $expected",
    ({ paid, total, hasRefund, expected }) => {
      expect(derivePaymentStatus(paid, total, hasRefund)).toBe(expected);
    },
  );

  it("only ever returns a value the CHECK constraint accepts", () => {
    for (const { paid, total, hasRefund } of cases) {
      expect(DB_PAYMENT_STATUS_VALUES).toContain(
        derivePaymentStatus(paid, total, hasRefund),
      );
    }
  });
});

describe("amountRemaining", () => {
  it("is the outstanding balance", () => {
    expect(amountRemaining(2000, 500)).toBe(1500);
  });

  it("is zero once fully paid", () => {
    expect(amountRemaining(2000, 2000)).toBe(0);
  });

  /*
   * An overpaid order must not display a negative "remaining" on the invoice
   * or read as a credit the customer can spend.
   */
  it("never goes negative on overpayment", () => {
    expect(amountRemaining(2000, 2500)).toBe(0);
  });

  it("does not leak float drift into the displayed balance", () => {
    // 2000 - 1999.9 === 0.09999999999990905 in IEEE 754.
    expect(amountRemaining(2000, 1999.9)).toBe(0.1);
  });
});

describe("needsRefund", () => {
  it("flags money held on an unwound order", () => {
    expect(needsRefund(500, "ملغي")).toBe(true);
    expect(needsRefund(500, "مرتجع")).toBe(true);
  });

  it("stays quiet when nothing was collected", () => {
    expect(needsRefund(0, "ملغي")).toBe(false);
  });

  it("stays quiet while the order is still live", () => {
    expect(needsRefund(500, "جاري التجهيز")).toBe(false);
    expect(needsRefund(500, "تم التوصيل")).toBe(false);
  });
});

describe("prepaid methods", () => {
  it("treats every wallet and transfer method as prepaid", () => {
    expect([...PREPAID_METHODS].sort()).toEqual(
      ["bank_transfer", "instapay", "vodafone_cash"].sort(),
    );
  });

  /*
   * cod is the one method where an unpaid order is expected rather than a
   * warning sign — the storefront advertises الدفع عند الاستلام.
   */
  it("does not treat cash on delivery as prepaid", () => {
    expect(isPrepaidMethod("cod")).toBe(false);
  });

  it("covers every method exactly once between prepaid and cod", () => {
    const prepaid = PAYMENT_METHODS.filter(isPrepaidMethod);
    const postpaid = PAYMENT_METHODS.filter((m) => !isPrepaidMethod(m));
    expect(prepaid.length + postpaid.length).toBe(PAYMENT_METHODS.length);
    expect(postpaid).toEqual(["cod"]);
  });
});

describe("presentation registry covers every value", () => {
  it.each([
    ["PAYMENT_STATUS_LABELS", PAYMENT_STATUS_LABELS],
    ["PAYMENT_STATUS_COLORS", PAYMENT_STATUS_COLORS],
    ["ADMIN_PAYMENT_STATUS_COLORS", ADMIN_PAYMENT_STATUS_COLORS],
  ])("%s has an entry for exactly the known statuses", (_name, map) => {
    expect(Object.keys(map).sort()).toEqual([...PAYMENT_STATUSES].sort());
    for (const status of PAYMENT_STATUSES) {
      expect(map[status]).toBeTruthy();
    }
  });

  it("labels every checkout method", () => {
    expect(Object.keys(PAYMENT_METHOD_LABELS).sort()).toEqual(
      [...PAYMENT_METHODS].sort(),
    );
  });

  it("labels every recordable method", () => {
    expect(Object.keys(PAYMENT_RECORD_METHOD_LABELS).sort()).toEqual(
      [...PAYMENT_RECORD_METHODS].sort(),
    );
  });

  it("renders every user-facing label in Arabic", () => {
    // The storefront is Arabic-first; an untranslated token leaking into the
    // UI is the failure this guards.
    const arabic = /[؀-ۿ]/;
    for (const label of Object.values(PAYMENT_STATUS_LABELS)) {
      expect(label).toMatch(arabic);
    }
    for (const label of Object.values(PAYMENT_RECORD_METHOD_LABELS)) {
      expect(label).toMatch(arabic);
    }
  });
});
