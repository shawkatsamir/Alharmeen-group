"use client";

import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/shared/components/ui/Button";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { resolveShippingCost } from "../lib/shipping";

interface OrderSummaryProps {
  isLoading: boolean;
  onPlaceOrder?: () => void;
  /** The chosen governorate's rate, or null before one is picked. */
  shippingRate: number | null;
  freeShippingThreshold: number | null;
}

export function OrderSummary({
  isLoading,
  onPlaceOrder,
  shippingRate,
  freeShippingThreshold,
}: OrderSummaryProps) {
  const { total, items } = useCartStore();
  const subtotal = total();

  // Until a governorate is chosen there is no rate to quote. Showing "مجاني"
  // in that gap — which is what this component used to do unconditionally —
  // promises free delivery the order then charges for.
  const quote =
    shippingRate === null
      ? null
      : resolveShippingCost({
          rate: shippingRate,
          subtotal,
          freeShippingThreshold,
        });

  if (items.length === 0) return null;

  return (
    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 h-fit sticky top-24">
      <h2 className="text-xl font-bold mb-6">ملخص الطلب</h2>

      <div className="space-y-3 mb-6">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-gray-600">
              {item.quantity}x {item.name}
            </span>
            <span>{formatCurrency(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 my-4" />

      <div className="space-y-4 mb-6">
        <div className="flex justify-between text-gray-600">
          <span>المجموع الفرعي</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>الشحن</span>
          <span>
            {quote === null ? (
              <span className="text-sm text-gray-500">اختر المحافظة</span>
            ) : quote.isFree ? (
              "مجاني"
            ) : (
              formatCurrency(quote.cost)
            )}
          </span>
        </div>
        {quote === null &&
          freeShippingThreshold !== null &&
          subtotal < freeShippingThreshold && (
            <p className="text-xs text-[#4EA674]">
              أضف {formatCurrency(freeShippingThreshold - subtotal)} للحصول على
              شحن مجاني
            </p>
          )}
        <div className="border-t border-gray-200 pt-4 mt-4 font-bold flex justify-between text-lg">
          <span>الإجمالي</span>
          <span>{formatCurrency(subtotal + (quote?.cost ?? 0))}</span>
        </div>
      </div>

      <Button
        onClick={onPlaceOrder}
        className="w-full"
        size="lg"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            جاري التنفيذ...
          </>
        ) : (
          "تأكيد الطلب"
        )}
      </Button>
    </div>
  );
}
