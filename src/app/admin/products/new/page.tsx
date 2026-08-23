import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/features/admin/products/components/ProductForm";
import {
  getBrandOptions,
  getCategoryOptions,
  getProductForEdit,
  getProductGroupOptions,
} from "@/features/admin/products/data";
import {
  emptyProductFormValues,
  toProductFormValues,
} from "@/features/admin/products/lib/form-defaults";
import type { ProductFormValues } from "@/features/admin/products/schema";

interface NewProductPageProps {
  searchParams: Promise<{ duplicateFrom?: string }>;
}

/**
 * `src/app/admin/layout.tsx` is a client component, so it cannot guard auth —
 * every admin page checks for itself (see `src/app/admin/page.tsx`).
 */
export default async function NewProductPage({
  searchParams,
}: NewProductPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const { duplicateFrom } = await searchParams;

  const [categories, brands, groups, source] = await Promise.all([
    getCategoryOptions(),
    getBrandOptions(),
    getProductGroupOptions(),
    duplicateFrom ? getProductForEdit(duplicateFrom) : Promise.resolve(null),
  ]);

  return (
    <ProductForm
      mode="create"
      defaultValues={source ? variantDefaults(source) : emptyProductFormValues()}
      categories={categories}
      brands={brands}
      groups={groups}
    />
  );
}

/**
 * Prefill a new variant from an existing product.
 *
 * Everything the two finishes share is copied — category, brand, price, specs,
 * features, content blocks, videos, warranty — because re-typing all of it for
 * each colour is the cost this feature exists to remove.
 *
 * Cleared deliberately:
 *
 *  - `sku` and `slug` are UNIQUE, so copying them guarantees a save error. Left
 *    blank, the form's existing slug suggestion fills the slug from the name
 *    and SKU once they are typed.
 *  - the axis value, because "which colour is this one" is the single question
 *    the owner is actually here to answer.
 *  - `meta_title_ar` / `meta_description_ar`, since a copied meta description
 *    naming the wrong colour is worse for search than none — the product page
 *    falls back to a generated description.
 *
 * Images are NOT copied: `product_images` rows belong to a product id and the
 * whole point of a colour variant is that it looks different.
 */
function variantDefaults(source: Parameters<typeof toProductFormValues>[0]) {
  const values: ProductFormValues = {
    ...toProductFormValues(source),
    sku: "",
    slug: "",
    meta_title_ar: "",
    meta_description_ar: "",
  };

  return {
    ...values,
    variant_values: values.variant_values.map((row) => ({ ...row, value: "" })),
  };
}
