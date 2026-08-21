"use server";

import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";
import { describeAuthError, isExistingEmailSignup } from "./auth-errors";

// We define a simple type for the data we expect
interface SignupState {
  error?: string | null;
  success?: boolean;
  /** Lets the form offer a link to sign in instead of just showing the error. */
  emailAlreadyRegistered?: boolean;
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

  const { data, error } = await supabase.auth.signUp({
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

  /*
   * Supabase deliberately does **not** error when the email already belongs to a
   * confirmed account: it returns a success with an obfuscated user so an
   * attacker cannot probe which addresses are registered. The give-away is an
   * empty `identities` array — a genuinely new sign-up always gets exactly one
   * identity (verified: all 14 existing users have exactly one).
   *
   * Left unhandled, the customer saw "check your email", no email ever arrived
   * because none was sent, and they could not sign in either.
   *
   * Detecting it here trades a little email-enumeration resistance for a flow
   * the customer can actually complete. The message deliberately points at
   * signing in or resetting the password rather than confirming the address
   * exists in so many words.
   */
  if (isExistingEmailSignup(data.user)) {
    return {
      error:
        "هذا البريد الإلكتروني مسجل بالفعل. سجّل الدخول، أو استخدم «نسيت كلمة المرور؟» إذا نسيتها.",
      emailAlreadyRegistered: true,
    };
  }

  // If successful, we can redirect or return success to show a message
  return { success: true };
}
