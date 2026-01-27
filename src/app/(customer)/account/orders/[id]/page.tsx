import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  CreditCard,
  ChevronRight,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { getOrderById, Order } from "@/services/server/orders";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Img } from "@/shared/components/ui/Image";
import { OrderTimeline } from "@/features/orders/components/OrderTimeline";
import { Button } from "@/shared/components/ui/Button";

// Helper to map status to icon and label
const getStatusConfig = (status: string) => {
  switch (status) {
    case "قيد الانتظار":
      return { icon: Clock, label: "تم الطلب", color: "text-orange-500" };
    case "جاري التجهيز":
      return { icon: Package, label: "جاري التجهيز", color: "text-blue-500" };
    case "تم الشحن":
      return { icon: Truck, label: "تم الشحن", color: "text-purple-500" };
    case "تم التوصيل":
      return {
        icon: CheckCircle2,
        label: "تم التوصيل",
        color: "text-green-500",
      };
    case "ملغي":
      return { icon: XCircle, label: "ملغي", color: "text-red-500" };
    case "مرتجع":
      return { icon: RotateCcw, label: "مرتجع", color: "text-red-500" };
    default:
      return { icon: Clock, label: status, color: "text-gray-500" };
  }
};

export default async function OrderDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const order = await getOrderById(params.id);

  if (!order || order.user_id !== user.id) {
    notFound();
  }

  // Construct Timeline Steps from History
  const historySteps =
    order.history?.map((entry) => {
      const config = getStatusConfig(entry.new_status);
      return {
        id: entry.id,
        label: config.label,
        date: new Date(entry.created_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        description: entry.notes,
        status: "completed" as const, // History items are always completed events
        icon: config.icon,
      };
    }) || [];

  // If no history, we might want to show at least the current status as a step,
  // but usually history should be populated on creation.
  // If not, we can fallback to the static steps logic if needed.
  // For now, let's append the current status if it's not the last history item (rare sync issue prevention)
  // Actually, let's just use the history as the source of truth for the timeline display.

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-8 text-sm text-gray-500">
        <Link href="/account" className="hover:text-gray-900 transition-colors">
          حسابي
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link
          href="/account/orders"
          className="hover:text-gray-900 transition-colors"
        >
          طلباتي
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">
          طلب #{order.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Main Content (Order Details) */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-[#4EA674]" />
              المنتجات
            </h2>
            <div className="space-y-6">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 border-b border-gray-100 dark:border-gray-700 last:border-0 pb-4 last:pb-0"
                >
                  <div className="relative w-20 h-20 bg-gray-100 rounded-md overflow-hidden shrink-0">
                    <Img
                      src={item.product_image}
                      alt={item.product_name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {item.product_name}
                      </h3>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {item.total_price.toFixed(2)} ر.س
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {item.quantity} x {item.unit_price.toFixed(2)} ر.س
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">المجموع الفرعي</span>
                <span className="font-medium">
                  {order.subtotal.toFixed(2)} ر.س
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">الشحن</span>
                <span className="font-medium">
                  {order.shipping_cost.toFixed(2)} ر.س
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
                <span>الإجمالي</span>
                <span className="text-[#4EA674]">
                  {order.total.toFixed(2)} ر.س
                </span>
              </div>
            </div>
          </div>

          {/* Shipping Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#4EA674]" />
              عنوان التوصيل
            </h2>
            <div className="text-gray-600 dark:text-gray-300 space-y-1">
              <p className="font-medium text-gray-900 dark:text-white">
                {order.customer_name}
              </p>
              <p>{order.shipping_address_line}</p>
              <p>
                {order.shipping_city}، {order.shipping_governorate}
              </p>
              <p dir="ltr" className="text-right">
                {order.customer_phone}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar (Timeline & Summary) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#4EA674]" />
              تتبع الطلب
            </h2>
            {historySteps.length > 0 ? (
              <OrderTimeline steps={historySteps} />
            ) : (
              <div className="text-center text-gray-500 py-4">
                لا يوجد تفاصيل تتبع متاحة حالياً.
                <p className="text-sm font-semibold mt-2 text-[#4EA674]">
                  {order.status}
                </p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#4EA674]" />
              معلومات الدفع
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">طريقة الدفع</span>
                <span className="font-medium">
                  {order.payment_method === "cod"
                    ? "الدفع عند الاستلام"
                    : order.payment_method}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">حالة الدفع</span>
                <span
                  className={`font-medium px-2 py-0.5 rounded-full text-xs ${order.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
                >
                  {order.payment_status === "paid" ? "تم الدفع" : "معلق"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
