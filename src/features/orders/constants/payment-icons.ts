import {
  Banknote,
  CircleDollarSign,
  CreditCard,
  Landmark,
  RotateCcw,
  Smartphone,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import {
  PAYMENT_STATUSES,
  type PaymentRecordMethod,
  type PaymentStatus,
} from "./payment";

/**
 * Icons per payment status and method. Split out of payment.ts so that module
 * stays import-free and unit-testable without a DOM — same split as
 * order-status-icons.ts.
 */
export const PAYMENT_STATUS_ICONS: Readonly<Record<PaymentStatus, LucideIcon>> =
  {
    unpaid: CircleDollarSign,
    partially_paid: Wallet,
    paid: CreditCard,
    refunded: RotateCcw,
    failed: XCircle,
  } as const;

export const PAYMENT_STATUS_ICON_COLORS: Readonly<
  Record<PaymentStatus, string>
> = {
  unpaid: "text-amber-500",
  partially_paid: "text-sky-500",
  paid: "text-green-500",
  refunded: "text-gray-500",
  failed: "text-red-500",
} as const;

export const PAYMENT_METHOD_ICONS: Readonly<
  Record<PaymentRecordMethod, LucideIcon>
> = {
  cod: Banknote,
  vodafone_cash: Smartphone,
  instapay: Smartphone,
  bank_transfer: Landmark,
  cash: Banknote,
} as const;

export { PAYMENT_STATUSES };
