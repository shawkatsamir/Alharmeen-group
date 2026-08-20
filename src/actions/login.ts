"use server";

import { createClient } from "@/lib/supabase/server";
import { describeAuthError } from "./auth-errors";

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
    // Reporting every failure as bad credentials hid two real ones: a rejected
    // captcha token, and an unconfirmed email address — which Supabase refuses
    // outright, so those users were told their correct password was wrong.
    console.error("[loginAction]", error.code ?? error.status, error.message);
    return { error: describeAuthError(error).message };
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
