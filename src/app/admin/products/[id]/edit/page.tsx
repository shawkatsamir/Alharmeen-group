import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/features/admin/products/components/ProductForm";
import {
  getBrandOptions,
  getCategoryOptions,
  getProductForEdit,
  getProductGroupOptions,
} from "@/features/admin/products/data";
import { toProductFormValues } from "@/features/admin/products/lib/form-defaults";
import { startVariantFromProduct } from "@/features/admin/products/actions/variant-groups";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ variantError?: string }>;
}

/** Failure codes redirected back by `startVariantFromProduct`. */
const VARIANT_ERRORS: Record<string, string> = {
  forbidden: "لا تملك صلاحية تنفيذ هذا الإجراء",
  missing: "المنتج غير موجود",
  group: "تعذر إنشاء المجموعة، حاول مرة أخرى",
  assign: "تعذر ربط المنتج بالمجموعة، حاول مرة أخرى",
};

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
       * The shortcut that makes variants cheap: copy this product into a new
       * one, creating the group if it does not exist yet, so adding the silver
       * version is picking a colour and a SKU rather than re-authoring a spec
       * table and a content layout that already exist.
       *
       * A form POST rather than a link, because it mutates before redirecting.
       */}
      <form
        action={startVariantFromProduct.bind(null, product.id)}
        className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-dashed border-gray-300 p-3 dark:border-gray-700"
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          هل يوجد نفس المنتج بلون آخر؟ أنشئه بنسخة جاهزة من هذا المنتج.
        </p>
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          أضف لوناً جديداً
        </button>
      </form>

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
