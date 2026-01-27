import Link from "next/link";
import { Img } from "@/shared/components/ui/Image";
import { Button } from "@/shared/components/ui/Button";
import { ChevronLeft } from "lucide-react";
import { OrderTracker } from "./OrderTracker";

interface OrderItem {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  number: string;
  date: string;
  status: "قيد الانتظار" | "جاري التجهيز" | "تم الشحن" | "تم التوصيل" | "ملغي";
  total: number;
  items: OrderItem[];
}

interface OrderCardProps {
  order: Order;
}

// Minimal mapping if needed, but we try to use direct values now
const statusMap: Record<string, string> = {
  "قيد الانتظار": "قيد الانتظار",
  "جاري التجهيز": "جاري التجهيز",
  "تم الشحن": "تم الشحن",
  "تم التوصيل": "تم التوصيل",
  ملغي: "ملغي",
};

export function OrderCard({ order }: OrderCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 dark:text-white">
                طلب #{order.number}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                • {order.date}
              </span>
            </div>
            <div className="text-sm font-medium text-[#4EA674]">
              {order.status}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {order.total.toFixed(2)} ج.م
            </span>
          </div>
        </div>

        <div className="mb-6">
          <OrderTracker currentStatus={order.status} />
        </div>

        <div className="space-y-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4">
              <div className="relative w-16 h-16 bg-gray-100 rounded-md overflow-hidden shrink-0">
                <Img
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {item.name}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {item.quantity} x {item.price.toFixed(2)} ر.س
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="text-sm text-gray-500">{order.items.length} منتجات</div>
        <Link href={`/account/orders/${order.id}`}>
          <Button variant="outline" size="sm" className="gap-2">
            تفاصيل الطلب
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
