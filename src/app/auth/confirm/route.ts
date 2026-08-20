import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

/**
 * Landing point for the email confirmation link.
 *
 * Supabase can arrive here in three different shapes, and the previous version
 * only understood two of them:
 *
 * 1. `?code=…`       — PKCE. Needs the `code_verifier` cookie set when the user
 *                      signed up, so it only works in the *same browser*.
 * 2. `?token_hash=…` — stateless OTP verification. Works anywhere.
 * 3. `#access_token=…&refresh_token=…` — the implicit fallback Supabase uses
 *                      when it cannot resolve a PKCE flow. **A URL fragment is
 *                      never sent to the server**, so this route sees no
 *                      parameters at all and used to dead-end on
 *                      "Invalid auth code or token" — the `access_token` error
 *                      users were hitting. It is now handed to a client page
 *                      that can actually read `location.hash`.
 *
 * Supabase may also redirect here with its own `?error=…&error_description=…`
 * (an expired or already-used link, most often). Those were previously
 * overwritten with a generic message, discarding the only useful information.
 *
 * This must stay a Route Handler rather than becoming a page: `verifyOtp` and
 * `exchangeCodeForSession` write the session cookies, and `setAll` in
 * `lib/supabase/server.ts` silently swallows cookie writes from Server
 * Components. A page would verify the user and then drop their session.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const _next = searchParams.get("next");
  const next = _next?.startsWith("/") && !_next.startsWith("//") ? _next : "/";

  // Supabase reported the failure itself — pass its reason through instead of
  // replacing it with a generic one.
  const providerError =
    searchParams.get("error_code") ?? searchParams.get("error");
  if (providerError) {
    const description = searchParams.get("error_description") ?? "";
    console.error("[auth/confirm] provider error:", providerError, description);
    redirect(`/auth/error?error=${encodeURIComponent(providerError)}`);
  }

  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  // Stateless first: `token_hash` works even when the link is opened in a
  // different browser from the one that signed up, which is the common case on
  // mobile (sign up in Chrome, open the link from the Gmail app's webview).
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) redirect(next);

    console.error("[auth/confirm] verifyOtp failed:", error.code, error.message);
    redirect(`/auth/error?error=${encodeURIComponent(error.code ?? "otp_failed")}`);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);

    // Almost always a missing code_verifier cookie: the link was opened in a
    // different browser from the one that started the sign-up.
    console.error(
      "[auth/confirm] exchangeCodeForSession failed:",
      error.code,
      error.message,
    );
    redirect(
      `/auth/error?error=${encodeURIComponent(error.code ?? "pkce_failed")}`,
    );
  }

  // No query parameters at all. The tokens are most likely sitting in the URL
  // fragment, which only the browser can see, so hand off to a client page.
  // Browsers re-attach the original fragment to a redirect target that has
  // none, so `#access_token=…` survives this hop.
  redirect(`/auth/confirm/complete?next=${encodeURIComponent(next)}`);
}
