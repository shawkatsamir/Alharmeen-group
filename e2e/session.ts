import type { BrowserContext } from "@playwright/test";

/**
 * Signs the browser in against the stub, without an auth server.
 *
 * Checkout is signed-in only (see createOrder), so most specs need a session.
 * @supabase/ssr reads it from the `sb-<host>-auth-token` cookie — host being
 * the first label of the Supabase URL's hostname, so "127" for the stub — as
 * `base64-` + base64url(JSON session). The stub's /auth/v1/user accepts this
 * access token and answers with the matching user, which is all getUser()
 * needs on either the browser or the Next server.
 *
 * Must match E2E_ACCESS_TOKEN / E2E_USER in e2e/stub-supabase.mjs.
 */
export const E2E_ACCESS_TOKEN = "e2e-access-token";
export const E2E_USER_ID = "22222222-2222-4222-8222-222222222222";

export async function signIn(context: BrowserContext, baseURL: string) {
  const user = {
    id: E2E_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "customer@example.test",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };

  // Far enough ahead that nothing tries to refresh during a test run.
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const session = {
    access_token: E2E_ACCESS_TOKEN,
    refresh_token: "e2e-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expiresAt,
    user,
  };

  const value =
    "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");

  await context.addCookies([
    {
      name: "sb-127-auth-token",
      value,
      url: baseURL,
      sameSite: "Lax",
    },
  ]);
}
