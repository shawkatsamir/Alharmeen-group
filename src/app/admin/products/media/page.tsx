import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { MediaLibrary } from "@/features/admin/products/components/media/MediaLibrary";

export default async function ProductMediaPage() {
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

  return <MediaLibrary />;
}
