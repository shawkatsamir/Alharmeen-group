import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/features/admin/products/components/ProductForm";
import {
  getBrandOptions,
  getCategoryOptions,
  getGroupMembers,
  getProductForEdit,
  getProductGroupOptions,
} from "@/features/admin/products/data";
import { toProductFormValues } from "@/features/admin/products/lib/form-defaults";
import { VariantGroupPanel } from "@/features/admin/products/components/VariantGroupPanel";
import { deriveGroupName } from "@/features/admin/products/lib/group-name";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ variantError?: string }>;
}

/** Failure codes redirected back by the variant-group actions. */
const VARIANT_ERRORS: Record<string, string> = {
  forbidden: "لا تملك صلاحية تنفيذ هذا الإجراء",
  missing: "المنتج غير موجود",
  group: "تعذر حفظ المجموعة، حاول مرة أخرى",
  assign: "تعذر ربط المنتج بالمجموعة، حاول مرة أخرى",
  axis: "حدد الخاصية التي يختلف فيها المنتجان",
  value: "حدد قيمة هذا المنتج في تلك الخاصية",
  name: "اسم المجموعة مطلوب",
};

/**
 * Axis values worth suggesting, taken from the product's own specifications.
 *
 * Only keys that are plausibly a variant axis — the point is to save retyping a
 * colour the product already records, not to offer its warranty as an axis.
 */
const SUGGESTIBLE_SPEC_KEYS = [
  "الألوان",
  "اللون",
  "المقاس",
  "الحجم",
  "السعة",
  "حجم الشاشة",
];

export default async function EditProductPage({
  params,
  searchParams,
}: EditProductPageProps) {
  const { id } = await params;
  const { variantError } = await searchParams;

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

  const [product, categories, brands, groups] = await Promise.all([
    getProductForEdit(id),
    getCategoryOptions(),
    getBrandOptions(),
    getProductGroupOptions(),
  ]);

  if (!product) notFound();

  const members = await getGroupMembers(product.group_id);

  const specs =
    product.specifications &&
    typeof product.specifications === "object" &&
    !Array.isArray(product.specifications)
      ? (product.specifications as Record<string, unknown>)
      : {};

  const suggestedValues = Object.fromEntries(
    SUGGESTIBLE_SPEC_KEYS.map((key) => [key, specs[key]])
      .filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === "string" && entry[1].trim().length > 0,
      )
      .map(([key, value]) => [key, value.trim()]),
  );

  return (
    <>
      {variantError && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200"
        >
          {VARIANT_ERRORS[variantError] ?? "حدث خطأ غير متوقع"}
        </p>
      )}

      {/*
       * The group panel: who else is in this group, which one is the primary,
       * and the shortcut that makes variants cheap — copy this product into a
       * new one so adding the silver version is picking a value and a SKU
       * rather than re-authoring a spec table and a content layout.
       */}
      <VariantGroupPanel
        productId={product.id}
        productName={product.name_ar}
        suggestedName={deriveGroupName(product.name_ar, product.sku)}
        suggestedValues={suggestedValues}
        group={product.group ?? null}
        members={members}
      />

      <ProductForm
      mode="edit"
      productId={product.id}
      defaultValues={toProductFormValues(product)}
      categories={categories}
      brands={brands}
      groups={groups}
      initialImages={(product.images ?? []).map((image) => ({
        id: image.id,
        image_url: image.image_url,
        alt_text_ar: image.alt_text_ar,
        display_order: image.display_order,
        is_primary: image.is_primary,
      }))}
        legacyHtml={product.description_ar}
      />
    </>
  );
}
