"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { OrderDetailModal } from "./OrderDetailsModal";
import { getOrderItems } from "@/services/client/orders";
import { Order } from "@/services/server/orders";

export default function OrderDetailModalWrapper({ order }: { order: Order }) {
  // 1. Fetch items automatically when this component mounts (which happens when Modal opens)
  const { data: items, isLoading } = useQuery({
    queryKey: ["order-items", order.id],
    queryFn: () => getOrderItems(order.id),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // 2. Show loading spinner inside the modal while fetching
  if (isLoading) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center gap-2">
        <Loader2 className="text-primary size-8 animate-spin" />
        <p className="text-muted-foreground text-sm">جاري تحميل الأصناف...</p>
      </div>
    );
  }

  // 3. Render the actual content
  return <OrderDetailModal order={order} items={items || []} />;
}
