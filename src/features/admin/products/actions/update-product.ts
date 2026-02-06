"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import * as z from "zod";

// Zod schema for product update validation (internal, not exported)
const productUpdateSchema = z
  .object({
    price: z.number().positive("السعر يجب أن يكون رقماً موجباً"),
    old_price: z.number().positive().nullable().optional(),
    sale_end_date: z.string().nullable().optional(),
    is_featured: z.boolean().optional(),
    is_new: z.boolean().optional(),
    is_best_seller: z.boolean().optional(),
    is_special_offer: z.boolean().optional(),
    stock_quantity: z
      .number()
      .int()
      .nonnegative("الكمية يجب أن تكون رقماً صحيحاً غير سالب")
      .optional(),
  })
  .refine(
    (data) => {
      // If old_price is set, it must be greater than price
      if (data.old_price && data.old_price <= data.price) {
        return false;
      }
      return true;
    },
    {
      message: "السعر القديم يجب أن يكون أكبر من سعر العرض",
      path: ["old_price"],
    },
  )
  .refine(
    (data) => {
      // If sale_end_date is set, it must be in the future
      if (data.sale_end_date) {
        const endDate = new Date(data.sale_end_date);
        return endDate > new Date();
      }
      return true;
    },
    {
      message: "تاريخ انتهاء العرض يجب أن يكون في المستقبل",
      path: ["sale_end_date"],
    },
  );

export type ProductUpdateData = {
  price?: number;
  old_price?: number | null;
  sale_end_date?: string | null;
  is_featured?: boolean;
  is_new?: boolean;
  is_best_seller?: boolean;
  is_special_offer?: boolean;
  stock_quantity?: number;
};

export async function updateProduct(
  productId: string,
  data: ProductUpdateData,
) {
  const supabase = await createClient();

  // Validate data with Zod if price is being updated
  if (data.price !== undefined) {
    const validation = productUpdateSchema.safeParse(data);
    if (!validation.success) {
      const errorMessage =
        validation.error.issues[0]?.message || "بيانات غير صالحة";
      return { success: false, message: errorMessage };
    }
  }

  const { error } = await supabase
    .from("products")
    .update(data)
    .eq("id", productId);

  if (error) {
    console.error("Update Product Error:", error);
    return { success: false, message: "Failed to update product" };
  }

  const { data: product } = await supabase
    .from("products")
    .select("slug")
    .eq("id", productId)
    .single();

  if (product?.slug) {
    revalidatePath(`/product/${product.slug}`);
    console.log(`Cache cleared for: ${product.slug}`);
  }

  revalidatePath("/admin/products");
  revalidatePath("/");

  return { success: true, message: "Product updated successfully" };
}
