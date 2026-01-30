"use server";

import { createClient } from "@/lib/supabase/server";

export async function getProductPrice(productId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select("price, stock_quantity, is_available")
    .eq("id", productId)
    .single();

  return data;
}
