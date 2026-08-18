import { describe, expect, it } from "vitest";

import {
  ADMIN_STATUS_COLORS,
  ADMIN_TAB_STATUSES,
  canCustomerCancel,
  canTransition,
  CUSTOMER_CANCELABLE_STATUSES,
  getNextStatuses,
  HAPPY_PATH,
  isOrderStatus,
  isTerminalStatus,
  ORDER_STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_RANK,
  TERMINAL_STATUSES,
  TRANSITIONS,
  type OrderStatus,
} from "./order-status";

/**
 * These statuses are enforced by the `orders_status_check` constraint in
 * Postgres. If this list changes, the DB constraint must change too.
 */
const DB_CHECK_CONSTRAINT_VALUES = [
  "قيد الانتظار",
  "جاري التجهيز",
  "تم الشحن",
  "تم التوصيل",
  "ملغي",
  "مرتجع",
  "تم التأكيد",
];

describe("status list", () => {
  it("matches the database check constraint exactly", () => {
    expect([...ORDER_STATUSES].sort()).toEqual(
      [...DB_CHECK_CONSTRAINT_VALUES].sort(),
    );
  });

  it("recognises valid statuses and rejects anything else", () => {
    for (const status of ORDER_STATUSES) {
      expect(isOrderStatus(status)).toBe(true);
    }
    // "pending" is the old English literal that the DB default still used and
    // that a now-deleted duplicate createOrder wrote. It must never validate.
    for (const bad of ["pending", "confirmed", "", "shipped", null, undefined]) {
      expect(isOrderStatus(bad)).toBe(false);
    }
  });
});

describe("forward-only state machine", () => {
  it("allows exactly the documented transitions", () => {
    const legal: ReadonlyArray<[OrderStatus, OrderStatus]> = [
      ["قيد الانتظار", "تم التأكيد"],
      ["قيد الانتظار", "ملغي"],
      ["تم التأكيد", "جاري التجهيز"],
      ["تم التأكيد", "ملغي"],
      ["جاري التجهيز", "تم الشحن"],
      ["جاري التجهيز", "ملغي"],
      ["تم الشحن", "تم التوصيل"],
      ["تم التوصيل", "مرتجع"],
    ];

    for (const [from, to] of legal) {
      expect(canTransition(from, to)).toBe(true);
    }

    // Every pair NOT in the legal list must be rejected. This is the guard
    // that actually enforces one-directionality, rather than spot checks.
    const legalKeys = new Set(legal.map(([f, t]) => `${f}->${t}`));
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        if (legalKeys.has(`${from}->${to}`)) continue;
        expect(
          canTransition(from, to),
          `${from} -> ${to} must be rejected`,
        ).toBe(false);
      }
    }
  });

  it("never allows moving backwards along the happy path", () => {
    for (let i = 0; i < HAPPY_PATH.length; i++) {
      for (let j = 0; j < i; j++) {
        expect(
          canTransition(HAPPY_PATH[i], HAPPY_PATH[j]),
          `${HAPPY_PATH[i]} must not go back to ${HAPPY_PATH[j]}`,
        ).toBe(false);
      }
    }
  });

  it("never allows a status to transition to itself", () => {
    for (const status of ORDER_STATUSES) {
      expect(canTransition(status, status)).toBe(false);
    }
  });

  it("treats cancelled and returned as terminal", () => {
    for (const status of TERMINAL_STATUSES) {
      expect(isTerminalStatus(status)).toBe(true);
      expect(getNextStatuses(status)).toHaveLength(0);
    }
    for (const status of HAPPY_PATH) {
      expect(isTerminalStatus(status)).toBe(false);
    }
  });

  it("is acyclic, which is what makes UNIQUE(order_id, status) safe", () => {
    // Depth-first search for a back edge. If one existed, a single order could
    // legitimately revisit a status and the DB unique constraint would start
    // rejecting valid writes.
    const visiting = new Set<OrderStatus>();
    const done = new Set<OrderStatus>();

    const walk = (status: OrderStatus): void => {
      if (done.has(status)) return;
      expect(visiting.has(status), `cycle through ${status}`).toBe(false);
      visiting.add(status);
      for (const next of TRANSITIONS[status]) walk(next);
      visiting.delete(status);
      done.add(status);
    };

    for (const status of ORDER_STATUSES) walk(status);
  });

  it("only ever moves to a strictly higher rank", () => {
    for (const from of ORDER_STATUSES) {
      for (const to of TRANSITIONS[from]) {
        expect(
          STATUS_RANK[to],
          `${from} -> ${to} must increase rank`,
        ).toBeGreaterThan(STATUS_RANK[from]);
      }
    }
  });

  it("can reach every status from the initial one", () => {
    const seen = new Set<OrderStatus>(["قيد الانتظار"]);
    const queue: OrderStatus[] = ["قيد الانتظار"];
    while (queue.length) {
      for (const next of TRANSITIONS[queue.shift()!]) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    expect([...seen].sort()).toEqual([...ORDER_STATUSES].sort());
  });
});

