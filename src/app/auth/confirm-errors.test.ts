import { describe, expect, it } from "vitest";
import { describeConfirmError } from "./confirm-errors";

describe("describeConfirmError", () => {
  it("always offers a way forward", () => {
    const samples = [null, undefined, "", "otp_expired", "pkce_failed", "weird"];
    for (const sample of samples) {
      const copy = describeConfirmError(sample);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.body.length).toBeGreaterThan(0);
      expect(copy.actionHref).toMatch(/^\/auth\//);
      expect(copy.actionLabel).toBeTruthy();
    }
  });

  it("tells an expired link to sign up again rather than retry the link", () => {
    const copy = describeConfirmError("otp_expired");
    expect(copy.title).toBe("انتهت صلاحية الرابط");
    expect(copy.actionHref).toBe("/auth/sign-up");
  });

  it("explains the cross-browser PKCE failure, the one users cannot guess", () => {
    // The code_verifier lives in a cookie set at sign-up, so opening the link in
    // another browser can never work — the copy has to say so.
    for (const code of ["pkce_failed", "flow_state_not_found", "code_verifier missing"]) {
      const copy = describeConfirmError(code);
      expect(copy.title).toBe("افتح الرابط من نفس المتصفح");
      expect(copy.body).toContain("متصفح مختلف");
    }
  });

  it("sends an already-used link to login, not back to sign-up", () => {
    const copy = describeConfirmError("access_denied");
    expect(copy.actionHref).toBe("/auth/login");
  });

  it("handles the fragment-path failures from the client handler", () => {
    expect(describeConfirmError("missing_token").title).toBe("تعذر إكمال التفعيل");
    expect(describeConfirmError("session_failed").title).toBe("تعذر إكمال التفعيل");
  });

  it("is case-insensitive, since provider codes vary in casing", () => {
    expect(describeConfirmError("OTP_EXPIRED").title).toBe("انتهت صلاحية الرابط");
  });

  it("never shows the raw provider code to the customer", () => {
    const copy = describeConfirmError("otp_expired");
    expect(`${copy.title} ${copy.body}`).not.toContain("otp_expired");
    expect(`${copy.title} ${copy.body}`).not.toMatch(/[a-zA-Z]{4,}/);
  });
});
