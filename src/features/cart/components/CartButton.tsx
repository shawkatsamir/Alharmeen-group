"use client";

import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/shared/components/ui/Button";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/shared/components/ui/Badge";

export function CartButton() {
  const [mounted, setMounted] = useState(false);
  const itemCount = useCartStore((state) => state.itemCount());

  // Handle hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Link href="/cart">
      <Button className="relative" size="icon" variant="ghost">
        <ShoppingCart className="h-5 w-5" />
        {mounted && itemCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full p-0 text-xs"
          >
            {itemCount}
          </Badge>
        )}
      </Button>
    </Link>
  );
}
