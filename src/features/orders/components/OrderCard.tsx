import Link from "next/link";
import { Img } from "@/shared/components/ui/Image";
import { Button } from "@/shared/components/ui/Button";
import { ChevronLeft } from "lucide-react";
import { OrderTracker } from "./OrderTracker";
import { CancelOrderButton } from "./CancleOrderButton";
import {
  STATUS_COLORS,
  isOrderStatus,
  type OrderStatus,
} from "../constants/order-status";
import { cn, formatCurrency } from "@/lib/utils";

interface OrderItem {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  number: string;
  date: string;
  // Previously a hand-written union missing مرتجع and تم التأكيد, which the
  // orders page then defeated with an `as` cast.
  status: OrderStatus;
  total: number;
  items: OrderItem[];
}

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  return (
    <div className="bg-card border-border overflow-hidden rounded-lg border">
      <div className="p-4 sm:p-6">
        {/*
         * Phone: order number and status on one line, then the total and the
         * cancel action. As a single `flex-wrap` row the cancel button landed
         * in a different place depending on how long the status word was.
         */}
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-foreground font-semibold">
                طلب #{order.number}
              </span>
              <span className="text-muted-foreground text-sm">
                • {order.date}
              </span>
            </div>
            {/*
             * The status was always rendered in the same green, so a
             * cancelled order announced itself in the success colour. These
             * are the shared per-status pill classes.
             */}
            <span
              className={cn(
                "inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                isOrderStatus(order.status)
                  ? STATUS_COLORS[order.status]
                  : "bg-surface-sunken text-muted-foreground border-border",
              )}
            >
              {order.status}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="text-foreground text-lg font-bold tabular-nums">
              {formatCurrency(order.total)}
            </span>
            <CancelOrderButton orderId={order.id} status={order.status} />
          </div>
        </div>

        <div className="mb-4 sm:mb-6">
          <OrderTracker currentStatus={order.status} />
        </div>

        <div className="space-y-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 sm:gap-4">
              <div className="bg-surface-sunken relative size-16 shrink-0 overflow-hidden rounded-md">
                <Img
                  src={item.image}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-foreground line-clamp-2 text-sm font-medium">
                  {item.name}
                </h4>
                <p className="text-muted-foreground text-sm tabular-nums">
                  {item.quantity} x {formatCurrency(item.price)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-sunken flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="text-muted-foreground text-sm">
          {order.items.length} منتجات
        </div>
        <Button asChild variant="outline" size="sm" className="h-11 gap-2 sm:h-8">
          <Link href={`/account/orders/${order.id}`}>
            تفاصيل الطلب
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
