import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateOrderStatus } from "@/features/orders/actions/order-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function useUpdateOrderStatus() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      newStatus,
    }: {
      orderId: string;
      newStatus: string;
    }) => {
      const result = await updateOrderStatus(orderId, newStatus);
      if (!result.success) {
        throw new Error(result.message);
      }
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });

      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث الحالة");
    },
  });
}
