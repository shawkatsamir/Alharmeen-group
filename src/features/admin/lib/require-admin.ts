import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/types/database.types";

export type AdminGuardResult =
  | { ok: true; supabase: SupabaseClient<Database>; userId: string }
  | { ok: false; message: string };

/**
 * Admin gate for Server Actions.
 *
 * `src/app/admin/layout.tsx` is a client component (sidebar state +
 * next-themes), so it cannot guard auth — CLAUDE.md requires each admin page to
 * check for itself. The same applies to the actions those pages call: relying
 * on RLS alone means an unauthorized write fails as a generic database error,
 * and an RLS-blocked UPDATE returns no error and zero rows at all, which reads
 * as success unless the caller remembers `.select().single()`.
 *
 * Checking here gives every mutation one explicit, Arabic-messaged refusal.
 */
export async function requireAdmin(): Promise<AdminGuardResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "يجب تسجيل الدخول أولاً" };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || profile?.role !== "admin") {
    return { ok: false, message: "هذا الإجراء متاح للمسؤولين فقط" };
  }

  return { ok: true, supabase, userId: user.id };
}
