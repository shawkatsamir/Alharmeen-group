import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

/**
 * Cookie-bound client, shared across a request via React's `cache()`.
 *
 * Each `createServerClient` carries its own auth state, so calling this helper
 * repeatedly in one request built several independent clients over the same
 * cookies. `/admin/products/[id]/edit` created four — one for the auth guard,
 * then three more concurrently inside `Promise.all`.
 *
 * Sharing one instance per render collapses that to a single auth state, which
 * is both cheaper and removes a class of concurrent-refresh race. Note this
 * only memoizes during Server Component rendering; Route Handlers and Server
 * Actions have no request-scoped cache, where it is simply a no-op.
 *
 * Same pattern as `getNavigationCategories` in `services/server/categories.ts`.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
});

export async function createStaticClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    },
  );
}
