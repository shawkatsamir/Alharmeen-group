"use client";

import { useCartStore } from "@/stores/cartStore";
import { useEffect, useState } from "react";
import { createOrder } from "@/features/checkout/actions/createOrder";
import { CheckoutForm } from "@/features/checkout/components/CheckoutForm";
import { CheckoutFormValues } from "@/features/checkout/schema";
import { OrderSummary } from "@/features/checkout/components/OrderSummary";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { items, clearCart } = useCartStore();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && items.length === 0) {
      router.replace("/cart");
    }
  }, [mounted, items, router]);

  if (!mounted) return null;
  if (!mounted || items.length === 0) return null;

  const handleSubmit = async (data: CheckoutFormValues) => {
    setIsLoading(true);
    try {
      const result = await createOrder(data, items);

      if (result.success) {
        toast.success("تم استلام طلبك بنجاح!");
        clearCart();
        // Redirect to success page or order details
        router.push(`/order-success/${result.orderId}`); // Assuming we will create this page
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
            <CheckoutForm id="checkout-form" onSubmit={handleSubmit} />
          </div>
        </div>

        {/* Order Summary Section */}
        <div className="lg:col-span-1">
          <OrderSummary
            isLoading={isLoading}
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
