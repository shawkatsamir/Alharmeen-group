import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/features/products/types";

/**
 * Server-component reads for the product form pages.
 *
 * Plain async functions rather than `"use server"` actions: these are called
 * during render by `/admin/products/new` and `/admin/products/[id]/edit`, which
 * already run on the server, so there is no reason to pay for an action round
 * trip. They use the cookie-bound client so the admin RLS SELECT policy applies
 * and archived (`is_active = false`) products remain visible.
 */

export interface CategoryOption {
  id: string;
  name_ar: string;
  parent_name_ar: string;
}

export interface BrandOption {
  id: string;
  name_ar: string;
}

/**
 * Only leaf categories are offered.
 *
 * Catalog URLs are `/[category]/[subcategory]` and all 75 existing products hang
 * off a leaf. A product placed on a top-level category would have no
 * subcategory segment, breaking its breadcrumb and its listing link.
 */
export async function getCategoryOptions(): Promise<CategoryOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name_ar, display_order, parent:parent_id(name_ar)")
    .not("parent_id", "is", null)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching category options:", error);
    return [];
  }

  return (
    data as unknown as {
      id: string;
      name_ar: string;
      parent: { name_ar: string } | null;
    }[]
  ).map((row) => ({
    id: row.id,
    name_ar: row.name_ar,
    parent_name_ar: row.parent?.name_ar ?? "",
  }));
}

export async function getBrandOptions(): Promise<BrandOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("brands")
    .select("id, name_ar")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching brand options:", error);
    return [];
  }

  return data ?? [];
}

/** Load a product with its images for the edit form. */
export async function getProductForEdit(
  productId: string,
): Promise<Product | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*, images:product_images(*)")
    .eq("id", productId)
    .single();

  if (error || !data) {
    if (error) console.error("Error fetching product for edit:", error);
    return null;
  }

  const product = data as unknown as Product;

  // The gallery and the image manager both assume display order.
  product.images = [...(product.images ?? [])].sort(
    (a, b) => a.display_order - b.display_order,
  );

  return product;
}
