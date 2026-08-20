"use server";

import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";
import { describeAuthError } from "./auth-errors";

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
  // Derived from the request rather than an env var: NEXT_PUBLIC_BASE_URL is not
  // set locally, so the old fallback emailed every local sign-up a link to
  // production, where the PKCE code_verifier cookie from localhost does not
  // exist and confirmation always failed.
  const origin = await getSiteOrigin();

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
    // `error.message` is raw English from Supabase ("User already registered"),
    // which is the only English string a customer would ever see on this
    // Arabic-first site.
    console.error("[signupAction]", error.code ?? error.status, error.message);
    return { error: describeAuthError(error).message };
  }

  // If successful, we can redirect or return success to show a message
  return { success: true };
}
