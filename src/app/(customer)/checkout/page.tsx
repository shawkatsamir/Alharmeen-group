"use client";

import { useCartStore } from "@/stores/cartStore";
import { useEffect, useState } from "react";
import { createOrder } from "@/actions/checkout-actions";
import { CheckoutForm } from "@/features/checkout/components/CheckoutForm";
import { CheckoutFormValues } from "@/features/checkout/schema";
import { OrderSummary } from "@/features/checkout/components/OrderSummary";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  getCartDeliveryTiers,
  getShippingOptions,
} from "@/services/client/shipping";
import {
  effectiveDistanceKm,
  fallbackGovernorateCost,
  quoteDelivery,
  resolveDeliveryTier,
  type DeliveryQuote,
} from "@/features/checkout/lib/shipping";

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [localityId, setLocalityId] = useState<number | null>(null);
  const { items, clearCart, total } = useCartStore();
  const router = useRouter();

  // Rates change rarely and only from the admin dashboard, so this is cheap to
  // hold for the length of a checkout session.
  const { data: shipping } = useQuery({
    queryKey: ["shipping-options"],
    queryFn: getShippingOptions,
    staleTime: 5 * 60 * 1000,
  });

  const productIds = items.map((item) => item.id);
  const { data: cartTiers } = useQuery({
    queryKey: ["cart-delivery-tiers", productIds],
    queryFn: () =>
      getCartDeliveryTiers(productIds, shipping?.fallbackTierKey ?? "small"),
    enabled: productIds.length > 0 && !!shipping,
    staleTime: 5 * 60 * 1000,
  });

  /*
   * Preview only. `createOrder` recomputes all of this server-side from the
   * same rows using the same pure functions, so a tampered client changes
   * what is displayed but never what is charged.
   */
  const locality = shipping?.localities.find((l) => l.id === localityId);
  let quote: DeliveryQuote | null = null;
  let fallbackCost: number | null = null;

  if (shipping && locality) {
    const tier = resolveDeliveryTier(cartTiers ?? [], shipping.tiers);
    const distanceKm = effectiveDistanceKm({
      straightKm: locality.straight_km,
      overrideKm: locality.distance_km_override,
      roadFactor: shipping.roadFactor,
    });

    if (distanceKm !== null && tier) {
      quote = quoteDelivery({
        distanceKm,
        tier,
        subtotal: total(),
        rules: shipping.rules,
        maxDeliveryKm: shipping.maxDeliveryKm,
      });
    } else {
      // Locality without coordinates: fall back to the governorate flat rate.
      const governorate = shipping.governorates.find(
        (g) => g.id === locality.governorate_id,
      );
      fallbackCost = fallbackGovernorateCost(governorate?.shipping_cost ?? 0);
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && items.length === 0 && !isSuccess) {
      router.replace("/cart");
    }
  }, [mounted, items, router, isSuccess]);

  if (!mounted) return null;
  if ((!mounted || items.length === 0) && !isSuccess) return null;

  const handleSubmit = async (data: CheckoutFormValues) => {
    setIsLoading(true);
    try {
      const result = await createOrder(data, items);

      if (result.success) {
        setIsSuccess(true);
        toast.success("تم استلام طلبك بنجاح!");
        clearCart();
        router.replace(`/order-success/${result.orderId}`);
      } else {
        toast.error(result.error || "حدث خطأ أثناء إتمام الطلب");
      }
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <h1 className="text-3xl font-bold mb-8">إتمام الطلب</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Checkout Form Section */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg border border-gray-100">
            <h2 className="text-xl font-semibold mb-6">بيانات الشحن</h2>
            <CheckoutForm
              id="checkout-form"
              onSubmit={handleSubmit}
              governorates={shipping?.governorates ?? []}
              localities={shipping?.localities ?? []}
              onLocalityChange={setLocalityId}
              paymentDestinations={shipping?.paymentDestinations}
            />
          </div>
        </div>

        {/* Order Summary Section */}
        <div className="lg:col-span-1">
          <OrderSummary
            isLoading={isLoading}
            quote={quote}
            fallbackCost={fallbackCost}
            localityName={locality?.name_ar ?? null}
            whatsappLink={
              shipping?.whatsappNumber
                ? `https://wa.me/${shipping.whatsappNumber}?text=${encodeURIComponent(
                    `مرحباً، أريد الاستفسار عن التوصيل إلى ${locality?.name_ar ?? ""}`,
                  )}`
                : null
            }
            onPlaceOrder={() => {
              // Trigger form submission from outside the form
              const form = document.getElementById(
                "checkout-form",
              ) as HTMLFormElement;
              form?.requestSubmit();
            }}
          />
        </div>
      </div>
    </div>
  );
}
