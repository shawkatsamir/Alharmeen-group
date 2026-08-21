-- Stop exposing the customer list to the public.
--
-- The only SELECT policy on `profiles` was:
--
--   "enable reading user data"  FOR SELECT TO public  USING (true)
--
-- `public` includes the `anon` role, and the publishable key is shipped in the
-- client bundle, so **anyone** could read every row: all 14 email addresses,
-- 9 phone numbers and 9 home addresses. Verified by running the query as `anon`
-- before this migration.
--
-- Every read in the application is already self-scoped
-- (`.eq("id", user.id)` in the account page, checkout form, user menu, login
-- action and each admin guard), so narrowing the policy costs the app nothing.
--
-- `public.is_admin()` is SECURITY DEFINER with a pinned search_path, so calling
-- it from a policy on `profiles` does not recurse back through RLS.

drop policy if exists "enable reading user data" on public.profiles;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()) or public.is_admin());

-- The INSERT side is handled by the `handle_new_user` trigger on auth.users,
-- which is SECURITY DEFINER, so no INSERT policy is added here.

comment on table public.profiles is
  'Customer profile data. Readable only by the owner and by admins — this table '
  'holds email, phone and address, and was previously world-readable.';
