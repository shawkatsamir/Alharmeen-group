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
      variant="outline"
      size="icon"
      onClick={handleToggle}
      disabled={isLoading}
      aria-pressed={isWishlisted}
      aria-label={isWishlisted ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
      className="rounded-full shadow-sm hover:text-sale"
    >
      <Heart
        className={`w-4 h-4 transition-colors ${
          isWishlisted ? "fill-sale text-sale" : "text-muted-foreground"
        }`}
      />
    </Button>
  );
}
