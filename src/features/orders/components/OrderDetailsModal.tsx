import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/Dialog";
import { formatCurrency } from "@/lib/utils";
import { MapPin, Phone, Mail, User, Package } from "lucide-react";
import { Order, OrderItem } from "@/services/server/orders";
import { Img } from "@/shared/components/ui/Image";
import { OrderPaymentPanel } from "./OrderPaymentPanel";

interface OrderDetailModalProps {
  order: Order;
  items: OrderItem[];
}

export function OrderDetailModal({ order, items }: OrderDetailModalProps) {
  return (
    /*
     * A bottom sheet on a phone, a centred dialog from `sm` up. The centred
     * box left ~16px of margin either side of a two-column grid, so customer
     * details and the item list were each about 150px wide.
     */
    <DialogContent
      className="max-h-[92dvh] max-sm:top-auto max-sm:bottom-0 max-sm:w-full max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-b-none max-sm:p-4 max-sm:pb-safe sm:max-w-4xl"
    >
      <DialogHeader>
        <DialogTitle className="border-b pb-3 pe-10 text-start text-lg sm:pb-4 sm:text-xl">
          تفاصيل الطلب #{order.order_number || order.id.slice(0, 8)}
        </DialogTitle>
      </DialogHeader>

      <div
        className="grid min-h-0 grid-cols-1 gap-4 overflow-y-auto overscroll-contain px-1 py-1 lg:grid-cols-2 lg:gap-8 lg:py-4"
        dir="rtl"
      >
        <div className="space-y-4 lg:space-y-6">
          <div className="bg-surface-sunken space-y-3 rounded-lg p-4">
            <h3 className="text-foreground flex items-center gap-2 font-semibold">
              <User className="size-4" /> معلومات العميل
            </h3>
            <div className="space-y-2 text-sm">
              <p className="text-foreground text-lg font-medium">
                {order.customer_name}
              </p>
              <p className="text-muted-foreground flex items-center gap-2">
                <Phone className="size-3.5 shrink-0" />
                <a
                  href={`tel:${order.customer_phone}`}
                  className="hover:text-primary underline-offset-2 hover:underline"
                  dir="ltr"
                >
                  {order.customer_phone}
                </a>
              </p>
              <p className="text-muted-foreground flex items-center gap-2">
                <Mail className="size-3.5 shrink-0" />
                <span className="truncate">{order.customer_email}</span>
              </p>
            </div>
          </div>

          <div className="bg-surface-sunken space-y-3 rounded-lg p-4">
            <h3 className="text-foreground flex items-center gap-2 font-semibold">
              <MapPin className="size-4" /> عنوان التوصيل
            </h3>
            <div className="text-muted-foreground text-sm leading-relaxed">
              <p>{order.shipping_address_line}</p>
              <p>
                {order.shipping_city}, {order.shipping_governorate}
              </p>
            </div>
          </div>

          <OrderPaymentPanel
            orderId={order.id}
            orderNumber={order.order_number || order.id.slice(0, 8)}
            orderStatus={order.status}
            total={order.total}
            amountPaid={order.amount_paid}
            paymentStatus={order.payment_status}
            paymentMethod={order.payment_method}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-foreground flex items-center gap-2 font-semibold">
            <Package className="size-4" /> المنتجات ({items.length})
          </h3>

          <div className="border-border max-h-[300px] overflow-y-auto overscroll-contain rounded-lg border">
            {items.length === 0 ? (
              <p className="text-muted-foreground p-4 text-center text-sm">
                لا توجد أصناف مسجلة على هذا الطلب.
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="border-border hover:bg-surface-sunken flex gap-3 border-b p-3 last:border-0"
                >
                  <div className="bg-surface-sunken relative size-12 shrink-0 overflow-hidden rounded">
                    <Img
                      src={item.product_image || "/placeholder.jpg"}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-foreground line-clamp-2 text-sm font-medium">
                      {item.product_name}
                    </p>
                    <div className="text-muted-foreground mt-1 flex justify-between gap-2 text-xs">
                      <span className="tabular-nums">x{item.quantity}</span>
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(item.total_price)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-primary-soft space-y-2 rounded-lg p-4 text-sm">
            <div className="text-foreground flex justify-between gap-2">
              <span>المجموع الفرعي:</span>
              <span className="tabular-nums">
                {formatCurrency(order.subtotal)}
              </span>
            </div>
            <div className="text-foreground flex justify-between gap-2">
              <span>الشحن:</span>
              <span className="tabular-nums">
                {formatCurrency(order.shipping_cost)}
              </span>
            </div>
            <div className="text-primary border-primary/20 flex justify-between gap-2 border-t pt-2 text-lg font-bold">
              <span>الإجمالي:</span>
              <span className="tabular-nums">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}
