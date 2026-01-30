"use client";

import { useQuery } from "@tanstack/react-query";
import { getProductPrice } from "../actions/get-product-price";

export function useRealtimePrice(initialData: any) {
  return useQuery({
    queryKey: ["product-price", initialData.id],
    queryFn: () => getProductPrice(initialData.id),
    initialData: initialData, // Start with the server data (Instant load)
    refetchOnWindowFocus: true, // ⚡ Update when user clicks back to this tab
    refetchInterval: 30000, // ⚡ Check every 30 seconds automatically
    staleTime: 1000 * 60, // Don't check more than once a minute unless focused
  });
}
