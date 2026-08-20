import { headers } from "next/headers";

/**
 * The origin the current request actually arrived on.
 *
 * `signupAction` used to build `emailRedirectTo` from
 * `process.env.NEXT_PUBLIC_BASE_URL || "https://alharmaingroup.com"`. That var
 * is not in `.env.local`, so **every local sign-up emailed a confirmation link
 * pointing at production** — the user clicked it, landed on the live site, and
 * the PKCE `code_verifier` cookie set by localhost was nowhere to be found.
 *
 * Deriving the origin from the request removes the whole class of problem:
 * localhost stays on localhost, a preview deployment stays on itself, and
 * production stays on production, with no env var to forget. The env var is kept
 * as an override for cases where the public URL differs from the internal host.
 */
export async function getSiteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const headerList = await headers();

  // `x-forwarded-*` is what a proxy (Vercel) sets; `host` is the direct case.
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? null;

  if (!host) return "https://www.alharmaingroup.com";

  const proto =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${proto}://${host}`;
}
