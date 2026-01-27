"use client";

import { Plus, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/DropdownMenu";
import OrdersTable from "@/features/orders/components/OrdersTable";
import { useQuery } from "@tanstack/react-query";
import { getOrders } from "@/services/client/orders";

export default function OrderManagement() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: getOrders,
  });

  const stats = [
    {
      label: "إجمالي الطلبات",
      value: "1,240",
      change: "+14.4%",
      trend: "up",
      period: "آخر 7 أيام",
    },
    {
      label: "طلبات جديدة",
      value: "240",
      change: "+20%",
      trend: "up",
      period: "آخر 7 أيام",
    },
    {
      label: "طلبات مكتملة",
      value: "960",
      change: "85%",
      trend: "up",
      period: "آخر 7 أيام",
    },
    {
      label: "طلبات ملغاة",
      value: "87",
      change: "-5%",
      trend: "down",
      period: "آخر 7 أيام",
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            قائمة الطلبات
          </h1>
        </div>
        <div className="flex items-center space-x-3 space-x-reverse">
          <button className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-[#4EA674] text-white rounded-lg hover:bg-[#3d8a5e] transition-colors">
            <Plus className="w-5 h-5" />
            <span className="font-medium">إضافة طلب</span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center space-x-2 space-x-reverse px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  إجراءات إضافية
                </span>
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              <DropdownMenuItem className="text-right flex justify-end cursor-pointer">
                تصدير الطلبات
              </DropdownMenuItem>
              <DropdownMenuItem className="text-right flex justify-end cursor-pointer">
                استيراد الطلبات
              </DropdownMenuItem>
              <DropdownMenuItem className="text-right flex justify-end cursor-pointer">
                طباعة الكل
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 relative"
          >
            <button className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <MoreVertical className="w-5 h-5" />
            </button>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {stat.label}
              </p>
              <div className="flex items-baseline space-x-2 space-x-reverse">
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </h3>
                <span
                  className={`text-sm font-medium ${
                    stat.trend === "up" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {stat.period}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Orders Table */}
      <OrdersTable orders={orders} isLoading={isLoading} />
    </div>
  );
}
