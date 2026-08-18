import {
  CheckCircle2,
  Clock,
  Package,
  RotateCcw,
  ThumbsUp,
  Truck,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { ORDER_STATUSES, type OrderStatus } from "./order-status";

/**
 * Icon per status. Split out of order-status.ts so that module stays
 * import-free and unit-testable without a DOM.
 */
export const STATUS_ICONS: Readonly<Record<OrderStatus, LucideIcon>> = {
  "قيد الانتظار": Clock,
  "تم التأكيد": ThumbsUp,
  "جاري التجهيز": Package,
  "تم الشحن": Truck,
  "تم التوصيل": CheckCircle2,
  ملغي: XCircle,
  مرتجع: RotateCcw,
} as const;

/** Text colour per status, for icons and inline labels. */
export const STATUS_ICON_COLORS: Readonly<Record<OrderStatus, string>> = {
  "قيد الانتظار": "text-orange-500",
  "تم التأكيد": "text-sky-500",
  "جاري التجهيز": "text-blue-500",
  "تم الشحن": "text-purple-500",
  "تم التوصيل": "text-green-500",
  ملغي: "text-red-500",
  مرتجع: "text-orange-600",
} as const;

export { ORDER_STATUSES };
