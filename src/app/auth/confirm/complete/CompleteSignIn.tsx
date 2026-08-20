"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

/**
 * Completes an email confirmation that arrived as a URL fragment.
 *
 * When Supabase cannot resolve a PKCE flow it falls back to the implicit shape
 * and redirects with `#access_token=…&refresh_token=…`. A fragment is never
 * transmitted to the server, so `/auth/confirm` sees an empty query string and
 * cannot do anything with it — that is the `access_token` error users reported.
 *
 * Reading it here works because this runs in the browser. `setSession` on the
 * browser client also writes the auth cookies through `@supabase/ssr`, so the
 * session is visible to Server Components on the next navigation.
 */
export function CompleteSignIn({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // React 19 runs effects twice in development; a second setSession call with an
  // already-consumed refresh token would fail and show a false error.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);

    const providerError = params.get("error_code") ?? params.get("error");
    if (providerError) {
      router.replace(`/auth/error?error=${encodeURIComponent(providerError)}`);
      return;
    }

    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (!access_token || !refresh_token) {
      router.replace("/auth/error?error=missing_token");
      return;
    }

    const supabase = createClient();
    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          console.error("[auth/confirm/complete] setSession failed:", sessionError);
          setError(sessionError.message);
          router.replace("/auth/error?error=session_failed");
          return;
        }

        // Strip the tokens out of the address bar before moving on.
        window.history.replaceState(null, "", window.location.pathname);
        router.replace(next);
        router.refresh();
      });
  }, [next, router]);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {error ? "تعذر إكمال تفعيل الحساب" : "جاري تفعيل حسابك..."}
        </p>
      </div>
    </div>
  );
}
