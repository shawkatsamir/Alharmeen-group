/**
 * Single source of truth for order statuses.
 *
 * This module MIRRORS the database:
 *   - `orders_status_check`                 -> ORDER_STATUSES
 *   - `enforce_order_status_transition()`   -> TRANSITIONS
 * See supabase/migrations/*_enforce_order_status_transitions.sql.
 * If you change the machine here, change it there in the same commit.
 *
 * Keep this file free of imports. It is the zero-mock unit-test target
 * (order-status.test.ts), and anything that pulls in React or lucide-react
 * would drag a DOM into a plain node test run. Icons live in
 * ./order-status-icons.ts for exactly that reason.
 */

export const ORDER_STATUSES = [
  "قيد الانتظار",
  "تم التأكيد",
  "جاري التجهيز",
  "تم الشحن",
  "تم التوصيل",
  "ملغي",
  "مرتجع",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * The forward-only state machine. Every edge moves an order onward; there is
 * deliberately no edge back to an earlier status, and no admin override.
 *
 * Because this graph is acyclic, a status can never legitimately repeat for a
 * single order — which is what makes the `UNIQUE (order_id, status)` constraint
 * on order_status_history a real invariant rather than a dedupe workaround.
 */
export const TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> =
  {
    "قيد الانتظار": ["تم التأكيد", "ملغي"],
    "تم التأكيد": ["جاري التجهيز", "ملغي"],
    "جاري التجهيز": ["تم الشحن", "ملغي"],
    "تم الشحن": ["تم التوصيل"],
    "تم التوصيل": ["مرتجع"],
    ملغي: [],
    مرتجع: [],
  } as const;

/** Position along the happy path. Terminal branches share their entry rank. */
export const STATUS_RANK: Readonly<Record<OrderStatus, number>> = {
  "قيد الانتظار": 0,
  "تم التأكيد": 1,
  "جاري التجهيز": 2,
  "تم الشحن": 3,
  "تم التوصيل": 4,
  ملغي: 5,
  مرتجع: 5,
} as const;

/** The four statuses a healthy order passes through, in order. */
export const HAPPY_PATH = [
  "قيد الانتظار",
  "تم التأكيد",
  "جاري التجهيز",
  "تم الشحن",
  "تم التوصيل",
] as const satisfies readonly OrderStatus[];

/** Statuses from which nothing further can happen. */
export const TERMINAL_STATUSES = ["ملغي", "مرتجع"] as const;

/**
 * A customer may cancel until the order ships. Once it is on a truck, the
 * correction path is مرتجع (returned), not cancellation.
 */
export const CUSTOMER_CANCELABLE_STATUSES = [
  "قيد الانتظار",
  "تم التأكيد",
  "جاري التجهيز",
] as const satisfies readonly OrderStatus[];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (ORDER_STATUSES as readonly string[]).includes(value)
  );
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** The statuses an admin may legally move this order to. Empty when terminal. */
export function getNextStatuses(current: OrderStatus): readonly OrderStatus[] {
  return TRANSITIONS[current];
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return (TERMINAL_STATUSES as readonly OrderStatus[]).includes(status);
}

export function canCustomerCancel(status: string): boolean {
  return (CUSTOMER_CANCELABLE_STATUSES as readonly string[]).includes(status);
}

/**
 * Customer-facing label. Differs from the raw status only for قيد الانتظار,
 * which reads better as "تم الطلب" on a progress tracker.
 */
export const STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  "قيد الانتظار": "تم الطلب",
  "تم التأكيد": "تم التأكيد",
  "جاري التجهيز": "جاري التجهيز",
  "تم الشحن": "تم الشحن",
  "تم التوصيل": "تم التوصيل",
  ملغي: "ملغي",
  مرتجع: "مرتجع",
} as const;

/** Tailwind classes for status pills. */
export const STATUS_COLORS: Readonly<Record<OrderStatus, string>> = {
  "قيد الانتظار": "bg-amber-100 text-amber-800 border-amber-200",
  "تم التأكيد": "bg-sky-100 text-sky-800 border-sky-200",
  "جاري التجهيز": "bg-blue-100 text-blue-800 border-blue-200",
  "تم الشحن": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "تم التوصيل": "bg-green-100 text-green-800 border-green-200",
  ملغي: "bg-red-100 text-red-800 border-red-200",
  مرتجع: "bg-orange-100 text-orange-800 border-orange-200",
} as const;

/** Status pill classes for the admin table, which supports dark mode. */
export const ADMIN_STATUS_COLORS: Readonly<Record<OrderStatus, string>> = {
  "قيد الانتظار":
    "text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400",
  "تم التأكيد": "text-sky-600 bg-sky-50 dark:bg-sky-900/20 dark:text-sky-400",
  "جاري التجهيز":
    "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
  "تم الشحن":
    "text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400",
  "تم التوصيل":
    "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
  ملغي: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400",
  مرتجع: "text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
} as const;

/**
 * Admin list tabs -> the statuses each one covers.
 *
 * Every status must appear in exactly one tab. Before this module existed,
 * تم الشحن belonged to no tab at all, so shipped orders were invisible in the
 * admin dashboard. The unit tests assert full coverage to stop that recurring.
 */
export const ADMIN_TAB_STATUSES = {
  all: ORDER_STATUSES,
  /** In flight: everything not yet delivered, cancelled or returned. */
  pending: ["قيد الانتظار", "تم التأكيد", "جاري التجهيز", "تم الشحن"],
  completed: ["تم التوصيل"],
  canceled: ["ملغي"],
  returned: ["مرتجع"],
} as const satisfies Record<string, readonly OrderStatus[]>;

export type AdminOrderTab = keyof typeof ADMIN_TAB_STATUSES;
