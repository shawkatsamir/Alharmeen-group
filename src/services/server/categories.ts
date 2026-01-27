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
    .select("*, parent:categories!parent_id(*)")
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
    .select("slug, parent:categories!parent_id(slug)")
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

export async function getNavigationCategories(): Promise<NavigationCategory[]> {
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
}
