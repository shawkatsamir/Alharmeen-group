"use server";

import { requireAdmin } from "@/features/admin/lib/require-admin";
import { HIGHLIGHT_PRIORITY } from "@/features/products/lib/specifications";

/**
 * Spec key/value suggestions, derived from what a category already uses.
 *
 * `products.specifications` is a free-form jsonb object, and the catalog's
 * consistency is entirely a product of one person typing the same Arabic keys
 * every time: `الضمان` appears on 70 of 75 products, `النوع` on 69, `السعة` on
 * 56, and 26 refrigerators share 46 keys.
 *
 * That consistency is load-bearing rather than cosmetic. `groupSpecifications()`
 * matches keys by **exact string**, so a single `السعه` instead of `السعة` drops
 * that row into the catch-all "المواصفات التفصيلية" group and out of
 * `pickSpecHighlights()`, and it makes the two products incomparable. A plain
 * free-text field would erode it within weeks, so the editor suggests instead.
 *
 * Aggregation happens in JS rather than SQL because PostgREST cannot express
 * `jsonb_object_keys` + group-by — the same reason `services/server/categories.ts`
 * aggregates in JS. The volume is trivial (75 products, ~46 keys each).
 */

export interface SpecSuggestion {
  key: string;
  /** How many products in this category use the key — drives the ordering. */
  uses: number;
  /** Distinct values already used for this key, most common first. */
  values: string[];
  /** True when the key can surface next to the price via `pickSpecHighlights`. */
  isHighlight: boolean;
}

const MAX_VALUES_PER_KEY = 12;

export async function getSpecKeySuggestions(
  categoryId: string,
): Promise<SpecSuggestion[]> {
  const guard = await requireAdmin();
  if (!guard.ok) return [];

  const { data, error } = await guard.supabase
    .from("products")
    .select("specifications")
    .eq("category_id", categoryId)
    .not("specifications", "is", null);

  if (error) {
    console.error("[getSpecKeySuggestions] read failed:", error);
    return [];
  }

  const keyUses = new Map<string, number>();
  const keyValues = new Map<string, Map<string, number>>();

  for (const row of data ?? []) {
    const specs = row.specifications;
    if (!specs || typeof specs !== "object" || Array.isArray(specs)) continue;

    for (const [rawKey, rawValue] of Object.entries(
      specs as Record<string, unknown>,
    )) {
      const key = rawKey.trim();
      if (!key) continue;

      keyUses.set(key, (keyUses.get(key) ?? 0) + 1);

      // Only scalar values are worth suggesting; the nested shapes that
      // `stringifyValue` flattens at render time would be misleading here.
      const value = typeof rawValue === "string" ? rawValue.trim() : "";
      if (!value) continue;

      if (!keyValues.has(key)) keyValues.set(key, new Map());
      const values = keyValues.get(key)!;
      values.set(value, (values.get(value) ?? 0) + 1);
    }
  }

  const highlights = new Set<string>(HIGHLIGHT_PRIORITY);

  return [...keyUses.entries()]
    .map(([key, uses]) => ({
      key,
      uses,
      isHighlight: highlights.has(key),
      values: [...(keyValues.get(key)?.entries() ?? [])]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ar"))
        .slice(0, MAX_VALUES_PER_KEY)
        .map(([value]) => value),
    }))
    // Most-used first: the keys the store owner reaches for are at the top.
    .sort((a, b) => b.uses - a.uses || a.key.localeCompare(b.key, "ar"));
}
