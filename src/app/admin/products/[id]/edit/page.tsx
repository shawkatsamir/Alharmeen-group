import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/features/admin/products/components/ProductForm";
import {
  getBrandOptions,
  getCategoryOptions,
  getProductForEdit,
} from "@/features/admin/products/data";
import { toProductFormValues } from "@/features/admin/products/lib/form-defaults";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;

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

  const [product, categories, brands] = await Promise.all([
    getProductForEdit(id),
    getCategoryOptions(),
    getBrandOptions(),
  ]);

  if (!product) notFound();

  return (
    <ProductForm
      mode="edit"
      productId={product.id}
      defaultValues={toProductFormValues(product)}
      categories={categories}
      brands={brands}
      initialImages={(product.images ?? []).map((image) => ({
        id: image.id,
        image_url: image.image_url,
        alt_text_ar: image.alt_text_ar,
        display_order: image.display_order,
        is_primary: image.is_primary,
      }))}
      legacyHtml={product.description_ar}
    />
  );
}
