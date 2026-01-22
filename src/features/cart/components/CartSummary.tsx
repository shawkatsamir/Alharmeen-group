import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/shared/components/ui/Button";

export function CartSummary() {
  const { total, items } = useCartStore();
  const subtotal = total();
  // We can add shipping logic later if needed
  const shipping = 0;

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

      <Button onClick={handleCheckout} className="w-full" size="lg">
        متابعة الدفع
      </Button>
    </div>
  );
}
