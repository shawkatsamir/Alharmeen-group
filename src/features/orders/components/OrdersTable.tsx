"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOrders } from "@/services/client/orders";

import {
  Filter,
  SlidersHorizontal,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  AlertTriangle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/Select";
import { Dialog } from "@/shared/components/ui/Dialog";
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
import { formatCurrency } from "@/lib/utils";

interface OrdersTableProps {
  stats?: {
    all: number;
    pending: number;
    completed: number;
    canceled: number;
    returned: number;
  };
}

export default function OrdersTable({ stats }: OrdersTableProps) {
  const [activeTab, setActiveTab] = useState<
    "all" | "completed" | "pending" | "canceled" | "returned"
  >("all");
  // Order awaiting a confirmed status change, held until the admin confirms.
  const [pendingChange, setPendingChange] = useState<{
    orderId: string;
    orderNumber: string;
    from: OrderStatus;
    to: OrderStatus;
    // Carried so the confirm dialog can warn about money without refetching.
    paymentStatus: string;
    paymentMethod: string;
    amountPaid: number;
    total: number;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [effectiveSearchTerm, setEffectiveSearchTerm] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", activeTab, currentPage, effectiveSearchTerm],
    queryFn: async () => {
      return await getOrders({
        page: currentPage,
        limit: 10,
        status: activeTab,
        search: effectiveSearchTerm,
      });
    },
  });

  const orders = data?.orders || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / 10);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const getStatusColor = (status: string) =>
    isOrderStatus(status)
      ? ADMIN_STATUS_COLORS[status]
      : "text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400";

  const { mutate: updateStatus, isPending: isUpdatingStatus } =
    useUpdateOrderStatus();

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
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setActiveTab("all");
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "all"
                    ? "bg-[#4EA674]/10 text-[#4EA674]"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                الكل <span className="text-xs mr-1">({stats?.all || 0})</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("completed");
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "completed"
                    ? "bg-[#4EA674]/10 text-[#4EA674]"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                مكتمل{" "}
                <span className="text-xs mr-1">({stats?.completed || 0})</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("pending");
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "pending"
                    ? "bg-[#4EA674]/10 text-[#4EA674]"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                معلق{" "}
                <span className="text-xs mr-1">({stats?.pending || 0})</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("canceled");
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "canceled"
                    ? "bg-[#4EA674]/10 text-[#4EA674]"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                ملغي{" "}
                <span className="text-xs mr-1">({stats?.canceled || 0})</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("returned");
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "returned"
                    ? "bg-[#4EA674]/10 text-[#4EA674]"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                مرتجع{" "}
                <span className="text-xs mr-1">({stats?.returned || 0})</span>
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <DebouncedSearchInput
                placeholder="بحث برقم الطلب (3 أحرف على الأقل)"
                onSearch={(term) => {
                  setEffectiveSearchTerm(term);
                  setCurrentPage(1);
                }}
                className="w-64"
              />
              <button className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <Filter className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <button className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <SlidersHorizontal className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <button className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#4EA674]/5 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                  رقم
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                  رقم الطلب
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                  العميل
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                  التاريخ
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                  السعر
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                  الدفع
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                  الحالة
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                  التفاصيل
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Loader2 className="w-8 h-8 animate-spin text-[#4EA674] mb-2" />
                      <p>جاري تحميل الطلبات...</p>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    لا توجد طلبات.
                  </td>
                </tr>
              ) : (
                orders.map((order, index) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {(currentPage - 1) * 10 + index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {order.customer_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-6 py-4">
                      {/* Was a binary paid/unpaid dot, which had nowhere to put
                          a partial payment. Show the amount too, because what
                          the admin needs on the phone is the balance owed. */}
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            isPaymentStatus(order.payment_status)
                              ? ADMIN_PAYMENT_STATUS_COLORS[
                                  order.payment_status
                                ]
                              : "text-gray-600 bg-gray-50"
                          }`}
                        >
                          {isPaymentStatus(order.payment_status)
                            ? PAYMENT_STATUS_LABELS[order.payment_status]
                            : order.payment_status}
                        </span>
                        {order.amount_paid > 0 &&
                          order.amount_paid < order.total && (
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {formatCurrency(order.amount_paid)} /{" "}
                              {formatCurrency(order.total)}
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {!isOrderStatus(order.status) ||
                      isTerminalStatus(order.status) ? (
                        // Terminal (or unrecognised) statuses cannot move on,
                        // so render a static badge rather than a dead dropdown.
                        <span
                          className={`inline-flex items-center justify-center w-33 h-8 rounded-md text-sm ${getStatusColor(order.status)}`}
                        >
                          {order.status}
                        </span>
                      ) : (
                        <Select
                          // Controlled by the server value: a failed mutation
                          // must not leave the trigger showing the new status.
                          value={order.status}
                          disabled={isUpdatingStatus}
                          onValueChange={(value) => {
                            if (!isOrderStatus(value)) return;
                            setPendingChange({
                              orderId: order.id,
                              orderNumber: order.order_number,
                              from: order.status as OrderStatus,
                              to: value,
                              paymentStatus: order.payment_status,
                              paymentMethod: order.payment_method,
                              amountPaid: order.amount_paid,
                              total: order.total,
                            });
                          }}
                        >
                          <SelectTrigger
                            className={`w-33 h-8 ${getStatusColor(order.status)}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {/* The current status must stay in the list or the
                                trigger renders empty — but it is not
                                selectable. */}
                            <SelectItem value={order.status} disabled>
                              {order.status}
                            </SelectItem>
                            {/* Only legal forward transitions. The same machine
                                is enforced by a DB trigger. */}
                            {getNextStatuses(order.status).map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="flex items-center space-x-2 space-x-reverse px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            <span className="text-sm text-gray-500 dark:text-gray-400">
              صفحة {currentPage} من {totalPages}
            </span>

            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="flex items-center space-x-2 space-x-reverse px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
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
          confirm rather than acting on a single mis-click. */}
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
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
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
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    هذا الطلب مدفوع بمبلغ{" "}
                    {formatCurrency(pendingChange.amountPaid)} ويحتاج استرجاع
                    بعد {pendingChange.to}.
                  </span>
                </div>
              )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              className="bg-[#4EA674] hover:bg-[#3d8a5e] text-white"
            >
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