describe("customer cancellation window", () => {
  it("allows cancelling only before the order ships", () => {
    expect(canCustomerCancel("قيد الانتظار")).toBe(true);
    expect(canCustomerCancel("تم التأكيد")).toBe(true);
    // Deliberate behaviour change: previously excluded.
    expect(canCustomerCancel("جاري التجهيز")).toBe(true);

    expect(canCustomerCancel("تم الشحن")).toBe(false);
    expect(canCustomerCancel("تم التوصيل")).toBe(false);
    expect(canCustomerCancel("ملغي")).toBe(false);
    expect(canCustomerCancel("مرتجع")).toBe(false);
  });

  it("rejects legacy English values that used to appear in the guard", () => {
    expect(canCustomerCancel("pending")).toBe(false);
    expect(canCustomerCancel("confirmed")).toBe(false);
  });

  it("only lists statuses that can actually reach ملغي", () => {
    for (const status of CUSTOMER_CANCELABLE_STATUSES) {
      expect(
        canTransition(status, "ملغي"),
        `${status} is advertised as cancellable but cannot reach ملغي`,
      ).toBe(true);
    }
    // ...and every status that can reach ملغي is offered to the customer.
    for (const status of ORDER_STATUSES) {
      if (canTransition(status, "ملغي")) {
        expect(canCustomerCancel(status)).toBe(true);
      }
    }
  });

  it("agrees with rank: cancellable iff ranked before تم الشحن", () => {
    for (const status of ORDER_STATUSES) {
      const expected =
        STATUS_RANK[status] < STATUS_RANK["تم الشحن"] &&
        !isTerminalStatus(status);
      expect(canCustomerCancel(status)).toBe(expected);
    }
  });
});

describe("presentation registry covers every status", () => {
  // Guards against the 7-way definition drift this module replaced, where
  // different files knew about different subsets of the statuses.
  it.each([
    ["STATUS_LABELS", STATUS_LABELS],
    ["STATUS_COLORS", STATUS_COLORS],
    ["ADMIN_STATUS_COLORS", ADMIN_STATUS_COLORS],
  ])("%s has an entry for every status", (_name, map) => {
    for (const status of ORDER_STATUSES) {
      expect(map[status]).toBeTruthy();
    }
    expect(Object.keys(map).sort()).toEqual([...ORDER_STATUSES].sort());
  });

  it("assigns every status to exactly one admin tab", () => {
    const tabs = Object.entries(ADMIN_TAB_STATUSES).filter(
      ([tab]) => tab !== "all",
    );

    for (const status of ORDER_STATUSES) {
      const owning = tabs.filter(([, statuses]) =>
        (statuses as readonly string[]).includes(status),
      );
      // تم الشحن previously belonged to no tab, making shipped orders
      // invisible in the admin dashboard.
      expect(owning.map(([tab]) => tab), `tabs owning ${status}`).toHaveLength(
        1,
      );
    }
  });

  it("has a happy path that is a real path through the machine", () => {
    for (let i = 0; i < HAPPY_PATH.length - 1; i++) {
      expect(canTransition(HAPPY_PATH[i], HAPPY_PATH[i + 1])).toBe(true);
    }
  });
});
