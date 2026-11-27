import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShippingRatesTable } from "@/features/admin/shipping/components/ShippingRatesTable";

/**
 * Server component so it can guard. `src/app/admin/layout.tsx` is a client
 * component (sidebar state + next-themes) and cannot check auth, so per
 * CLAUDE.md every admin page checks for itself.
 */
export default async function AdminShippingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* The route title is rendered by the admin header; repeating it here
          cost a phone a whole heading before any content. */}
      <p className="text-muted-foreground text-sm">
        تحديد تكلفة التوصيل لكل محافظة والمحافظات المتاحة للتوصيل.
      </p>
      <ShippingRatesTable />
    </div>
  );
}
