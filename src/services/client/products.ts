import { createClient } from "@/lib/supabase/client";
import type { Brand, Category, Product } from "@/features/products/types";

export type { Product };

export async function getProducts(options?: {
  limit?: number;
  offset?: number;
  featured?: boolean;
  isActive?: boolean;
}): Promise<Product[]> {
  const supabase = createClient();
  let query = supabase.from("products").select(`
      *,
      brand:brands(*),
      category:categories(*),
      images:product_images(*)
    `);

  if (options?.featured !== undefined) {
    query = query.eq("is_featured", options.featured);
  }

  if (options?.isActive !== undefined) {
    query = query.eq("is_active", options.isActive);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 10) - 1
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching products (client):", error);
    return [];
  }

  return data as Product[];
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      brand:brands(*),
      category:categories(*),
      images:product_images(*)
    `
    )
    .eq("slug", slug)
    .single();

  if (error) {
    console.error(`Error fetching product with slug ${slug} (client):`, error);
    return null;
  }

  return data as Product;
}

export async function getBrands(): Promise<Brand[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching brands (client):", error);
    return [];
  }

  return data;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching categories (client):", error);
    return [];
  }

  return data;
}
