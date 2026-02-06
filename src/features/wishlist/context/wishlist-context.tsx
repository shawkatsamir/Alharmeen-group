"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { getWishlistIds, toggleWishlist } from "../actions/wishlist";
import { toast } from "sonner";

interface WishlistContextType {
  wishlistIds: Set<string>;
  toggleItem: (productId: string) => Promise<void>;
  isLoading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined,
);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const ids = await getWishlistIds();
        setWishlistIds(new Set(ids));
      } catch (error) {
        console.error("Failed to fetch wishlist", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWishlist();
  }, []);

  const toggleItem = useCallback(async (productId: string) => {
    // Optimistic update
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });

    try {
      const result = await toggleWishlist(productId);
      if (result.error) {
        // Revert on error
        setWishlistIds((prev) => {
          const next = new Set(prev);
          if (next.has(productId)) {
            next.delete(productId); // it was added safely, so remove it? Wait.
            // If we are reverting:
            // If we thought we added it (it wasn't there), we remove it.
            // If we thought we removed it (it was there), we add it back.
            // This logic is tricky with just "revert".
            // Better to sync with server or complex revert logic.
            // For now, let's just re-fetch or simple revert.

            // Simple revert based on previous state is hard without history.
            // Let's just fetchIds again to accept truth.
            return prev;
          }
          return prev;
        });
        // Actually, let's just refetch to be safe if error
        const ids = await getWishlistIds();
        setWishlistIds(new Set(ids));

        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error toggling wishlist", error);
      // Revert/Refetch
      const ids = await getWishlistIds();
      setWishlistIds(new Set(ids));
    }
  }, []);

  return (
    <WishlistContext.Provider value={{ wishlistIds, toggleItem, isLoading }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
