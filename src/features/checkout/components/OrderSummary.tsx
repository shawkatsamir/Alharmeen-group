"use client";

import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/shared/components/ui/Button";
import { Loader2, MessageCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DeliveryQuote } from "../lib/shipping";

interface OrderSummaryProps {
  isLoading: boolean;
  onPlaceOrder?: () => void;
  /** Null until a locality is chosen, or when the fallback path applies. */
  quote: DeliveryQuote | null;
  /** Governorate flat rate, used when a locality has no coordinates. */
  fallbackCost: number | null;
  localityName: string | null;
  /** wa.me link shown when the destination is out of range. */
  whatsappLink?: string | null;
}

export function OrderSummary({
  isLoading,
  onPlaceOrder,
  quote,
  fallbackCost,
  localityName,
  whatsappLink,
}: OrderSummaryProps) {
  const { total, items } = useCartStore();
  const subtotal = total();

  if (items.length === 0) return null;

  const isOutOfRange = quote?.isOutOfRange ?? false;
  const shippingCost = isOutOfRange ? 0 : (quote?.cost ?? fallbackCost ?? 0);
  const hasQuote = quote !== null || fallbackCost !== null;

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
          <span>
            التوصيل
            {/* The distance is the justification for the number. Showing it
                turns an arbitrary fee into something the customer can judge. */}
            {quote && !isOutOfRange && quote.distanceKm > 0 && (
              <span className="block text-xs text-gray-400">
                {localityName} · {quote.distanceKm} كم
              </span>
            )}
          </span>
          <span className="text-left">
            {!hasQuote ? (
              <span className="text-sm text-gray-500">اختر المدينة</span>
            ) : isOutOfRange ? (
              <span className="text-sm font-medium text-amber-600">
                يُحدد بالتواصل
              </span>
            ) : quote?.isFree ? (
              "مجاني"
            ) : (
              formatCurrency(shippingCost)
            )}
          </span>
        </div>

        {/*
          Past the maximum radius the shop stops quoting rather than accepting
          a trip it loses money on. The customer gets a way to reach us instead
          of a dead end.
        */}
        {isOutOfRange && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p>
              {localityName} خارج نطاق التوصيل الحالي. تواصل معنا للاتفاق على
              التوصيل وتكلفته.
            </p>
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 font-medium text-[#25D366]"
              >
                <MessageCircle className="h-4 w-4" />
                تواصل على واتساب
              </a>
            )}
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 mt-4 font-bold flex justify-between text-lg">
          <span>الإجمالي</span>
          <span>{formatCurrency(subtotal + shippingCost)}</span>
        </div>
      </div>

      <Button
        onClick={onPlaceOrder}
        className="w-full"
        size="lg"
        // Blocking here rather than letting the server reject it keeps the
        // customer from filling in the whole form for an order we cannot take.
        disabled={isLoading || isOutOfRange}
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
