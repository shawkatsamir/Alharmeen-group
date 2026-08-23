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
  group_id: string | null;
  category: { slug: string; parent: { slug: string } | null } | null;
  brand: { slug: string } | null;
};

export type ProductContext = Pick<
  ProductRevalidationTarget,
  "slug" | "categorySlug" | "parentSlug" | "brandSlug"
> & {
  /** Needed to fan revalidation out across the product's colour siblings. */
  groupId: string | null;
};

const CONTEXT_SELECT =
  "slug, group_id, category:categories(slug, parent:parent_id(slug)), brand:brands(slug)";

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
    groupId: row.group_id ?? null,
    categorySlug: row.category?.slug ?? null,
    parentSlug: row.category?.parent?.slug ?? null,
    brandSlug: row.brand?.slug ?? null,
  };
}

/**
 * Slugs of every other active variant in a group.
 *
 * Returns `[]` for an ungrouped product. The product's own slug is included by
 * the caller through `target.slug`, so it is excluded here to keep the set
 * meaningful on its own.
 */
export async function fetchSiblingSlugs(
  supabase: SupabaseClient<Database>,
  groupId: string | null | undefined,
  excludeProductId?: string,
): Promise<string[]> {
  if (!groupId) return [];

  let query = supabase
    .from("products")
    .select("slug")
    .eq("group_id", groupId);

  if (excludeProductId) query = query.neq("id", excludeProductId);

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => row.slug);
}

export { CONTEXT_SELECT, CONTEXT_SELECT_WITH_ID };
export type { ProductContextRow };
