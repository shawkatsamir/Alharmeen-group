"use client";

import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/shared/components/ui/Button";
import { CountBadge } from "@/shared/components/ui/CountBadge";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function CartButton() {
  const [mounted, setMounted] = useState(false);
  const itemCount = useCartStore((state) => state.itemCount());

  // Handle hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    // `asChild` renders one <a>; a <button> inside a link is invalid nesting.
    <Button asChild className="relative" size="icon" variant="ghost">
      <Link href="/cart" aria-label="السلة">
        {/* `size-5`, not `h-5 w-5`: Button forces `size-4` on any icon without a `size-` class. */}
        <ShoppingCart className="size-5" />
        {mounted && <CountBadge count={itemCount} />}
      </Link>
    </Button>
  );
}
