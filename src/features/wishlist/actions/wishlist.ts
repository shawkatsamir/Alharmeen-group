"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleWishlist(productId: string) {
  const supabase = await createClient();

  // 1. Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Login required" };

  // 2. Check if it exists
  const { data: existing } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .single();

  let action: string;

  if (existing) {
    // 3A. Remove it (Unlike)
    await supabase.from("wishlists").delete().eq("id", existing.id);
    action = "removed";
  } else {
    // 3B. Add it (Like)
    await supabase.from("wishlists").insert({
      user_id: user.id,
      product_id: productId,
    });
    action = "added";
  }

  // 4. Refresh UI
  revalidatePath("/wishlist");
  revalidatePath(`/products/${productId}`); // Refresh product page
  return { success: true, action };
}

export async function getWishlistIds() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("wishlists")
    .select("product_id")
    .eq("user_id", user.id);

  return data?.map((item) => item.product_id) || [];
}

export async function getWishlistProducts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("wishlists")
    .select(
      "*, products(*, brand:brands(*), category:categories(*), images:product_images(*))",
    )
    .eq("user_id", user.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data?.map((item: any) => item.products) || [];
}
