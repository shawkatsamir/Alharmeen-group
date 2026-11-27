import { cache } from "react";

import { createStaticClient } from "@/lib/supabase/server";
import { AXIS_REGISTRY, type AxisRegistry } from "@/features/products/constants/variant-axes";
import { mergeAxisRegistry } from "@/features/products/lib/axis-registry";

/**
 * The resolved variant-axis registry: `variant_axes` rows merged over the
 * built-in defaults in `features/products/constants/variant-axes.ts`.
 *
 * ---------------------------------------------------------------------------
 * Why this is read, and why it can never fail closed.
 *
 * Presentation metadata for an axis (Arabic label, render kind, schema.org
 * property) used to be a TypeScript literal, so giving a newly invented axis a
 * proper label meant a release — and the catalogue keeps inventing them:
 * `نوع الشواية` was not anticipated, nor was `نوع الشاشة`. It is data now.
 *
 * But the storefront must not acquire a new way to break. Every failure path
 * here returns the built-in defaults, which is exactly the previous behaviour,
 * and `resolveAxis` adds a per-axis fallback for an axis in neither.
 *
 * `createStaticClient()`, not the cookie-bound client: the product page is ISR
 * and reading cookies would opt the route out of static generation. The table
 * is world-readable precisely so this read needs no session.
 *
 * Wrapped in React `cache()` so one render resolves it once however many
 * components ask — the detail route reads it for the selector and again for
 * the JSON-LD.
 * ---------------------------------------------------------------------------
 */
export const getAxisRegistry = cache(async function getAxisRegistry(): Promise<
  AxisRegistry
> {
  const supabase = await createStaticClient();
  const { data, error } = await supabase
    .from("variant_axes")
    .select("key, label_ar, kind, schema_property, spec_aliases, display_order");

  if (error || !data) {
    if (error) console.error("Error fetching variant axes:", error);
    return AXIS_REGISTRY;
  }

  return mergeAxisRegistry(data);
});
