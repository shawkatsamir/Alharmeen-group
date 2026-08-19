import Link from "next/link";
import { ProductGrid } from "@/shared/components/ui/ProductGrid";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import type { Product } from "../types";

interface ProductListingPageProps {
  title: string;
  products: Product[];
  emptyMessage: string;
  subtitle?: string;
}

/**
 * Shared shell for the flat product listings.
 *
 * `/offers`, `/best-sellers` and `/featured` were byte-for-byte identical apart
 * from the fetcher, the heading and the empty-state string.
 */
export function ProductListingPage({
  title,
  products,
  emptyMessage,
  subtitle,
}: ProductListingPageProps) {
  return (
    <div className="bg-surface">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="border-r-4 border-primary pr-4 text-2xl font-bold sm:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 pr-4 text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            {products.length} {products.length === 1 ? "منتج" : "منتجات"}
          </span>
        </div>

        {products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <EmptyState
            title={emptyMessage}
            action={
              <Link
                href="/"
                className="text-sm font-medium text-primary hover:underline"
              >
                العودة إلى الرئيسية
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
