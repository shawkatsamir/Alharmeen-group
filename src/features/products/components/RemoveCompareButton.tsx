"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { useCompareStore } from "@/stores/compareStore";
import { Button } from "@/shared/components/ui/Button";
import { toast } from "sonner"; // Optional: Remove if you don't use sonner

interface RemoveCompareButtonProps {
  productId: string;
}

export default function RemoveCompareButton({
  productId,
}: RemoveCompareButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const removeItem = useCompareStore((state) => state.removeItem);

  const handleRemove = (e: React.MouseEvent) => {
    // Prevent clicking the product card link underneath (if any)
    e.preventDefault();
    e.stopPropagation();

    // 1. Remove from Client Store (Zustand)
    // This updates the floating bar immediately
    removeItem(productId);

    // 2. Remove from URL (Server State)
    // This forces the Compare Page to re-fetch with the new list
    const currentParams = new URLSearchParams(searchParams.toString());
    const productIds = currentParams.get("products")?.split(",") || [];

    // Filter out the ID we want to remove
    const newProductIds = productIds.filter((id) => id !== productId);

    if (newProductIds.length > 0) {
      // Update the URL with the remaining IDs
      currentParams.set("products", newProductIds.join(","));
      router.replace(`/compare?${currentParams.toString()}`, { scroll: false });
    } else {
      // If list is empty, clear the query entirely
      router.replace("/compare");
    }

    toast.success("تم حذف المنتج من المقارنة");
  };

  return (
    <Button
      variant="destructive"
      size="icon"
      className="h-8 w-8 rounded-full shadow-md hover:scale-105 transition-all bg-red-500 hover:bg-red-600 text-white"
      onClick={handleRemove}
      title="حذف من المقارنة"
      aria-label="Remove from comparison"
    >
      <X className="w-4 h-4" />
    </Button>
  );
}
