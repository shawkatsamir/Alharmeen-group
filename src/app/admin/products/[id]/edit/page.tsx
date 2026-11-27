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
import { getSpecKeySuggestions } from "@/features/admin/products/actions/spec-suggestions";
import { getAxisRegistry } from "@/services/server/variant-axes";

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
  axis: "اختر الخاصية التي يختلف فيها المنتجان",
  value: "هذه الخاصية غير مسجّلة في مواصفات هذا المنتج — اكتب قيمتها في الحقل",
  name: "اسم المجموعة مطلوب",
  duplicate: "توجد نسخة بنفس هذه القيمة في المجموعة بالفعل",
  invalid: "بيانات المجموعة غير مكتملة",
};

/**
 * Specification keys that are plausibly a variant axis.
 *
 * ---------------------------------------------------------------------------
 * This is a FILTER, not a vocabulary.
 *
 * It replaced a hardcoded list of six colour/size keys, which is why the gas
 * cooker had nothing to pick: `نوع الشاشة` was not on it, so the admin
 * free-typed an axis that appears nowhere in the product's spec table. The
 * rule now is structural rather than a list of blessed names — exclude the
 * keys that describe the product's identity or paperwork and cannot
 * distinguish two variants of it, and offer everything else.
 *
 * Erring towards offering is deliberate: a key that should not have been
 * offered is one the admin skips, while a key that was withheld sends them
 * back to free text and the mistake this whole change exists to prevent.
 * ---------------------------------------------------------------------------
 */
const NEVER_AN_AXIS = [
  "الضمان",
  "بلد المنشأ",
  "مستوى كفاءة الطاقة",
  "عائلة المنتج",
  "المجموعة",
  "النوع",
];

function couldBeAxis(key: string): boolean {
  return !NEVER_AN_AXIS.includes(key.trim());
}

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

  const [members, axisRegistry, categorySpecs] = await Promise.all([
    getGroupMembers(product.group_id),
    getAxisRegistry(),
    // Only needed for the create-group panel, and only to offer keys this
    // product lacks. Skipped once the product is already grouped.
    product.group_id || !product.category_id
      ? Promise.resolve([])
      : getSpecKeySuggestions(product.category_id),
  ]);

  const specs =
    product.specifications &&
    typeof product.specifications === "object" &&
    !Array.isArray(product.specifications)
      ? (product.specifications as Record<string, unknown>)
      : {};

  /*
   * Candidate axes: this product's own spec rows first (each carrying its
   * value, so picking one answers "which value is this product" without
   * typing), then keys its category uses that this product does not record.
   */
  const ownKeys = Object.entries(specs)
    .filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && entry[1].trim().length > 0,
    )
    .map(([key, value]) => ({ key: key.trim(), value: value.trim(), uses: 0 }))
    .filter((candidate) => candidate.key && couldBeAxis(candidate.key));

  const own = new Set(ownKeys.map((candidate) => candidate.key));

  const axisCandidates = [
    ...ownKeys,
    ...categorySpecs
      .filter((suggestion) => !own.has(suggestion.key) && couldBeAxis(suggestion.key))
      .map((suggestion) => ({
        key: suggestion.key,
        value: "",
        uses: suggestion.uses,
      })),
  ];

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
       * what each member's value is (editable in place), and the shortcut that
       * makes variants cheap — copy this product into a new one so adding the
       * silver version is picking a value and a SKU rather than re-authoring a
       * spec table and a content layout.
       */}
      <VariantGroupPanel
        productId={product.id}
        productName={product.name_ar}
        productSku={product.sku}
        suggestedName={deriveGroupName(product.name_ar, product.sku)}
        axisCandidates={axisCandidates}
        registry={axisRegistry}
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
      axisRegistry={axisRegistry}
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
