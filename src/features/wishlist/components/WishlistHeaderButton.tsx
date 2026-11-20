"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { CountBadge } from "@/shared/components/ui/CountBadge";
import { useWishlist } from "@/features/wishlist/context/wishlist-context";
import { useEffect, useState } from "react";

export function WishlistHeaderButton() {
  const { wishlistIds } = useWishlist();
  const [mounted, setMounted] = useState(false);
  const count = wishlistIds.size;

  useEffect(() => {
    // Avoid hydration mismatch and sync render warning
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const filled = mounted && count > 0;

  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link href="/wishlist" aria-label="المفضلة">
        <Heart
          className={`size-5 transition-colors ${filled ? "fill-sale text-sale" : ""}`}
        />
        {mounted && <CountBadge count={count} />}
      </Link>
    </Button>
  );
}
