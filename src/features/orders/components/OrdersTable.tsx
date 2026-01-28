"use client";
import { useState } from "react";
import {
  Search,
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
import { Img } from "@/shared/components/ui/Image";
import { Order } from "@/services/server/orders";
import OrderDetailModalWrapper from "./OrderDetailModalWrapper";
import { useUpdateOrderStatus } from "@/features/orders/hooks/useUpdateOrderStatus";

const STATUSES = [
  "قيد الانتظار",
  "جاري التجهيز",
  "تم الشحن",
  "تم التوصيل",
  "ملغي",
  "مرتجع",
] as const;

interface OrdersTableProps {
  orders?: Order[];
  isLoading: boolean;
}

export default function OrdersTable({
  orders = [],
  isLoading,
}: OrdersTableProps) {
  const [activeTab, setActiveTab] = useState<
    "all" | "completed" | "pending" | "canceled" | "returned"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "all"
                    ? "bg-[#4EA674]/10 text-[#4EA674]"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                الكل <span className="text-xs mr-1">({orders.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "completed"
                    ? "bg-[#4EA674]/10 text-[#4EA674]"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                مكتمل
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "pending"
                    ? "bg-[#4EA674]/10 text-[#4EA674]"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                معلق
              </button>
              <button
                onClick={() => setActiveTab("canceled")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "canceled"
                    ? "bg-[#4EA674]/10 text-[#4EA674]"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                ملغي
              </button>
            </div>

            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="relative">
                <input
                  type="text"
                  placeholder="بحث في الطلبات"
                  className="pr-10 pl-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4EA674]"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
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
                  المنتج
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
              {orders.map((order, index) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {order.order_number}
                  </td>
                  <td className="px-6 py-4">
                    {/* Just showing the first item as a preview for now */}
                    {order.items && order.items.length > 0 ? (
                      <div className="flex items-center space-x-3">
                        <div className="relative w-10 h-10">
                          <Img
                            src={order.items[0].product_image}
                            alt={order.items[0].product_name}
                            sizes="48px"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {order.items[0].product_name}
                          {order.items.length > 1 && (
                            <span className="text-xs text-gray-500 mr-1">
                              (+{order.items.length - 1})
                            </span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No items</span>
                    )}
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center space-x-2 space-x-reverse px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
            <span>السابق</span>
          </button>

          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page
                    ? "bg-[#4EA674] text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {page}
              </button>
            ))}
            <span className="px-2 text-gray-500">...</span>
            <button
              onClick={() => setCurrentPage(24)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              24
            </button>
          </div>

          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            className="flex items-center space-x-2 space-x-reverse px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <span>التالي</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Dialog
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      >
        {selectedOrder && <OrderDetailModalWrapper order={selectedOrder} />}
      </Dialog>
    </>
  );
}
