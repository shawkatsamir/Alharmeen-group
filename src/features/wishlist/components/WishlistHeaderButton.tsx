"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
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

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="relative text-gray-700">
        <Heart className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <Link href="/wishlist">
      <Button
        variant="ghost"
        size="icon"
        className="relative text-gray-700 hover:text-red-500 hover:bg-red-50"
      >
        <Heart
          className={`w-6 h-6 ${count > 0 ? "fill-red-500 text-red-500" : ""}`}
        />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
            {count}
          </span>
        )}
      </Button>
    </Link>
  );
}
