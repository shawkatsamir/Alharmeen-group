"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// We define a simple type for the data we expect
interface SignupState {
  error?: string | null;
  success?: boolean;
}

export async function signupAction(
  formData: FormData,
  captchaToken: string,
): Promise<SignupState> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  // We need the origin to tell Supabase where to redirect after email verification
  // In server actions, 'window' doesn't exist, so we usually use an Env var or header.
  // For now, let's assume standard localhost or production URL.
  const origin =
    process.env.NEXT_PUBLIC_BASE_URL || "https://alharmaingroup.com";

  if (!captchaToken) {
    return { error: "الرجاء التحقق من أنك لست روبوت" }; // "Please verify you are not a robot"
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      captchaToken, // 🛡️ Supabase verifies this with Cloudflare automatically!
      emailRedirectTo: `${origin}/auth/confirm`,
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    console.error("Signup Error:", error.message);
    return { error: error.message };
  }

  // If successful, we can redirect or return success to show a message
  return { success: true };
}
