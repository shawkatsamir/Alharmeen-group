"use server";

import { createClient } from "@/lib/supabase/server";

export async function getLowStockProducts() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name_ar, stock_quantity, low_stock_threshold, sku")
    .eq("is_active", true)
    .order("stock_quantity", { ascending: true });

  if (error) {
    console.error("Error fetching low stock products:", error);
    return [];
  }

  const lowStockProducts = data
    .filter((product) => product.stock_quantity <= product.low_stock_threshold)
    .slice(0, 5);

  return lowStockProducts;
}
