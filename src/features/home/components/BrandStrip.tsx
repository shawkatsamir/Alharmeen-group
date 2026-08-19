import Link from "next/link";
import { Img } from "@/shared/components/ui/Image";
import type { Brand } from "@/features/products/types";

/**
 * Every brand currently has `logo_url = NULL`, so the default rendering is a
 * wordmark chip. It swaps to the real logo automatically once uploaded.
 */
export function BrandStrip({ brands }: { brands: Brand[] }) {
  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 sm:overflow-visible lg:grid-cols-8">
      {brands.map((brand) => (
        <Link
          key={brand.id}
          href={`/brand/${brand.slug}`}
          className="flex h-20 min-w-32 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-raised px-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:min-w-0"
        >
          {brand.logo_url ? (
            <div className="relative h-full w-full">
              <Img
                src={brand.logo_url}
                alt={brand.name_ar}
                fill
                sizes="128px"
                className="object-contain p-3"
              />
            </div>
          ) : (
            <span className="text-center text-sm font-bold tracking-wide text-muted-foreground">
              {brand.name_ar}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
