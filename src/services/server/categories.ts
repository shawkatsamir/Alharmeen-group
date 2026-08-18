import { cache } from "react";
import { createStaticClient } from "@/lib/supabase/server";

import { Database } from "@/shared/types/database.types";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type CategoryWithParent = Category & {
  parent: Category | null;
};

export async function getSubcategoryBySlug(
  slug: string,
): Promise<CategoryWithParent | null> {
  const supabase = await createStaticClient();

  const { data, error } = await supabase
    .from("categories")
    // `parent:parent_id(*)` hints the FK column, which resolves the
    // self-reference as to-one. `categories!parent_id` hints the table and
    // resolves to-many, returning the empty children array instead of a parent.
    .select("*, parent:parent_id(*)")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    console.error("Error fetching subcategory:", error);
    return null;
  }

  return data as CategoryWithParent;
}

export async function getSubCategory() {
  const supabase = await createStaticClient();

  const { data: subcategories } = await supabase
    .from("categories")
    // See getSubcategoryBySlug: the column hint is what makes this to-one.
    // With the table hint this returned [], so every subcategory was filtered
    // out below and no subcategory page was ever statically generated.
    .select("slug, parent:parent_id(slug)")
    .not("parent_id", "is", null);

  const mapped =
    subcategories?.map((sub) => ({
      category: (sub.parent as unknown as { slug: string })?.slug,
      subcategory: sub.slug,
    })) || [];

  return mapped.filter(
    (item): item is { category: string; subcategory: string } =>
      !!item.category && !!item.subcategory,
  );
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createStaticClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }

  return data;
}

export type NavigationCategory = {
  id: string;
  name: string;
  slug: string;
  subcategories: {
    id: string;
    name: string;
    slug: string;
  }[];
};

/**
 * Wrapped in `cache()` because both `(customer)/layout.tsx` and `Header.tsx`
 * call it while rendering the same request — without this it runs twice per
 * page.
 */
export const getNavigationCategories = cache(async function
getNavigationCategories(): Promise<NavigationCategory[]> {
  const supabase = await createStaticClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name_ar, slug, parent_id")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error || !data) {
    console.error("Error fetching navigation categories:", error);
    return [];
  }

  const categoryMap = new Map<string, NavigationCategory>();
  const rootCategories: NavigationCategory[] = [];

  // First pass: create nodes for all items
  data.forEach((cat) => {
    categoryMap.set(cat.id, {
      id: cat.id,
      name: cat.name_ar,
      slug: cat.slug,
      subcategories: [], // Initialize subcategories array
    });
  });

  // Second pass: link parents and children
  data.forEach((cat) => {
    const node = categoryMap.get(cat.id)!;
    if (cat.parent_id) {
      const parent = categoryMap.get(cat.parent_id);
      if (parent) {
        // Add to parent's subcategories
        parent.subcategories.push({
          id: node.id,
          name: node.name,
          slug: node.slug,
        });
      }
    } else {
      // It's a root category
      rootCategories.push(node);
    }
  });

  return rootCategories;
});

export type CategoryTile = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  /** Products across this category and all of its subcategories. */
  productCount: number;
  subcategories: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    productCount: number;
  }[];
};

/**
 * Top-level categories with imagery and product counts, for the homepage grid
 * and the category landing pages.
 *
 * Counts matter because 16 of the 24 categories currently hold zero products —
 * linking to an empty listing is a dead end, so callers filter on this.
 *
 * `image_url` is null for every category today; the UI falls back to a
 * typographic tile and upgrades automatically once art is uploaded.
 */
export const getCategoryTiles = cache(async function getCategoryTiles(): Promise<
  CategoryTile[]
> {
  const supabase = await createStaticClient();

  const [{ data: categories, error }, { data: products }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name_ar, slug, parent_id, image_url")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    // Only 75 rows, and there is no group-by in the JS client — cheaper to
    // aggregate here than to add an RPC for it.
    supabase.from("products").select("category_id").eq("is_active", true),
  ]);

  if (error || !categories) {
    console.error("Error fetching category tiles:", error);
    return [];
  }

  const counts = new Map<string, number>();
  for (const p of products ?? []) {
    counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);
  }

  const roots = categories.filter((c) => !c.parent_id);

  return roots.map((root) => {
    const subcategories = categories
      .filter((c) => c.parent_id === root.id)
      .map((c) => ({
        id: c.id,
        name: c.name_ar,
        slug: c.slug,
        imageUrl: c.image_url,
        productCount: counts.get(c.id) ?? 0,
      }));

    return {
      id: root.id,
      name: root.name_ar,
      slug: root.slug,
      imageUrl: root.image_url,
      // Products hang off leaf categories, so a root's count is its children's.
      productCount:
        (counts.get(root.id) ?? 0) +
        subcategories.reduce((sum, s) => sum + s.productCount, 0),
      subcategories,
    };
  });
});

export const getCategoryBySlug = cache(async function getCategoryBySlug(
  slug: string,
): Promise<CategoryTile | null> {
  const tiles = await getCategoryTiles();
  return tiles.find((t) => t.slug === slug) ?? null;
});
