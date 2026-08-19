import { Database } from "@/shared/types/database.types";

type Tables = Database["public"]["Tables"];

export type Brand = Tables["brands"]["Row"];
export type Category = Tables["categories"]["Row"];
export type ProductImage = Tables["product_images"]["Row"];

/**
 * Products hang off leaf categories (ميكروويف), whose parent is a top-level
 * category (أجهزة منزلية صغيرة). Catalog URLs are `/[category]/[subcategory]`,
 * so building a breadcrumb or a listing link needs the parent's slug too.
 * Only `getProductBySlug` embeds it; everywhere else it is absent.
 */
export type CategoryWithParent = Category & {
  parent?: Category | null;
};

/**
 * Every fetcher in `services/server/products.ts` selects the same shape:
 *   `*, brand:brands(*), category:categories(*), images:product_images(*)`
 * so the relations are full rows, not the narrowed picks this type used to
 * declare. Keeping them full here means the detail page can read `alt_text_ar`,
 * `category.name_ar` etc. without re-widening at each call site.
 *
 * The relations stay optional because a few queries omit them.
 */
export type Product = Tables["products"]["Row"] & {
  category?: CategoryWithParent | null;
  brand?: Brand | null;
  images?: ProductImage[] | null;
};
