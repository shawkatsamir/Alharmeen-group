import { ProductCard } from "@/features/products/components/ProductCard";
import type { Product } from "@/features/products/types";
import { cn } from "@/lib/utils";

interface ProductGridProps {
  products: Product[];
  wishlistIds?: string[];
  className?: string;
  /** How many cards get `priority` image loading. */
  priorityCount?: number;
}

/**
 * The single responsive product grid.
 *
 * Previously five near-duplicate inline grids existed with inconsistent
 * breakpoints — offers/best-sellers/featured used `md:3 lg:4 gap-6`, wishlist
 * used `gap-4` with no `h-full`, and the subcategory listing skipped the `md:`
 * step entirely and went to 4 columns only at `xl`.
 */
export function ProductGrid({
  products,
  wishlistIds,
  className,
  priorityCount = 4,
}: ProductGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6",
        className,
      )}
    >
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={index < priorityCount}
          isWishlisted={wishlistIds?.includes(product.id)}
        />
      ))}
    </div>
  );
}
