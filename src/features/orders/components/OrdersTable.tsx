"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
} from "lucide-react";

import { getOrders } from "@/services/client/orders";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/Select";
import { Dialog } from "@/shared/components/ui/Dialog";
import { Button } from "@/shared/components/ui/Button";
import { Order } from "@/services/server/orders";
import OrderDetailModalWrapper from "./OrderDetailModalWrapper";
import { useUpdateOrderStatus } from "@/features/orders/hooks/useUpdateOrderStatus";
import { DebouncedSearchInput } from "@/features/search/components/DebouncedSearchInput";
import {
  ADMIN_STATUS_COLORS,
  getNextStatuses,
  isOrderStatus,
  isTerminalStatus,
  type OrderStatus,
} from "@/features/orders/constants/order-status";
import {
  ADMIN_PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  amountRemaining,
  isPaymentStatus,
  isPrepaidMethod,
  needsRefund,
} from "@/features/orders/constants/payment";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/AlertDialog";
import { cn, formatCurrency, formatDateShort } from "@/lib/utils";

type OrderTab = "all" | "completed" | "pending" | "canceled" | "returned";

interface OrderStats {
  all: number;
  pending: number;
  completed: number;
  canceled: number;
  returned: number;
}

const TABS: { id: OrderTab; label: string; statKey: keyof OrderStats }[] = [
  { id: "all", label: "الكل", statKey: "all" },
  { id: "pending", label: "معلق", statKey: "pending" },
  { id: "completed", label: "مكتمل", statKey: "completed" },
  { id: "canceled", label: "ملغي", statKey: "canceled" },
  { id: "returned", label: "مرتجع", statKey: "returned" },
];

/** The transition the admin has asked for, held until they confirm it. */
interface PendingChange {
  orderId: string;
  orderNumber: string;
  from: OrderStatus;
  to: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
  amountPaid: number;
  total: number;
}

