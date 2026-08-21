import {
  Clock,
  MapPin,
  Calendar,
  CreditCard,
  ChevronRight,
  Package,
  RotateCcw,
  Wallet,
} from "lucide-react";
import {
  isOrderStatus,
  STATUS_LABELS,
} from "@/features/orders/constants/order-status";
import {
  STATUS_ICONS,
  STATUS_ICON_COLORS,
} from "@/features/orders/constants/order-status-icons";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_RECORD_METHOD_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  amountRemaining,
  isPaymentMethod,
  isPaymentRecordMethod,
  isPaymentStatus,
} from "@/features/orders/constants/payment";
import { PaymentInstructions } from "@/features/orders/components/PaymentInstructions";
import { getOrderById } from "@/services/server/orders";
import { getOrderPayments } from "@/services/server/payments";
import { getPaymentSettings } from "@/services/server/payment-settings";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Img } from "@/shared/components/ui/Image";
import { OrderTimeline } from "@/features/orders/components/OrderTimeline";
import { CancelOrderButton } from "@/features/orders/components/CancleOrderButton";

// Maps a status to its icon/label/colour using the shared status registry, so
// this page can never drift from the state machine.
const getStatusConfig = (status: string) => {
  if (!isOrderStatus(status)) {
    return { icon: Clock, label: status, color: "text-gray-500" };
  }
  return {
    icon: STATUS_ICONS[status],
    label: STATUS_LABELS[status],
    color: STATUS_ICON_COLORS[status],
  };
};

export default async function OrderDetailsPage({
  params,
}: {
  // Next 16: params is a Promise. Reading `.id` off it directly yields
  // undefined, which sent every visit to this page to notFound().
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const order = await getOrderById(id);

  if (!order || order.user_id !== user.id) {
    notFound();
  }

  const [payments, paymentSettings] = await Promise.all([
    getOrderPayments(order.id),
    getPaymentSettings(),
  ]);

  // Reuse the presentational timeline the status history already uses, so the
  // payment record reads exactly like the order record beside it.
  const paymentSteps = payments.map((payment) => {
    const isRefund = payment.amount < 0;
    return {
      id: payment.id,
      label: `${isRefund ? "استرجاع" : "دفعة"} ${formatCurrency(Math.abs(payment.amount))}`,
      date: new Date(payment.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      description: isPaymentRecordMethod(payment.method)
        ? PAYMENT_RECORD_METHOD_LABELS[payment.method]
        : payment.method,
      status: "completed" as const,
      icon: isRefund ? RotateCcw : Wallet,
    };
  });

  // Construct Timeline Steps from History
  const historySteps =
    order.history?.map((entry) => {
      const config = getStatusConfig(entry.status);
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
        description: entry.notes ?? undefined,
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
                        {formatCurrency(item.total_price)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {item.quantity} x {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">المجموع الفرعي</span>
                <span className="font-medium">
                  {formatCurrency(order.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">الشحن</span>
                <span className="font-medium">
                  {order.shipping_cost === 0
                    ? "مجاني"
                    : formatCurrency(order.shipping_cost)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
                <span>الإجمالي</span>
                <span className="text-[#4EA674]">
                  {formatCurrency(order.total)}
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

            {/* Renders itself only while the order is still cancellable. */}
            <div className="mt-6 flex justify-center">
              <CancelOrderButton orderId={order.id} status={order.status} />
            </div>
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
                  {isPaymentMethod(order.payment_method)
                    ? PAYMENT_METHOD_LABELS[order.payment_method]
                    : order.payment_method}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">حالة الدفع</span>
                <span
                  className={`font-medium px-2 py-0.5 rounded-full text-xs border ${
                    isPaymentStatus(order.payment_status)
                      ? PAYMENT_STATUS_COLORS[order.payment_status]
                      : "bg-gray-100 text-gray-700 border-gray-200"
                  }`}
                >
                  {isPaymentStatus(order.payment_status)
                    ? PAYMENT_STATUS_LABELS[order.payment_status]
                    : order.payment_status}
                </span>
              </div>

              {/* The balance owed is the number the customer actually needs —
                  previously the card showed only a paid/pending badge. */}
              <div className="flex justify-between">
                <span className="text-gray-500">المدفوع</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(order.amount_paid)}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-100 dark:border-gray-700 pt-2">
                <span className="text-gray-500">المتبقي</span>
                <span className="font-bold text-[#4EA674]">
                  {formatCurrency(
                    amountRemaining(order.total, order.amount_paid),
                  )}
                </span>
              </div>
            </div>

            {payments.length > 0 && (
              <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  سجل المدفوعات
                </h3>
                <OrderTimeline steps={paymentSteps} />
              </div>
            )}
          </div>

          <PaymentInstructions
            orderNumber={order.order_number || order.id.slice(0, 8)}
            total={order.total}
            amountPaid={order.amount_paid}
            paymentMethod={order.payment_method}
            settings={paymentSettings}
          />
        </div>
      </div>
    </div>
  );
}
