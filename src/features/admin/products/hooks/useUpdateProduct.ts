"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProduct, ProductUpdateData } from "../actions/update-product";
import { toast } from "sonner";

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: ProductUpdateData;
    }) => {
      const result = await updateProduct(id, data);
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: () => {
      toast.success("Product saved successfully");
      // Refresh the table automatically
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
}
