import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Double check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">لوحة تحكم المسؤول</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-bold mb-2">إدارة الطلبات</h2>
          <p className="text-gray-600">عرض وتحديث حالات الطلبات</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-bold mb-2">إدارة المنتجات</h2>
          <p className="text-gray-600">إضافة وتعديل المنتجات</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-bold mb-2">العملاء</h2>
          <p className="text-gray-600">عرض بيانات العملاء</p>
        </div>
      </div>
    </div>
  );
}
