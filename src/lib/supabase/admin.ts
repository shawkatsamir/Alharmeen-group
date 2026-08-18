import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Client for ISR (Incremental Static Regeneration) & Backend Tasks.
 *
 * PURPOSE:
 * This client is used during the build process (generateStaticParams) and for
 * backend-only logic where no user session exists.
 *
 * - It does NOT access cookies (unlike server.ts).
 * - It ensures static pages can be generated without a request context.
 * - If SUPABASE_SERVICE_ROLE_KEY is present, it has full database access (bypassing RLS).
 *   Use this for revalidation or administrative scripts.
 * - Otherwise it falls back to the public key (read-only for public data).
 *
 * NOTE: The "Company Owner" (Human Admin) should NOT use this. They should log in
 * via the standard flow and use `server.ts` or `client.ts` which handle their session.
 */

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      // No session to keep on the server; without this the client starts a
      // refresh timer that keeps the process alive during build tasks.
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
