import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/Dialog";
import { formatCurrency } from "@/lib/utils";
import { MapPin, Phone, Mail, User, Package } from "lucide-react";
import { Order, OrderItem } from "@/services/server/orders";
import { Img } from "@/shared/components/ui/Image";

interface OrderDetailModalProps {
  order: Order;
  items: OrderItem[];
}

export function OrderDetailModal({ order, items }: OrderDetailModalProps) {
  return (
    <DialogContent className="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle className="text-xl border-b pb-4">
          تفاصيل الطلب #{order.order_number || order.id.slice(0, 8)}
        </DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-8 py-4 px-1" dir="rtl">
        {/* RIGHT COLUMN: Customer Info */}
        <div className="space-y-6">
          {/* Contact Section */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <User className="w-4 h-4" /> معلومات العميل
            </h3>
            <div className="text-sm space-y-2">
              <p className="font-medium text-lg text-gray-900 dark:text-white">
                {order.customer_name}
              </p>
              <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Phone className="w-3 h-3" /> {order.customer_phone}
              </p>
              <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Mail className="w-3 h-3" /> {order.customer_email}
              </p>
            </div>
          </div>

          {/* Shipping Section */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <MapPin className="w-4 h-4" /> عنوان التوصيل
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>{order.shipping_address_line}</p>
              <p>
                {order.shipping_city}, {order.shipping_governorate}
              </p>
            </div>
          </div>
        </div>

        {/* LEFT COLUMN: Order Items */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Package className="w-4 h-4" /> المنتجات ({items.length})
          </h3>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 p-3 border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {/* Product Image */}
                <div className="relative w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded shrink-0 overflow-hidden">
                  <Img
                    src={item.product_image || "/placeholder.jpg"}
                    alt={item.product_name}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1">
                  <p className="text-sm font-medium line-clamp-1 text-gray-900 dark:text-white">
                    {item.product_name}
                  </p>
                  {/* <p className="text-xs text-gray-500">
                    {item.variant_options &&
                      JSON.stringify(item.variant_options)}
                  </p> */}
                  <div className="flex justify-between text-xs mt-1 text-gray-600 dark:text-gray-400">
                    <span>x{item.quantity}</span>
                    <span className="font-semibold">
                      {formatCurrency(item.total_price)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <span>المجموع الفرعي:</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <span>الشحن:</span>
              <span>{formatCurrency(order.shipping_cost)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg text-blue-800 dark:text-blue-400 pt-2 border-t border-blue-200 dark:border-blue-800">
              <span>الإجمالي:</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}
