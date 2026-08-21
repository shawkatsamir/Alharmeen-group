"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  recordPayment,
  voidPayment,
  type RecordPaymentInput,
} from "@/features/orders/actions/payment-actions";

/**
 * Same shape as useUpdateOrderStatus: the action returns {success, message},
 * the hook turns a failure into a thrown error so react-query routes it to
 * onError, and both the order list and its stat cards are invalidated because
 * recording money changes the payment column and the dashboard totals.
 */
function useOrderMutation<TVars>(
  mutationFn: (vars: TVars) => Promise<{ success: boolean; message: string }>,
  fallbackError: string,
) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: TVars) => {
      const result = await mutationFn(vars);
      if (!result.success) {
        throw new Error(result.message);
      }
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders-stats"] });
      queryClient.invalidateQueries({ queryKey: ["order-payments"] });
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error(error.message || fallbackError);
    },
  });
}

export function useRecordPayment() {
  return useOrderMutation<{ orderId: string; input: RecordPaymentInput }>(
    ({ orderId, input }) => recordPayment(orderId, input),
    "حدث خطأ أثناء تسجيل الدفعة",
  );
}

export function useVoidPayment() {
  return useOrderMutation<{ paymentId: string }>(
    ({ paymentId }) => voidPayment(paymentId),
    "حدث خطأ أثناء إلغاء الدفعة",
  );
}
