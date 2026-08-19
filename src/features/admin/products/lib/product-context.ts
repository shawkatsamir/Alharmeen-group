import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/types/database.types";

import type { ProductRevalidationTarget } from "./revalidate-product";

/**
 * Everything `revalidateProduct` needs, in one round trip.
 *
 * The category embed uses the FK-column hint `parent:parent_id(*)`. Hinting the
 * table instead (`categories!parent_id`) resolves to-many and returns the
 * category's *children*, which is the mistake that once prerendered every
 * product page as a 404 — see `getProductBySlug` in `services/server/products.ts`.
 */
type ProductContextRow = {
  slug: string;
  category: { slug: string; parent: { slug: string } | null } | null;
  brand: { slug: string } | null;
};

export type ProductContext = Pick<
  ProductRevalidationTarget,
  "slug" | "categorySlug" | "parentSlug" | "brandSlug"
>;

const CONTEXT_SELECT =
  "slug, category:categories(slug, parent:parent_id(slug)), brand:brands(slug)";

/** Same shape plus the id, for the `insert(...).select(...)` on create. */
const CONTEXT_SELECT_WITH_ID = `id, ${CONTEXT_SELECT}`;

export async function fetchProductContext(
  supabase: SupabaseClient<Database>,
  productId: string,
): Promise<ProductContext | null> {
  const { data, error } = await supabase
    .from("products")
    .select(CONTEXT_SELECT)
    .eq("id", productId)
    .single();

  if (error || !data) return null;

  return toContext(data as unknown as ProductContextRow);
}

export function toContext(row: ProductContextRow): ProductContext {
  return {
    slug: row.slug,
    categorySlug: row.category?.slug ?? null,
    parentSlug: row.category?.parent?.slug ?? null,
    brandSlug: row.brand?.slug ?? null,
  };
}

export { CONTEXT_SELECT, CONTEXT_SELECT_WITH_ID };
export type { ProductContextRow };
