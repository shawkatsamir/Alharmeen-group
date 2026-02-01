"use server";

import { createClient } from "@/lib/supabase/server";

export async function searchProducts(query: string) {
  if (!query || query.length < 2) return [];

  const supabase = await createClient();

  // Call the efficient RPC function
  const { data, error } = await supabase.rpc("search_products", {
    search_term: query,
    limit_count: 5,
  });

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}
