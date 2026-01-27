import {
  OrderCard,
  Order as OrderCardType,
} from "@/features/orders/components/OrderCard";
import { Button } from "@/shared/components/ui/Button";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getOrders } from "@/services/server/orders";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const dbOrders = await getOrders(user.id);

  // Map DB orders to component props
  const orders: OrderCardType[] = dbOrders.map((order) => ({
    id: order.id,
    number: order.id.slice(0, 8).toUpperCase(), // Use first 8 chars of UUID as display number for now
    date: new Date(order.created_at).toLocaleDateString("en-GB"),
    status: order.status as OrderCardType["status"],
    total: order.total,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.product_name,
      image: item.product_image,
      price: item.unit_price,
      quantity: item.quantity,
    })),
  }));

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl" dir="rtl">
      <div className="flex items-center gap-2 mb-8 text-sm text-gray-500">
        <Link href="/account" className="hover:text-gray-900 transition-colors">
          حسابي
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">طلباتي</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          طلباتي
        </h1>
      </div>

      <div className="space-y-6">
        {orders.length > 0 ? (
          orders.map((order) => <OrderCard key={order.id} order={order} />)
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              لا توجد طلبات حتى الآن
            </h3>
            <p className="text-gray-500 mb-6">
              ابدأ التسوق واستمتع بمنتجاتنا المميزة
            </p>
            <Link href="/">
              <Button>تصفح المنتجات</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
