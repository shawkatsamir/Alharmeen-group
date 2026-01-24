import { Button } from "@/shared/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">حسابي</h1>
        <form action="/auth/sign-out" method="post">
          {/* You might need a server action for sign out or a client component */}
          <Button variant="outline">تسجيل الخروج</Button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
        <h2 className="text-xl font-semibold mb-4">المعلومات الشخصية</h2>
        <div className="space-y-2">
          <p>
            <strong>الاسم:</strong> {profile?.full_name}
          </p>
          <p>
            <strong>البريد الإلكتروني:</strong> {user.email}
          </p>
          <p>
            <strong>الهاتف:</strong> {profile?.phone || "غير مسجل"}
          </p>
          <p>
            <strong>العنوان Default:</strong> {profile?.address || "غير مسجل"}
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">طلباتي</h2>
        <p className="text-gray-500">لا توجد طلبات سابقة.</p>
        {/* TODO: List orders here */}
      </div>
    </div>
  );
}
