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
      <div className="flex flex-col items-center justify-center h-[300px] gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-gray-500 text-sm">Loading items...</p>
      </div>
    );
  }

  // 3. Render the actual content
  return <OrderDetailModal order={order} items={items || []} />;
}
