"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { useWishlist } from "../context/wishlist-context";

interface WishlistButtonProps {
  productId: string;
  isWishlisted?: boolean;
}

export default function WishlistButton({ productId }: WishlistButtonProps) {
  const { wishlistIds, toggleItem } = useWishlist();
  const isWishlisted = wishlistIds.has(productId);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating if this is inside a Link card
    e.stopPropagation();

    setIsLoading(true);
    await toggleItem(productId);
    setIsLoading(false);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      disabled={isLoading}
      className="hover:text-red-500"
    >
      <Heart
        className={`w-6 h-6 transition-colors ${
          isWishlisted ? "fill-red-500 text-red-500" : "text-gray-500"
        }`}
      />
    </Button>
  );
}
