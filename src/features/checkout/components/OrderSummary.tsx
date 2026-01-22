"use client";

import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/shared/components/ui/Button";
import { Loader2 } from "lucide-react";

interface OrderSummaryProps {
  isLoading: boolean;
  onPlaceOrder?: () => void;
}

export function OrderSummary({ isLoading, onPlaceOrder }: OrderSummaryProps) {
  const { total, items } = useCartStore();
  const subtotal = total();
  const shipping: number = 0; // Fixed for now

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
            <span>{(item.price * item.quantity).toLocaleString()} ج.م</span>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 my-4" />

      <div className="space-y-4 mb-6">
        <div className="flex justify-between text-gray-600">
          <span>المجموع الفرعي</span>
          <span>{subtotal.toLocaleString()} ج.م</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>الشحن</span>
          <span>
            {shipping === 0 ? "مجاني" : `${shipping.toLocaleString()} ج.م`}
          </span>
        </div>
        <div className="border-t border-gray-200 pt-4 mt-4 font-bold flex justify-between text-lg">
          <span>الإجمالي</span>
          <span>{(subtotal + shipping).toLocaleString()} ج.م</span>
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
