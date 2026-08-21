import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/shared/components/ui/Button";
import { formatCurrency } from "@/lib/utils";

export function CartSummary() {
  const { total, items } = useCartStore();
  const subtotal = total();

  const router = useRouter();
  const supabase = createClient();
  if (items.length === 0) return null;

  const handleCheckout = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login?next=/checkout");
      return;
    }
    router.push("/checkout");
  };

  return (
    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 h-fit sticky top-24">
      <h2 className="text-xl font-bold mb-6">ملخص الطلب</h2>

      <div className="space-y-4 mb-6">
        <div className="flex justify-between text-gray-600">
          <span>المجموع الفرعي</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {/* The rate depends on the governorate, which is only collected at
            checkout — so quote it there rather than promising "مجاني" here. */}
        <div className="flex justify-between text-gray-600">
          <span>الشحن</span>
          <span className="text-sm text-gray-500">يُحسب عند إتمام الطلب</span>
        </div>
        <div className="border-t border-gray-200 pt-4 mt-4 font-bold flex justify-between text-lg">
          <span>الإجمالي</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
      </div>

      <Button onClick={handleCheckout} className="w-full" size="lg">
        متابعة الدفع
      </Button>
    </div>
  );
}
