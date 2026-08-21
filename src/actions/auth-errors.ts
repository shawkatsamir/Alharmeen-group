/**
 * Supabase auth error -> Arabic message.
 *
 * `login.ts` previously collapsed every failure into "البريد الإلكتروني أو كلمة
 * المرور غير صحيحة". Three genuinely different failures were hidden behind that
 * one string:
 *
 * 1. A rejected captcha token — which, combined with the widget never being
 *    reset, meant a user was stuck after one mistyped password.
 * 2. An unconfirmed email address. Supabase refuses `signInWithPassword` until
 *    the address is verified, and 3 of the 14 accounts are in that state, so
 *    those users were being told their correct password was wrong.
 * 3. Rate limiting after repeated attempts, which looks identical to a bad
 *    password and encourages the retry that extends the lockout.
 *
 * Matching is on `code` first (supabase-js v2 sets it on `AuthApiError`) with a
 * message fallback, since older errors only carry prose.
 *
 * Import-free by design so it can be unit-tested with no mocks.
 */

/**
 * Detect the "email already registered" case that Supabase reports as a success.
 *
 * With email confirmation enabled, `signUp` for an address that already belongs
 * to a confirmed account returns **no error** — it hands back an obfuscated user
 * so an attacker cannot enumerate registered addresses. No email is sent.
 *
 * The tell is an empty `identities` array; a real new sign-up always gets
 * exactly one identity (verified against all 14 existing accounts). `undefined`
 * is treated as "not a duplicate", because an older client that omits the field
 * should not block a legitimate sign-up.
 *
 * Import-free, like the rest of this module.
 */
export function isExistingEmailSignup(
  user: { identities?: unknown[] | null } | null | undefined,
): boolean {
  if (!user) return false;
  return Array.isArray(user.identities) && user.identities.length === 0;
}

export interface AuthErrorLike {
  code?: string | null;
  message?: string | null;
  status?: number | null;
}

export interface DescribedAuthError {
  /** Arabic, safe to show the user. */
  message: string;
  /**
   * True when the captcha token itself was rejected. The form resets the widget
   * on every failure regardless — the token is single-use and Supabase has
   * already consumed it — but this lets the copy be specific.
   */
  captchaFailed: boolean;
}

const GENERIC = "تعذر إتمام العملية، يرجى المحاولة مرة أخرى";

function has(haystack: string, needle: string): boolean {
  return haystack.includes(needle);
}

export function describeAuthError(
  error: AuthErrorLike | null | undefined,
): DescribedAuthError {
  if (!error) return { message: GENERIC, captchaFailed: false };

  const code = (error.code ?? "").toLowerCase();
  const message = (error.message ?? "").toLowerCase();
  const both = `${code} ${message}`;

  // Captcha first: Supabase reports it as a 400 that otherwise reads like a
  // credentials failure.
  if (has(both, "captcha")) {
    return {
      message: "فشل التحقق الأمني، يرجى المحاولة مرة أخرى",
      captchaFailed: true,
    };
  }

  if (has(both, "email_not_confirmed") || has(both, "email not confirmed")) {
    return {
      message:
        "لم يتم تفعيل بريدك الإلكتروني بعد. افتح رسالة التفعيل المرسلة إليك ثم حاول مرة أخرى.",
      captchaFailed: false,
    };
  }

  if (
    has(both, "over_request_rate_limit") ||
    has(both, "over_email_send_rate_limit") ||
    has(both, "rate limit") ||
    error.status === 429
  ) {
    return {
      message: "عدد كبير من المحاولات. انتظر قليلاً ثم حاول مرة أخرى.",
      captchaFailed: false,
    };
  }

  if (has(both, "user_banned")) {
    return { message: "تم إيقاف هذا الحساب. تواصل معنا للمساعدة.", captchaFailed: false };
  }

  if (
    has(both, "user_already_exists") ||
    has(both, "email_exists") ||
    has(both, "already registered")
  ) {
    return {
      message: "هذا البريد الإلكتروني مسجل بالفعل. سجّل الدخول بدلاً من ذلك.",
      captchaFailed: false,
    };
  }

  if (has(both, "weak_password")) {
    return {
      message: "كلمة المرور ضعيفة، استخدم 6 أحرف على الأقل.",
      captchaFailed: false,
    };
  }

  if (
    has(both, "invalid_credentials") ||
    has(both, "invalid login credentials") ||
    has(both, "invalid_grant")
  ) {
    return {
      message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
      captchaFailed: false,
    };
  }

  return { message: GENERIC, captchaFailed: false };
}
