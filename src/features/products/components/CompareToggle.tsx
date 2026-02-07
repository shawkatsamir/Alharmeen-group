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
      toast.info("Removed from comparison");
    } else {
      if (ids.length >= 4) {
        toast.error("Max 4 items allowed");
        return;
      }
      addItem(productId);
      toast.success("Added to comparison");
    }
  };

  return (
    <Button
      size="icon"
      variant={isSelected ? "default" : "outline"}
      onClick={handleToggle}
      className={isSelected ? "bg-blue-600 hover:bg-blue-700" : ""}
    >
      <ArrowRightLeft className="w-4 h-4" />
    </Button>
  );
}
