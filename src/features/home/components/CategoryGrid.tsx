import Link from "next/link";
import { Img } from "@/shared/components/ui/Image";
import type { CategoryTile } from "@/services/server/categories";

/**
 * Deterministic gradient per tile so a category keeps the same look between
 * renders. Used only until real artwork is uploaded.
 */
const FALLBACK_GRADIENTS = [
  "from-primary/12 to-primary/4",
  "from-accent/16 to-accent/4",
  "from-success/12 to-success/4",
  "from-primary/8 to-accent/8",
  "from-sale/10 to-sale/3",
  "from-muted to-surface-sunken",
];

interface CategoryGridProps {
  categories: CategoryTile[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {categories.map((category, i) => (
        <Link
          key={category.id}
          href={`/${category.slug}`}
          className="group/tile flex flex-col overflow-hidden rounded-xl border border-border bg-surface-raised transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
        >
          <div className="relative aspect-4/3 overflow-hidden bg-white">
            {category.imageUrl ? (
              <Img
                src={category.imageUrl}
                alt={category.name}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 200px"
                className="object-contain p-3 transition-transform duration-300 group-hover/tile:scale-105"
              />
            ) : (
              /*
               * No category has an `image_url` yet. Rather than block the
               * section, fall back to a typographic tile — it upgrades to the
               * real image automatically once one is uploaded.
               */
              <div
                className={`flex h-full items-center justify-center bg-linear-to-br p-3 ${
                  FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length]
                }`}
              >
                <span className="text-center text-base leading-tight font-bold text-foreground/70">
                  {category.name}
                </span>
              </div>
            )}
          </div>

          <div className="p-3 text-center">
            <p className="line-clamp-1 text-sm font-semibold group-hover/tile:text-primary">
              {category.name}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {category.productCount} منتج
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
