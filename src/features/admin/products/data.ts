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
    // The group is embedded because `toProductFormValues` orders the axis rows
    // by `group.axes` — without it, the colour field would render in jsonb key
    // order and a newly added axis would show no row to fill in.
    .select("*, images:product_images(*), group:product_groups(*)")
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

export interface GroupHealthRow {
  id: string;
  name_ar: string;
  axes: string[];
  member_count: number;
  active_count: number;
  primary_count: number;
  members_without_images: number;
  members_missing_axis: number;
  members_with_extra_axis: number;
}

/**
 * Every group with its warnings, for `/admin/products/groups`.
 *
 * Reads the `product_group_health` view rather than recomputing in JS — the
 * counts are aggregate questions over two tables and one jsonb column, which is
 * what SQL is for. Cast rather than typed because generated types do not cover
 * views; this fetcher is the single place that knows the shape.
 */
export async function getGroupHealth(): Promise<GroupHealthRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("product_group_health")
    .select("*")
    .order("name_ar");

  if (error || !data) {
    if (error) console.error("Error fetching group health:", error);
    return [];
  }

  return data as unknown as GroupHealthRow[];
}

/** A group member as the admin panel renders it. */
export interface GroupMember {
  id: string;
  sku: string;
  name_ar: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  is_group_primary: boolean;
  variant_values: unknown;
  images?: { image_url: string; is_primary: boolean }[] | null;
}

/**
 * Every member of a group, archived ones included.
 *
 * Unlike the storefront's `getVariantSiblings`, this does NOT filter
 * `is_active` and does not collapse a group of one: the admin panel exists
 * precisely to show what is wrong with a group, and an archived or lone member
 * is one of the things worth seeing.
 */
export async function getGroupMembers(
  groupId: string | null | undefined,
): Promise<GroupMember[]> {
  if (!groupId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, sku, name_ar, price, stock_quantity, is_active, is_group_primary, variant_values, images:product_images(image_url, is_primary)",
    )
    .eq("group_id", groupId);

  if (error || !data) {
    if (error) console.error("Error fetching group members:", error);
    return [];
  }

  return data as unknown as GroupMember[];
}

export interface ProductGroupOption {
  id: string;
  name_ar: string;
  axes: string[];
  /** Axis values already in use, so the form can suggest canonical spellings. */
  values: Record<string, string[]>;
}

/**
 * Every variant group, with the axis values its members already use.
 *
 * The values feed a `<datalist>` on the axis input, which is the same nudge
 * `SpecEditor` gives for spec keys and exists for the same reason: axis values
 * are matched by exact string, so one "فضي" typed where the group already uses
 * "سيلفر" silently splits one product into two swatches of the same finish.
 */
export async function getProductGroupOptions(): Promise<ProductGroupOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("product_groups")
    .select("id, name_ar, axes, products(variant_values)")
    .order("name_ar");

  if (error || !data) {
    if (error) console.error("Error fetching product groups:", error);
    return [];
  }

  return data.map((group) => {
    const values: Record<string, string[]> = {};

    for (const member of (group.products ?? []) as {
      variant_values: unknown;
    }[]) {
      const stored = member.variant_values;
      if (!stored || typeof stored !== "object" || Array.isArray(stored)) continue;

      for (const [axis, value] of Object.entries(stored as Record<string, unknown>)) {
        if (typeof value !== "string" || !value.trim()) continue;
        const seen = (values[axis] ??= []);
        if (!seen.includes(value)) seen.push(value);
      }
    }

    return {
      id: group.id,
      name_ar: group.name_ar,
      axes: group.axes ?? [],
      values,
    };
  });
}
