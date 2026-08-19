"use client";

import { useEffect, useState } from "react";

import { useCompareStore } from "@/stores/compareStore";
import { Button } from "@/shared/components/ui/Button";
import { ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

export default function CompareToggle({ productId }: { productId: string }) {
  const { ids, addItem, removeItem } = useCompareStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const isSelected = mounted && ids.includes(productId);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSelected) {
      removeItem(productId);
      toast.info("تم إزالة المنتج من المقارنة");
    } else {
      if (ids.length >= 4) {
        toast.error("يمكنك مقارنة 4 منتجات كحد أقصى");
        return;
      }
      addItem(productId);
      toast.success("تم إضافة المنتج إلى المقارنة");
    }
  };

  return (
    <Button
      size="icon"
      variant={isSelected ? "default" : "outline"}
      onClick={handleToggle}
      aria-pressed={isSelected}
      aria-label={isSelected ? "إزالة من المقارنة" : "إضافة إلى المقارنة"}
      className="rounded-full shadow-sm"
    >
      <ArrowRightLeft className="w-4 h-4" />
    </Button>
  );
}
