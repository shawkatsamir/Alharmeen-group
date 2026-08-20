/**
 * Confirmation-link failure -> Arabic explanation and a way out.
 *
 * `/auth/error` previously rendered "Sorry, something went wrong. Code error:
 * <raw>" in English, on an Arabic-first storefront, with no next step. Every
 * cause looked identical, including the two that are completely recoverable:
 * an expired link and a link opened in a different browser from the one that
 * started the sign-up (PKCE keeps its `code_verifier` in a cookie, so the
 * exchange cannot work anywhere else).
 *
 * Import-free by design so it can be unit-tested with no mocks.
 */

export interface ConfirmErrorCopy {
  title: string;
  body: string;
  /** Where the recovery button points, or null when there is nothing to retry. */
  actionHref: string | null;
  actionLabel: string | null;
}

const RETRY_SIGNUP: Pick<ConfirmErrorCopy, "actionHref" | "actionLabel"> = {
  actionHref: "/auth/sign-up",
  actionLabel: "إنشاء حساب جديد",
};

const GO_LOGIN: Pick<ConfirmErrorCopy, "actionHref" | "actionLabel"> = {
  actionHref: "/auth/login",
  actionLabel: "تسجيل الدخول",
};

export function describeConfirmError(
  raw: string | null | undefined,
): ConfirmErrorCopy {
  const code = (raw ?? "").toLowerCase();

  if (code.includes("expired") || code.includes("otp_expired")) {
    return {
      title: "انتهت صلاحية الرابط",
      body: "رابط التفعيل صالح لفترة محدودة. أنشئ الحساب مرة أخرى بنفس البريد الإلكتروني لإرسال رابط جديد.",
      ...RETRY_SIGNUP,
    };
  }

  if (code.includes("pkce") || code.includes("code_verifier") || code.includes("flow_state")) {
    return {
      title: "افتح الرابط من نفس المتصفح",
      body: "تم فتح رابط التفعيل من متصفح مختلف عن الذي أنشأت منه الحساب. افتح الرابط من نفس المتصفح، أو أنشئ الحساب مرة أخرى.",
      ...RETRY_SIGNUP,
    };
  }

  if (code.includes("access_denied")) {
    return {
      title: "الرابط لم يعد صالحاً",
      body: "ربما تم استخدام هذا الرابط من قبل. جرّب تسجيل الدخول مباشرة.",
      ...GO_LOGIN,
    };
  }

  if (code.includes("missing_token") || code.includes("session_failed")) {
    return {
      title: "تعذر إكمال التفعيل",
      body: "لم نتمكن من قراءة بيانات التفعيل من الرابط. جرّب فتح الرابط مرة أخرى، أو سجّل الدخول إن كان حسابك مفعّلاً بالفعل.",
      ...GO_LOGIN,
    };
  }

  return {
    title: "تعذر تفعيل الحساب",
    body: "حدث خطأ أثناء تفعيل حسابك. جرّب تسجيل الدخول، وإن استمرت المشكلة تواصل معنا.",
    ...GO_LOGIN,
  };
}
