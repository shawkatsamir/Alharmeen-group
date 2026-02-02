"use server";

import { createClient } from "@/lib/supabase/server";

// Update the Return Type
interface LoginResult {
  error?: string | null;
  redirectUrl?: string | null; // 👈 Add this
}

export async function loginAction(
  formData: FormData,
  captchaToken: string,
): Promise<LoginResult> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // 1. Check Captcha
  if (!captchaToken) {
    return { error: "الرجاء التحقق من أنك لست روبوت" };
  }

  // 2. Sign In
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken },
  });

  if (error) {
    return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" };
  }

  // 3. Check Admin Role 🛡️
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let finalUrl = "/"; // Default destination

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin") {
      finalUrl = "/admin";
    }
  }

  // 4. Return the URL instead of redirecting
  return { redirectUrl: finalUrl };
}
