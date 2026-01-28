"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ProductUpdateData = {
  price?: number;
  is_featured?: boolean;
  is_new?: boolean;
  is_best_seller?: boolean;
  is_special_offer?: boolean;
};

export async function updateProduct(
  productId: string,
  data: ProductUpdateData,
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update(data)
    .eq("id", productId);

  if (error) {
    console.error("Update Product Error:", error);
    return { success: false, message: "Failed to update product" };
  }

  revalidatePath("/admin/products");
  revalidatePath("/");

  return { success: true, message: "Product updated successfully" };
}
