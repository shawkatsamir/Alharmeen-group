import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/features/admin/products/components/ProductForm";
import { getBrandOptions, getCategoryOptions } from "@/features/admin/products/data";
import { emptyProductFormValues } from "@/features/admin/products/lib/form-defaults";

/**
 * `src/app/admin/layout.tsx` is a client component, so it cannot guard auth —
 * every admin page checks for itself (see `src/app/admin/page.tsx`).
 */
export default async function NewProductPage() {
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

  const [categories, brands] = await Promise.all([
    getCategoryOptions(),
    getBrandOptions(),
  ]);

  return (
    <ProductForm
      mode="create"
      defaultValues={emptyProductFormValues()}
      categories={categories}
      brands={brands}
    />
  );
}
