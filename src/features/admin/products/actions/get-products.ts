"use server";

import { createClient } from "@/lib/supabase/server";

export type AdminProductStatus =
  | "all"
  | "featured"
  | "onSale"
  | "outOfStock"
  | "archived";

/**
 * `all` means "everything on the storefront", so it excludes archived rows —
 * archiving is the delete action, and an archived product reappearing in the
 * default list would make the button look like it had done nothing. Archived
 * products get their own tab.
 */
function applyStatus<T extends { eq: (c: string, v: unknown) => T }>(
  query: T,
  status: AdminProductStatus,
): T {
  switch (status) {
    case "featured":
      return query.eq("is_active", true).eq("is_featured", true);
    case "onSale":
      return query.eq("is_active", true).eq("is_special_offer", true);
    case "outOfStock":
      return query.eq("is_active", true).eq("stock_quantity", 0);
    case "archived":
      return query.eq("is_active", false);
    case "all":
    default:
      return query.eq("is_active", true);
  }
}

export async function getAdminProducts(options?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: AdminProductStatus;
}) {
  const supabase = await createClient();
  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("products")
    .select(
      `
            *,
            images:product_images(*)
        `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  // Search by SKU
  if (options?.search) {
    query = query.ilike("sku", `%${options.search}%`);
  }

  query = applyStatus(query, options?.status ?? "all");

  // Pagination
  query = query.range(from, to);

  const { data: products, error, count } = await query;

  if (error) {
    console.error("Error fetching admin products:", error);
    return { products: [], count: 0 };
  }

  return { products, count: count || 0 };
}

export interface AdminProductCounts {
  all: number;
  featured: number;
  onSale: number;
  outOfStock: number;
  archived: number;
}

/**
 * Counts for the tab badges.
 *
 * `head: true` with `count: "exact"` fetches no rows, so this is five cheap
 * count queries rather than five result sets. They previously read `0` because
 * the list query only ever knows the count of the tab you are already on.
 */
export async function getAdminProductCounts(
  search?: string,
): Promise<AdminProductCounts> {
  const supabase = await createClient();

  const statuses: AdminProductStatus[] = [
    "all",
    "featured",
    "onSale",
    "outOfStock",
    "archived",
  ];

  const results = await Promise.all(
    statuses.map(async (status) => {
      let query = supabase
        .from("products")
        .select("id", { count: "exact", head: true });

      if (search) query = query.ilike("sku", `%${search}%`);
      query = applyStatus(query, status);

      const { count, error } = await query;
      if (error) {
        console.error(`Error counting admin products (${status}):`, error);
        return [status, 0] as const;
      }
      return [status, count ?? 0] as const;
    }),
  );

  return Object.fromEntries(results) as unknown as AdminProductCounts;
}
