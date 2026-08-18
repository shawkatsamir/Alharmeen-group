import Link from "next/link";
import type { CategoryTile } from "@/services/server/categories";

/**
 * Text-only chips for every subcategory that actually has products.
 * Cheap depth, and strong internal linking for crawlers — no imagery needed.
 */
export function SubcategoryLinks({
  categories,
}: {
  categories: CategoryTile[];
}) {
  const groups = categories
    .map((category) => ({
      category,
      subcategories: category.subcategories.filter((s) => s.productCount > 0),
    }))
    .filter((g) => g.subcategories.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map(({ category, subcategories }) => (
        <div key={category.id}>
          <Link
            href={`/${category.slug}`}
            className="text-sm font-bold hover:text-primary"
          >
            {category.name}
          </Link>
          <ul className="mt-3 flex flex-wrap gap-2">
            {subcategories.map((sub) => (
              <li key={sub.id}>
                <Link
                  href={`/${category.slug}/${sub.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
                >
                  {sub.name}
                  <span className="text-[10px] opacity-70">
                    {sub.productCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
