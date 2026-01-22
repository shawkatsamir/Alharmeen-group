"use client";

import { useCartStore } from "@/stores/cartStore";
import { CartItem } from "@/features/cart/components/CartItem";
import { CartSummary } from "@/features/cart/components/CartSummary";
import Link from "next/link";
import { Button } from "@/shared/components/ui/Button";
import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

export default function CartPage() {
  const [mounted, setMounted] = useState(false);
  const { items } = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="py-12 min-h-[60vh]">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">سلة التسوق</h1>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-gray-100 p-6 rounded-full mb-6">
              <ShoppingBag className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">السلة فارغة</h2>
            <p className="text-gray-500 mb-8 max-w-sm">
              لم تقم بإضافة أي منتجات للسلة بعد. تصفح منتجاتنا واختر ما يناسبك.
            </p>
            <Link href="/">
              <Button size="lg">تسوق الآن</Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-100 p-6">
                {items.map((item) => (
                  <CartItem key={item.id} item={item} />
                ))}
              </div>
            </div>
            <div className="lg:col-span-1">
              <CartSummary />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
