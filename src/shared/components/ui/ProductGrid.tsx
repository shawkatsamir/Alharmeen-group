import { ProductCard } from "@/features/products/components/ProductCard";
import type { AxisRegistry } from "@/features/products/constants/variant-axes";
import { collapseVariants } from "@/features/products/lib/variant-group";
import type { Product } from "@/features/products/types";
import { cn } from "@/lib/utils";

interface ProductGridProps {
  products: Product[];
  wishlistIds?: string[];
  className?: string;
  /** How many cards get `priority` image loading. */
  priorityCount?: number;
  /**
   * Render one card per variant instead of one per group. Only for surfaces
   * where each row is genuinely its own item — the admin tables, or a wishlist
   * where the shopper saved a specific colour.
   */
  expandVariants?: boolean;
  /**
   * Resolved axis registry, for the colour swatch row on a grouped card.
   *
   * Optional, and absent on most listings on purpose: a card only needs it to
   * know which of a group's axes is the COLOUR one, and the built-in defaults
   * already answer that for every colour axis the catalogue has. Pass it from
   * a route that has it to hand so an axis the admin newly declared as a colour
   * axis also gets swatches.
   */
  axisRegistry?: AxisRegistry;
}

/**
 * The single responsive product grid.
 *
 * Previously five near-duplicate inline grids existed with inconsistent
 * breakpoints — offers/best-sellers/featured used `md:3 lg:4 gap-6`, wishlist
 * used `gap-4` with no `h-full`, and the subcategory listing skipped the `md:`
 * step entirely and went to 4 columns only at `xl`.
 *
 * ---------------------------------------------------------------------------
 * Variant collapsing happens HERE, not at the call sites.
 *
 * Every listing renders through this component, so doing it here means the
 * category grid, the offers/featured/best-seller pages and the brand pages all
 * stop repeating three near-identical fridges without any of them changing.
 *
 * It also gets the ordering right by construction: callers filter and sort
 * first and pass the result in, so collapsing necessarily runs *after*
 * filtering. Collapsing earlier could pick a representative that the shopper's
 * price filter had already excluded, and the card would advertise a price
 * outside the range they asked for.
 * ---------------------------------------------------------------------------
 */
export function ProductGrid({
  products,
  wishlistIds,
  className,
  priorityCount = 4,
  expandVariants = false,
  axisRegistry,
}: ProductGridProps) {
  const entries = expandVariants
    ? products.map((product) => ({ representative: product, members: [product] }))
    : collapseVariants(products);

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6",
        className,
      )}
    >
      {entries.map(({ representative, members }, index) => (
        <ProductCard
          key={representative.id}
          product={representative}
          variants={members}
          priority={index < priorityCount}
          isWishlisted={wishlistIds?.includes(representative.id)}
          axisRegistry={axisRegistry}
        />
      ))}
    </div>
  );
}
