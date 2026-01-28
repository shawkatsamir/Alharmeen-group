"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteProductImage(imageId: string) {
  const supabase = await createClient();

  // 1. Get the image to check storage path (optional, if you want to clean up storage)
  const { data: image, error: fetchError } = await supabase
    .from("product_images")
    .select("*")
    .eq("id", imageId)
    .single();

  if (fetchError || !image) {
    return { success: false, message: "Image not found" };
  }

  // 2. Delete from database
  const { error: deleteError } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId);

  if (deleteError) {
    console.error("Error deleting product image:", deleteError);
    return { success: false, message: "Failed to delete image" };
  }

  // 3. Revalidate
  revalidatePath("/admin/products");

  return { success: true, message: "Image deleted successfully" };
}