export default function OrdersTable({ stats }: { stats?: OrderStats }) {
  const [activeTab, setActiveTab] = useState<OrderTab>("all");
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [effectiveSearchTerm, setEffectiveSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", activeTab, currentPage, effectiveSearchTerm],
    queryFn: () =>
      getOrders({
        page: currentPage,
        limit: 10,
        status: activeTab,
        search: effectiveSearchTerm,
      }),
  });

  const orders = data?.orders || [];
  const totalPages = Math.ceil((data?.count || 0) / 10);

  const { mutate: updateStatus, isPending: isUpdatingStatus } =
    useUpdateOrderStatus();

  const requestStatusChange = (order: Order, to: string) => {
    if (!isOrderStatus(to) || !isOrderStatus(order.status)) return;
    setPendingChange({
      orderId: order.id,
      orderNumber: order.order_number,
      from: order.status,
      to,
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      amountPaid: order.amount_paid,
      total: order.total,
    });
  };

  const confirmStatusChange = () => {
    if (!pendingChange) return;
    updateStatus({
      orderId: pendingChange.orderId,
      newStatus: pendingChange.to,
    });
    setPendingChange(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border-border overflow-hidden rounded-xl border">
        {/*
         * Toolbar. The five tabs, a 256px search field and three icon buttons
         * used to share one non-wrapping row, which is most of why this page
         * measured ~800px on a 390px phone. The tabs now scroll as a strip and
         * search takes its own row until there is room for both.
         */}
        <div className="border-border space-y-3 border-b p-3 sm:p-4 md:flex md:items-center md:justify-between md:gap-4 md:space-y-0">
          <div
            role="tablist"
            aria-label="تصفية الطلبات بالحالة"
            className="no-scrollbar -mx-3 flex snap-x gap-1 overflow-x-auto px-3 sm:-mx-4 sm:px-4 md:mx-0 md:flex-wrap md:px-0"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "focus-visible:ring-ring/50 flex min-h-11 shrink-0 snap-start items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:outline-none",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-primary-soft hover:text-primary",
                  )}
                >
                  {tab.label}
                  <span className="text-xs tabular-nums opacity-80">
                    ({stats?.[tab.statKey] ?? 0})
                  </span>
                </button>
              );
            })}
          </div>

          <DebouncedSearchInput
            placeholder="بحث برقم الطلب (3 أحرف على الأقل)"
            onSearch={(term) => {
              setEffectiveSearchTerm(term);
              setCurrentPage(1);
            }}
            className="w-full md:w-64"
          />
        </div>

        {isLoading ? (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 px-6 py-20">
            <Loader2 className="text-primary size-8 animate-spin" />
            <p>جاري تحميل الطلبات...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-muted-foreground px-6 py-20 text-center">
            {effectiveSearchTerm
              ? "لا توجد طلبات مطابقة لهذا البحث."
              : "لا توجد طلبات في هذا التبويب."}
          </div>
        ) : (
          <>
            {/* Phone: one card per order. */}
            <ul className="divide-border divide-y md:hidden">
              {orders.map((order) => (
                <li key={order.id}>
                  <OrderCardRow
                    order={order}
                    disabled={isUpdatingStatus}
                    onOpen={() => setSelectedOrder(order)}
                    onRequestStatus={(to) => requestStatusChange(order, to)}
                  />
                </li>
              ))}
            </ul>

            {/* Desktop: the full table. */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="bg-surface-sunken">
                  <tr>
                    {[
                      "رقم",
                      "رقم الطلب",
                      "العميل",
                      "التاريخ",
                      "السعر",
                      "الدفع",
                      "الحالة",
                      "التفاصيل",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="text-muted-foreground px-4 py-3 text-right text-xs font-semibold tracking-wide"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {orders.map((order, index) => (
                    <tr
                      key={order.id}
                      className="hover:bg-primary-soft/50 transition-colors"
                    >
                      <td className="text-muted-foreground px-4 py-3 text-sm tabular-nums">
                        {(currentPage - 1) * 10 + index + 1}
                      </td>
                      <td className="text-foreground px-4 py-3 text-sm font-medium tabular-nums whitespace-nowrap">
                        {order.order_number}
                      </td>
                      <td className="text-foreground px-4 py-3 text-sm">
                        {order.customer_name}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-sm whitespace-nowrap">
                        {formatDateShort(order.created_at)}
                      </td>
                      <td className="text-foreground px-4 py-3 text-sm font-medium tabular-nums whitespace-nowrap">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentCell order={order} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusControl
                          order={order}
                          disabled={isUpdatingStatus}
                          onRequestStatus={(to) =>
                            requestStatusChange(order, to)
                          }
                          className="w-36"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          aria-label={`تفاصيل الطلب ${order.order_number}`}
                          className="text-muted-foreground hover:bg-primary-soft hover:text-primary focus-visible:ring-ring/50 flex size-9 items-center justify-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
                        >
                          <Eye className="size-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {totalPages > 1 && (
          <div className="border-border flex items-center justify-between gap-2 border-t p-3 sm:px-4">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-11 gap-1"
            >
              <ChevronRight className="size-4" />
              السابق
            </Button>
            <span className="text-muted-foreground text-sm tabular-nums">
              صفحة {currentPage} من {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="h-11 gap-1"
            >
              التالي
              <ChevronLeft className="size-4" />
            </Button>
          </div>
        )}
      </div>

      <Dialog
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      >
        {selectedOrder && <OrderDetailModalWrapper order={selectedOrder} />}
      </Dialog>

      {/* Status changes are one-way and cannot be undone, so make the admin
          confirm rather than acting on a single mis-tap. */}
      <AlertDialog
        open={!!pendingChange}
        onOpenChange={(open) => !open && setPendingChange(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد تغيير حالة الطلب</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingChange && (
                <>
                  سيتم تغيير حالة الطلب{" "}
                  <span className="font-semibold">
                    {pendingChange.orderNumber}
                  </span>{" "}
                  من «{pendingChange.from}» إلى «{pendingChange.to}».
                  <br />
                  لا يمكن التراجع عن هذا الإجراء — حالات الطلب تتحرك في اتجاه
                  واحد فقط.
                </>
              )}
            </AlertDialogDescription>

            {/*
              Advisory only — the admin can still proceed. A hard block would
              make a trusted-customer COD order unshippable, and the storefront
              advertises الدفع عند الاستلام.
            */}
            {pendingChange?.to === "تم الشحن" &&
              pendingChange.paymentStatus !== "paid" && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-md border p-3 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {pendingChange.amountPaid > 0
                      ? `لم يُدفع كامل المبلغ — المتبقي ${formatCurrency(
                          amountRemaining(
                            pendingChange.total,
                            pendingChange.amountPaid,
                          ),
                        )}.`
                      : "لم يتم دفع أي مبلغ لهذا الطلب."}
                    {isPrepaidMethod(pendingChange.paymentMethod)
                      ? " العميل اختار الدفع المسبق، يُفضل تحصيل المبلغ قبل الشحن."
                      : " الطلب بالدفع عند الاستلام."}
                  </span>
                </div>
              )}

            {/* Money already taken on an order being cancelled or returned is
                a refund the shop owes; never let that pass silently. */}
            {pendingChange &&
              needsRefund(pendingChange.amountPaid, pendingChange.to) && (
                <div className="border-accent/40 bg-accent-soft text-accent-foreground flex items-start gap-2 rounded-md border p-3 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    هذا الطلب مدفوع بمبلغ{" "}
                    {formatCurrency(pendingChange.amountPaid)} ويحتاج استرجاع
                    بعد {pendingChange.to}.
                  </span>
                </div>
              )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange} className="h-11">
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * One order as a card.
 *
 * The eight-column table this replaces needed ~900px; on a phone it scrolled
 * sideways inside a page that was itself scrolling sideways. The card keeps
 * every fact the table carried and orders them the way the shop reads an
 * order: which order, who, how much, has it been paid, what happens next.
 */
function OrderCardRow({
  order,
  disabled,
  onOpen,
  onRequestStatus,
}: {
  order: Order;
  disabled: boolean;
  onOpen: () => void;
  onRequestStatus: (to: string) => void;
}) {
  return (
    <div className="space-y-3 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-foreground text-sm font-semibold tabular-nums">
            {order.order_number}
          </p>
          <p className="text-foreground mt-0.5 truncate text-sm">
            {order.customer_name}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span>{formatDateShort(order.created_at)}</span>
        <span aria-hidden>·</span>
        <span className="text-foreground font-semibold tabular-nums">
          {formatCurrency(order.total)}
        </span>
      </div>

      <PaymentCell order={order} />

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onOpen} className="h-11 flex-1 gap-2">
          <Eye className="size-4" />
          التفاصيل
        </Button>
        {/*
         * Labelled as the action, not the current value. The badge in the
         * card header already states the status; a select echoing it printed
         * every status twice per card.
         */}
        <StatusControl
          order={order}
          disabled={disabled}
          onRequestStatus={onRequestStatus}
          className="h-11 flex-1"
          triggerLabel="تغيير الحالة"
          hideWhenTerminal
        />
      </div>
    </div>
  );
}

function statusClasses(status: string) {
  return isOrderStatus(status)
    ? ADMIN_STATUS_COLORS[status]
    : "text-muted-foreground bg-surface-sunken";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium",
        statusClasses(status),
      )}
    >
      {status}
    </span>
  );
}

/**
 * Terminal (or unrecognised) statuses cannot move on, so they render as a
 * static badge rather than a dead dropdown. On the card the badge is already
 * in the header, so the control disappears instead of repeating it.
 */
function StatusControl({
  order,
  disabled,
  onRequestStatus,
  className,
  triggerLabel,
  hideWhenTerminal = false,
}: {
  order: Order;
  disabled: boolean;
  onRequestStatus: (to: string) => void;
  className?: string;
  /** Shown instead of the current value. Omit to render the value itself. */
  triggerLabel?: string;
  hideWhenTerminal?: boolean;
}) {
  const locked = !isOrderStatus(order.status) || isTerminalStatus(order.status);

  if (locked) {
    if (hideWhenTerminal) return null;
    return (
      <span
        className={cn(
          "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm",
          statusClasses(order.status),
          className,
        )}
      >
        {order.status}
      </span>
    );
  }

  return (
    <Select
      // Controlled by the server value: a failed mutation must not leave the
      // trigger showing the new status.
      value={order.status}
      disabled={disabled}
      onValueChange={onRequestStatus}
    >
      <SelectTrigger
        aria-label={`تغيير حالة الطلب ${order.order_number}`}
        className={cn(
          "h-9 min-w-0",
          triggerLabel
            ? "bg-card text-foreground border-border"
            : statusClasses(order.status),
          className,
        )}
      >
        {triggerLabel ? <span>{triggerLabel}</span> : <SelectValue />}
      </SelectTrigger>
      <SelectContent>
        {/* The current status must stay in the list or the trigger renders
            empty — but it is not selectable. */}
        <SelectItem value={order.status} disabled>
          {order.status}
        </SelectItem>
        {/* Only legal forward transitions. The same machine is enforced by a
            DB trigger. */}
        {getNextStatuses(order.status).map((status) => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Payment status plus the balance. A binary paid/unpaid dot had nowhere to put
 * a partial payment, and the balance owed is what the shop actually needs.
 */
function PaymentCell({ order }: { order: Order }) {
  const partial = order.amount_paid > 0 && order.amount_paid < order.total;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium",
          isPaymentStatus(order.payment_status)
            ? ADMIN_PAYMENT_STATUS_COLORS[order.payment_status]
            : "text-muted-foreground bg-surface-sunken",
        )}
      >
        {isPaymentStatus(order.payment_status)
          ? PAYMENT_STATUS_LABELS[order.payment_status]
          : order.payment_status}
      </span>
      {partial && (
        <span className="text-muted-foreground text-xs tabular-nums">
          {formatCurrency(order.amount_paid)} / {formatCurrency(order.total)}
        </span>
      )}
    </div>
  );
}
