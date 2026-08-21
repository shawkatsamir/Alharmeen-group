import Link from "next/link";
import { Button } from "@/shared/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle2, Package, Truck, MapPin } from "lucide-react";
import { PaymentInstructions } from "@/features/orders/components/PaymentInstructions";
import { getPaymentSettings } from "@/services/server/payment-settings";

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .single();

  if (error || !order) {
    console.error("Order not found or error:", error);
    notFound();
  }

  const paymentSettings = await getPaymentSettings();

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="mb-6 flex justify-center">
            <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-4">تم استلام طلبك بنجاح!</h1>
          <p className="text-gray-600 mb-2">
            رقم الطلب:{" "}
            <span className="font-mono font-medium">{order.order_number}</span>
          </p>
          <p className="text-gray-600">
            شكراً لتسوقك معنا. سنقوم بمراجعة طلبك والتواصل معك قريباً.
          </p>
        </div>

        {/* What the customer has to do next. Rendered here rather than pushed
            through the notifications table, which has no recipient column and
            so cannot address a guest order at all. */}
        <div className="mb-8">
          <PaymentInstructions
            orderNumber={order.order_number}
            total={order.total}
            amountPaid={order.amount_paid}
            paymentMethod={order.payment_method}
            settings={paymentSettings}
          />
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                تفاصيل الطلب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {order.order_items.map(
                  (item: {
                    id: string;
                    product_name: string;
                    quantity: number;
                    total_price: number;
                    product_image?: string | null;
                  }) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        {item.product_image && (
                          <div className="relative h-12 w-12 rounded overflow-hidden border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.product_image}
                              alt={item.product_name}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">
                            {item.product_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            الكمية: {item.quantity}
                          </p>
                        </div>
                      </div>
                      <p className="font-medium">
                        {formatCurrency(item.total_price)}
                      </p>
                    </div>
                  ),
                )}
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">المجموع الفرعي:</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">الشحن:</span>
                  <span>
                    {order.shipping_cost === 0
                      ? "مجاني"
                      : formatCurrency(order.shipping_cost)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                  <span>الإجمالي:</span>
                  <span className="text-primary">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  معلومات الشحن
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">{order.customer_name}</p>
                    <p className="text-gray-600 text-sm mt-1">
                      {order.shipping_address_line}
                      <br />
                      {order.shipping_city}, {order.shipping_governorate}
                    </p>
                    <p className="text-gray-600 text-sm mt-1" dir="ltr">
                      {order.customer_phone}
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
                  حالة الطلب:{" "}
                  <span className="font-medium text-primary">
                    {order.status}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Link href="/" className="block">
                <Button className="w-full" size="lg">
                  العودة للرئيسية
                </Button>
              </Link>
              <Link href="/account/orders" className="block">
                <Button variant="outline" className="w-full">
                  تتبع طلباتك
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
