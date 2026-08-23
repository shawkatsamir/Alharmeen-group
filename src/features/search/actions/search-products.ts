"use server";

import { createClient } from "@/lib/supabase/server";
import { collapseToRepresentatives } from "@/features/products/lib/variant-group";
import type { Database } from "@/shared/types/database.types";

/**
 * A row from the `search_products` RPC — a full `products` row.
 *
 * Named explicitly because `collapseToRepresentatives` is generic and the RPC's
 * return type is a union wide enough that inference falls back to the generic
 * constraint, which would erase every field the dropdown reads.
 */
type SearchProductRow =
  Database["public"]["Functions"]["search_products"]["Returns"][number];

/** How many suggestions the dropdown shows. */
const RESULT_LIMIT = 5;

/**
 * Over-fetch before collapsing.
 *
 * A query like "ثلاجة شارب 450" matches all three finishes of SJ-58C, which
 * would otherwise fill the entire five-row dropdown with one product. Asking
 * the RPC for five and then collapsing would leave two or three suggestions, so
 * the limit is applied after grouping instead of before it.
 */
const FETCH_LIMIT = RESULT_LIMIT * 4;

export async function searchProducts(query: string) {
  if (!query || query.length < 2) return [];

  const supabase = await createClient();

  // Call the efficient RPC function
  const { data, error } = await supabase.rpc("search_products", {
    search_term: query,
    limit_count: FETCH_LIMIT,
  });

  if (error || !data) {
    if (error) console.error(error);
    return [];
  }

  /*
   * `collapseToRepresentatives` preserves the order it was given, so the RPC's
   * relevance ranking survives: a group surfaces at the rank of its
   * best-matching variant, represented by its primary (or its cheapest member).
   *
   * `data` is narrowed above rather than defaulted with `?? []`, so the empty
   * case does not widen the array type.
   */
  return collapseToRepresentatives<SearchProductRow>(data).slice(0, RESULT_LIMIT);
}
