"use client";

import { useMutation } from "@tanstack/react-query";
import { cancelMyOrder } from "../actions/cancel-order";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function useCancelOrder() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const result = await cancelMyOrder(orderId);
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: () => {
      toast.success("تم إلغاء الطلب");
      router.refresh(); // Refreshes the Server Component (Order List)
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
}
