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

const STATUSES = [
  "قيد الانتظار",
  "جاري التجهيز",
  "تم الشحن",
  "تم التوصيل",
  "ملغي",
  "مرتجع",
] as const;

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "تم التوصيل":
        return "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400";
      case "قيد الانتظار":
        return "text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400";
      case "جاري التجهيز":
        return "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400";
      case "تم الشحن":
        return "text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400";
      case "ملغي":
        return "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400";
      case "مرتجع":
        return "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const { mutate: updateStatus } = useUpdateOrderStatus();

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateStatus({ orderId, newStatus });
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
                      {order.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            order.payment_status === "paid"
                              ? "bg-green-500"
                              : "bg-red-500"
                          }`}
                        ></span>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {order.payment_status === "paid"
                            ? "مدفوع"
                            : "غير مدفوع"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Select
                        defaultValue={order.status}
                        onValueChange={(value) => {
                          handleStatusChange(order.id, value);
                        }}
                      >
                        <SelectTrigger
                          className={`w-[130px] h-8 ${getStatusColor(order.status)}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
    </div>
  );
}
