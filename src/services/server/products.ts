import { createStaticClient } from "@/lib/supabase/server";
import { Database } from "@/shared/types/database.types";

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  brand?: Database["public"]["Tables"]["brands"]["Row"];
  category?: Database["public"]["Tables"]["categories"]["Row"];
  images?: Database["public"]["Tables"]["product_images"]["Row"][];
};

type Brand = Database["public"]["Tables"]["brands"]["Row"];

export async function getProducts(options?: {
  limit?: number;
  offset?: number;
  featured?: boolean;
}): Promise<Product[]> {
  const supabase = await createStaticClient();
  let query = supabase
    .from("products")
    .select(
      `
      *,
      brand:brands(*),
      category:categories(*),
      images:product_images(*)
    `,
    )
    .eq("is_active", true);

  if (options?.featured) {
    query = query.eq("is_featured", true);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 10) - 1,
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

  return data as Product[];
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createStaticClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      brand:brands(*),
      category:categories(*),
      images:product_images(*)
    `,
    )
    .eq("slug", slug)
    .single();

  console.log(data);
  if (error) {
    console.error(`Error fetching product with slug ${slug}:`, error);
    return null;
  }

  return data as Product;
}

export async function getProductsByCategory(
  categoryId: string,
): Promise<Product[]> {
  const supabase = await createStaticClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      brand:brands(*),
      category:categories(*),
      images:product_images(*)
    `,
    )
    .eq("category_id", categoryId)
    .eq("is_active", true);

  if (error) {
    console.error(`Error fetching products for category ${categoryId}:`, error);
    return [];
  }

  return data as Product[];
}

export async function getProductsByBrand(brandId: string): Promise<Product[]> {
  const supabase = await createStaticClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      brand:brands(*),
      category:categories(*),
      images:product_images(*)
    `,
    )
    .eq("brand_id", brandId)
    .eq("is_active", true);

  if (error) {
    console.error(`Error fetching products for brand ${brandId}:`, error);
    return [];
  }

  return data as Product[];
}

export async function getFeaturedProducts(
  options: {
    limit?: number;
    offset?: number;
  } = {},
): Promise<Product[]> {
  return getProducts({ ...options, featured: true });
}

export async function getBestSellerProducts(
  options: {
    limit?: number;
    offset?: number;
  } = {},
): Promise<Product[]> {
  const supabase = await createStaticClient();
  let query = supabase
    .from("products")
    .select(
      `
      *,
      brand:brands(*),
      category:categories(*),
      images:product_images(*)
    `,
    )
    .eq("is_best_seller", true)
    .eq("is_active", true);

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 10) - 1,
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching best seller products:", error);
    return [];
  }

  return data as Product[];
}

export async function getOffers(
  options: {
    limit?: number;
    offset?: number;
  } = {},
): Promise<Product[]> {
  const supabase = await createStaticClient();
  let query = supabase
    .from("products")
    .select(
      `
      *,
      brand:brands(*),
      category:categories(*),
      images:product_images(*)
    `,
    )
    .eq("is_special_offer", true)
    .eq("is_active", true);

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 10) - 1,
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching offers:", error);
    return [];
  }

  return data as Product[];
}

export async function getBrands(): Promise<Brand[]> {
  const supabase = await createStaticClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching brands:", error);
    return [];
  }

  return data;
}

export async function getProductsBySubcategory(
  subcategorySlug: string,
): Promise<Product[]> {
  const supabase = await createStaticClient();

  // First get the category ID from the slug
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", subcategorySlug)
    .single();

  if (categoryError || !category) {
    console.error(
      `Error fetching category with slug ${subcategorySlug}:`,
      categoryError,
    );
    return [];
  }

  // Then fetch products for this category
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      brand:brands(*),
      category:categories(*),
      images:product_images(*)
    `,
    )
    .eq("category_id", category.id)
    .eq("is_active", true);

  if (error) {
    console.error(
      `Error fetching products for subcategory ${subcategorySlug}:`,
      error,
    );
    return [];
  }

  return data as Product[];
}

export async function getAllProductSlugs(): Promise<string[]> {
  const supabase = await createStaticClient();
  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching product slugs:", error);
    return [];
  }

  return data.map((product) => product.slug);
}
