"use client";

import { MoreVertical, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/DropdownMenu";
import { Button } from "@/shared/components/ui/Button";
import OrdersTable from "@/features/orders/components/OrdersTable";
import { getOrderStats } from "@/services/client/orders";

export default function OrderManagement() {
  const { data: statData, isLoading: isStatsLoading } = useQuery({
    queryKey: ["admin-orders-stats"],
    queryFn: getOrderStats,
  });

  const stats = [
    { label: "إجمالي الطلبات", value: statData?.all },
    { label: "طلبات جديدة", value: statData?.pending },
    { label: "طلبات مكتملة", value: statData?.completed },
    { label: "طلبات ملغاة", value: statData?.canceled },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      {/*
       * No page heading here: the admin header renders the route's title, and
       * two different headings ("لوحة التحكم" / "قائمة الطلبات") stacked on a
       * phone cost a third of the first viewport to say the same thing twice.
       */}
      <div className="flex items-center justify-end gap-2">
        {/*
         * Both of these are unimplemented — no handler behind the button, no
         * action behind any menu item. Left in place because they record what
         * is planned, but disabled: a control that silently does nothing when
         * tapped is worse on a phone than one that says it isn't ready.
         */}
        <Button
          variant="outline"
          disabled
          title="غير متاح بعد"
          className="h-11 gap-2"
        >
          <Plus className="size-5" />
          <span>إضافة طلب</span>
          <span className="bg-surface-sunken rounded-full px-1.5 py-0.5 text-[0.6875rem]">
            قريباً
          </span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-11 gap-2">
              <span className="hidden sm:inline">إجراءات إضافية</span>
              <MoreVertical className="size-4" />
              <span className="sr-only sm:hidden">إجراءات إضافية</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem disabled>تصدير الطلبات (قريباً)</DropdownMenuItem>
            <DropdownMenuItem disabled>استيراد الطلبات (قريباً)</DropdownMenuItem>
            <DropdownMenuItem disabled>طباعة الكل (قريباً)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/*
       * Hidden on phones on purpose. These four numbers are the same four the
       * filter tabs carry twenty pixels below, and as full cards they pushed
       * the first order ~520px down the page — the admin had to scroll past a
       * summary to reach the thing they opened the screen for.
       */}
      <div className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-card border-border rounded-xl border p-4"
          >
            <p className="text-muted-foreground text-sm">{stat.label}</p>
            <p className="text-foreground mt-1 text-3xl font-bold tabular-nums">
              {isStatsLoading ? "—" : (stat.value ?? 0)}
            </p>
          </div>
        ))}
      </div>

      <OrdersTable stats={statData} />
    </div>
  );
}
