"use server";

import { createClient } from "@/lib/supabase/server";

export async function getAdminProducts(options?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: "all" | "featured" | "onSale" | "outOfStock";
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

  // Search
  if (options?.search) {
    query = query.ilike("name_en", `%${options.search}%`); // Assuming name_en is the primary name, or use 'name' if changed
  }

  // Filter by status
  if (options?.status) {
    switch (options.status) {
      case "featured":
        query = query.eq("is_featured", true);
        break;
      case "onSale":
        query = query.eq("is_special_offer", true); // Assuming special offer means on sale
        break;
      case "outOfStock":
        query = query.eq("stock_quantity", 0);
        break;
      case "all":
      default:
        break;
    }
  }

  // Pagination
  query = query.range(from, to);

  const { data: products, error, count } = await query;

  if (error) {
    console.error("Error fetching admin products:", error);
    return { products: [], count: 0 };
  }

  return { products, count: count || 0 };
}
