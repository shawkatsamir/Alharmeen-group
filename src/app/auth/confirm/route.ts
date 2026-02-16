import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // 1. Check for the new PKCE 'code' (This is what was missing!)
  const code = searchParams.get("code");

  // 2. Check for the old 'token_hash' (Just in case)
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // 3. Determine where to send the user after login
  const _next = searchParams.get("next");
  const next = _next?.startsWith("/") ? _next : "/";

  const supabase = await createClient();

  // --- Scenario A: Handle the new PKCE Code ---
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirect(next);
    }
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      redirect(next);
    }
  }

  redirect("/auth/error?error=Invalid auth code or token");
}
