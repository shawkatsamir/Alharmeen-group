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
  /** Spec table and variant switcher state different values for the axis. */
  members_axis_spec_mismatch: number;
  /** The varying fact appears nowhere in the member's spec table. */
  members_axis_spec_missing: number;
  /** Axes with no `variant_axes` row, still on the `text` fallback. */
  undeclared_axes: string[] | null;
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

/** A value already claimed on an axis, and the product holding it. */
export interface AxisValueHolder {
  value: string;
  productId: string;
  sku: string;
}

export interface ProductGroupOption {
  id: string;
  name_ar: string;
  axes: string[];
  /**
   * Values already claimed per axis, WITH the product holding each.
   *
   * It used to be `string[]` — bare suggestions in a `<datalist>`. That was
   * actively harmful: for a NEW variant every existing value is a guaranteed
   * `products_group_variant_norm_uniq` violation, so the autocomplete offered
   * nothing but forbidden answers. Worse, when a sibling held the wrong value
   * the admin had no way to see it. That is the live Toshiba gas cooker: the
   * product whose name says شاشة ديجيتال carries "بدون شاشة", so the genuinely
   * screenless one could not be added, and the form said only that the value
   * was taken — six failed saves in two minutes.
   *
   * With the holder attached, the editor can name it and link to it.
   */
  values: Record<string, AxisValueHolder[]>;
}

/**
 * Every variant group, with the axis values its members already claim.
 *
 * Archived members are included on purpose: an archived variant still occupies
 * its combination in the unique index, so omitting it would let the form
 * promise a value the database then refuses.
 */
export async function getProductGroupOptions(): Promise<ProductGroupOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("product_groups")
    .select("id, name_ar, axes, products(id, sku, variant_values)")
    .order("name_ar");

  if (error || !data) {
    if (error) console.error("Error fetching product groups:", error);
    return [];
  }

  return data.map((group) => {
    const values: Record<string, AxisValueHolder[]> = {};

    for (const member of (group.products ?? []) as {
      id: string;
      sku: string | null;
      variant_values: unknown;
    }[]) {
      const stored = member.variant_values;
      if (!stored || typeof stored !== "object" || Array.isArray(stored)) continue;

      for (const [axis, value] of Object.entries(stored as Record<string, unknown>)) {
        if (typeof value !== "string" || !value.trim()) continue;
        const claimed = (values[axis] ??= []);
        if (claimed.some((held) => held.value === value)) continue;
        claimed.push({
          value,
          productId: member.id,
          sku: member.sku ?? "—",
        });
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

export interface VariantAxisOption {
  key: string;
  label_ar: string;
  kind: string;
  schema_property: string | null;
  spec_aliases: string[];
  display_order: number;
}

/**
 * The declared axes, for the admin's axis list.
 *
 * Read through the cookie-bound client like everything else in this module,
 * even though `variant_axes` is world-readable — the admin pages are dynamic
 * and consistency is worth more here than one avoided round trip.
 */
export async function getVariantAxisOptions(): Promise<VariantAxisOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("variant_axes")
    .select("key, label_ar, kind, schema_property, spec_aliases, display_order")
    .order("display_order")
    .order("key");

  if (error || !data) {
    if (error) console.error("Error fetching variant axes:", error);
    return [];
  }

  return data.map((row) => ({
    key: row.key,
    label_ar: row.label_ar,
    kind: row.kind,
    schema_property: row.schema_property,
    spec_aliases: row.spec_aliases ?? [],
    display_order: row.display_order,
  }));
}
