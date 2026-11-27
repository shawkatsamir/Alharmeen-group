-- Revoke the variant-group RPCs from `anon` explicitly.
--
-- ---------------------------------------------------------------------------
-- The trap: `revoke all on function … from public` is NOT enough on Supabase.
--
-- 20261121091000 revoked from `public` and granted to `authenticated`, which
-- reads like it locks `anon` out. It does not. Supabase ships
-- ALTER DEFAULT PRIVILEGES granting EXECUTE on new functions in `public` to
-- both `anon` and `authenticated`, so each role holds a DIRECT grant.
-- Revoking the PUBLIC pseudo-role grant leaves those untouched, and the
-- database linter immediately reported all three functions as callable
-- anonymously through /rest/v1/rpc/… (lint 0028).
--
-- The functions were never actually exploitable — each one calls is_admin()
-- first, auth.uid() is NULL for `anon`, so the call raises 42501 before
-- touching a row. But a SECURITY DEFINER function reachable by an anonymous
-- caller is one `is_admin()` edit away from being a hole, and the precedent in
-- this schema is strict: place_order() is granted to service_role ALONE.
--
-- Any future SECURITY DEFINER function in this schema must revoke from `anon`
-- BY NAME. Verify with:
--   select has_function_privilege('anon', 'public.fn(args)', 'execute');
-- ---------------------------------------------------------------------------

revoke all on function public.create_variant_group(uuid, text, text, text, boolean) from anon;
revoke all on function public.rename_variant_axis(uuid, text, text) from anon;
revoke all on function public.set_variant_value(uuid, text, text, boolean) from anon;
