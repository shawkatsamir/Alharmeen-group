-- ============================================================================
-- Make the database the SOLE writer of order_status_history.
--
-- BACKGROUND
-- `log_status_change_trigger` already wrote this table correctly on UPDATE,
-- while the application ALSO tried to write it using columns that do not
-- exist (`previous_status` / `new_status`). Those inserts failed and the
-- errors were swallowed, so the audit log silently rotted: at the time of
-- writing, 18 of 33 orders had no history at all and the newest history row
-- was 4 months older than the newest order.
--
-- Renaming the columns in the app would NOT have been the fix — it would have
-- produced two rows per transition. Instead the app-level inserts are removed
-- (see the accompanying app change) and the trigger becomes the only writer.
--
-- WHAT THIS DOES
--   1. UNIQUE (order_id, status) — a timeline step can never be duplicated.
--   2. log_order_status_change() now fires on INSERT too, so the initial
--      'قيد الانتظار' is finally recorded when an order is placed.
--   3. Drops the dead RLS INSERT policy.
--
-- DEPLOY ORDER: safe to apply BEFORE the app deploy.
--   - The old `previous_status`/`new_status` inserts already fail today and
--     are swallowed; that stays true.
--   - checkout-actions.ts used the correct column names but was blocked by
--     the dead policy anyway, and its result was never checked, so it cannot
--     throw either way.
-- ============================================================================

begin;

-- 1 ─ Uniqueness.
--   Verified before writing this migration: 0 duplicate (order_id, status)
--   pairs across 27 rows, so this applies cleanly. It is a genuine invariant
--   rather than a dedupe hack, because the state machine added in the next
--   migration is acyclic — a status can never legitimately repeat.
alter table public.order_status_history
  add constraint order_status_history_order_id_status_key
  unique (order_id, status);

-- 2 ─ Log on INSERT as well as on status change.
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $$
begin
  -- Short-circuits on INSERT, so OLD is never dereferenced there.
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.order_status_history (order_id, status, changed_by)
    values (new.id, new.status, auth.uid())
    -- Belt and braces: logging history must never be able to abort the
    -- order write that triggered it.
    on conflict (order_id, status) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists log_status_change_trigger on public.orders;
create trigger log_status_change_trigger
  after insert or update on public.orders
  for each row execute function public.log_order_status_change();

-- 3 ─ Remove the dead policy.
--   `(auth.jwt() ->> 'role')` is the Postgres role ('authenticated' / 'anon'),
--   never profiles.role, so this WITH CHECK could never pass for any user.
--   order_status_history is owned by `postgres`, log_order_status_change() is
--   SECURITY DEFINER owned by `postgres`, and the table has
--   relforcerowsecurity = false — so the trigger bypasses RLS regardless.
--   With no application-level writer left, the policy is dead weight.
drop policy if exists "Admins can insert status history" on public.order_status_history;

commit;
