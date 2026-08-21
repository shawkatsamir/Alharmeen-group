import { describe, expect, it } from "vitest";
import { describeAuthError, isExistingEmailSignup } from "./auth-errors";

describe("isExistingEmailSignup", () => {
  it("detects the obfuscated user Supabase returns for a taken email", () => {
    // No error is raised and no email is sent; the empty identities array is the
    // only signal that the sign-up did nothing.
    expect(isExistingEmailSignup({ identities: [] })).toBe(true);
  });

  it("treats a genuine new sign-up as fine", () => {
    // A real sign-up always gets exactly one identity.
    expect(isExistingEmailSignup({ identities: [{ id: "abc" }] })).toBe(false);
  });

  it("does not block a sign-up when the field is absent or null", () => {
    // Failing open matters here: a false positive would tell a brand-new
    // customer their email is already taken and stop them registering at all.
    expect(isExistingEmailSignup({})).toBe(false);
    expect(isExistingEmailSignup({ identities: null })).toBe(false);
    expect(isExistingEmailSignup(null)).toBe(false);
    expect(isExistingEmailSignup(undefined)).toBe(false);
  });
});

describe("describeAuthError", () => {
  it("returns a generic Arabic message for nothing useful", () => {
    expect(describeAuthError(null).message).toBe(
      "تعذر إتمام العملية، يرجى المحاولة مرة أخرى",
    );
    expect(describeAuthError({}).message).toBe(
      "تعذر إتمام العملية، يرجى المحاولة مرة أخرى",
    );
  });

  it("flags a rejected captcha, which used to read as a bad password", () => {
    const described = describeAuthError({
      status: 400,
      message: "captcha protection: request disallowed (invalid-input-response)",
    });
    expect(described.captchaFailed).toBe(true);
    expect(described.message).toBe("فشل التحقق الأمني، يرجى المحاولة مرة أخرى");
  });

  it("takes captcha ahead of credentials when the message mentions both", () => {
    // Supabase reports a captcha rejection as a 400 that otherwise looks like a
    // credentials failure; picking credentials first would restore the old bug.
    const described = describeAuthError({
      code: "invalid_credentials",
      message: "captcha verification process failed",
    });
    expect(described.captchaFailed).toBe(true);
  });

  it("explains an unconfirmed email instead of blaming the password", () => {
    // 3 of the 14 accounts are in this state and could never sign in.
    for (const error of [
      { code: "email_not_confirmed" },
      { message: "Email not confirmed" },
    ]) {
      expect(describeAuthError(error).message).toContain("لم يتم تفعيل بريدك");
      expect(describeAuthError(error).captchaFailed).toBe(false);
    }
  });

  it("tells a rate-limited user to wait rather than retry", () => {
    expect(describeAuthError({ status: 429 }).message).toContain("عدد كبير من المحاولات");
    expect(
      describeAuthError({ code: "over_request_rate_limit" }).message,
    ).toContain("عدد كبير من المحاولات");
  });

  it("still reports genuinely wrong credentials plainly", () => {
    for (const error of [
      { code: "invalid_credentials" },
      { message: "Invalid login credentials" },
    ]) {
      expect(describeAuthError(error).message).toBe(
        "البريد الإلكتروني أو كلمة المرور غير صحيحة",
      );
    }
  });

  it("translates the sign-up errors a customer can actually hit", () => {
    expect(describeAuthError({ message: "User already registered" }).message).toContain(
      "مسجل بالفعل",
    );
    expect(describeAuthError({ code: "weak_password" }).message).toContain(
      "كلمة المرور ضعيفة",
    );
  });

  it("reports a banned account", () => {
    expect(describeAuthError({ code: "user_banned" }).message).toContain(
      "تم إيقاف هذا الحساب",
    );
  });

  it("is case-insensitive, since only the prose form is capitalised", () => {
    expect(describeAuthError({ message: "CAPTCHA failed" }).captchaFailed).toBe(true);
    expect(describeAuthError({ message: "INVALID LOGIN CREDENTIALS" }).message).toBe(
      "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    );
  });

  it("never returns an English message for a customer to read", () => {
    const samples = [
      { message: "User already registered" },
      { message: "Something entirely unexpected" },
      { code: "email_not_confirmed" },
      { status: 429 },
    ];
    for (const sample of samples) {
      expect(describeAuthError(sample).message).not.toMatch(/[a-zA-Z]{4,}/);
    }
  });
});
