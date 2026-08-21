-- Partial payments, recorded as an append-only ledger.
--
-- The shop takes money before shipping — customer places an order, the shop
-- phones or WhatsApps them, the customer sends part or all of the total via
-- Vodafone Cash / InstaPay, and only then does the order get confirmed. That
-- needs a "partially paid" state, and the failure mode of a plain status field
-- is an order flagged مدفوعة جزئياً with no amount attached: nobody can tell
-- the customer what is still owed.
--
-- So payment status is *derived*, never set. `order_payments` holds the facts;
-- `orders.payment_status` and `orders.amount_paid` are computed from them by
-- the triggers below. Application code writing either column is overwritten.
-- Same discipline as `log_status_change_trigger` owning order_status_history.
--
-- Payment status is deliberately NOT part of the order status machine in
-- `order-status.ts`. An order is legitimately جاري التجهيز *and* مدفوع جزئياً
-- at once; merging the two would turn 7 states into ~28 and break the
-- forward-only invariant that UNIQUE (order_id, status) depends on.

-- ---------------------------------------------------------------------------
-- Columns and constraints
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists amount_paid numeric not null default 0;

comment on column public.orders.amount_paid is
  'Net of public.order_payments. Maintained by trigger — never write directly.';

-- Existing values are only unpaid/paid, so widening is safe.
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('unpaid', 'partially_paid', 'paid', 'refunded', 'failed'));

-- `failed` is retained for backward compatibility; the manual wallet flow
-- never produces it, but no migration should silently invalidate stored rows.

-- payment_method had no constraint at all. Every existing row is 'cod'.
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('cod', 'vodafone_cash', 'instapay', 'bank_transfer'));

-- ---------------------------------------------------------------------------
-- The ledger
-- ---------------------------------------------------------------------------

create table if not exists public.order_payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  -- Positive = money received, negative = refund or correction. Rows are never
  -- deleted or edited; a mistake is cancelled by a compensating negative row,
  -- which is what keeps `recorded_by` and the original timestamp intact.
  amount numeric not null check (amount <> 0),
  method text not null check (
    method in ('cod', 'vodafone_cash', 'instapay', 'bank_transfer', 'cash')
  ),
  -- Vodafone Cash and InstaPay both issue a transaction id. Without it a
  -- dispute months later is unresolvable.
  reference text,
  notes text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists order_payments_order_id_idx
  on public.order_payments (order_id);

-- Guards the "admin refreshes and records the same 500 twice" mistake, without
-- blocking genuine repeat payments, which carry different references.
create unique index if not exists order_payments_order_reference_key
  on public.order_payments (order_id, reference)
  where reference is not null;

comment on table public.order_payments is
  'Append-only record of money received against an order. Positive amounts are '
  'payments, negative are refunds/corrections. Sole input to orders.payment_status.';

-- ---------------------------------------------------------------------------
-- Derivation
-- ---------------------------------------------------------------------------

/*
 * Mirrored in TypeScript by `derivePaymentStatus` in
 * src/features/orders/constants/payment.ts. Change both in the same commit.
 *
 * `numeric` is exact decimal, so `>=` needs no epsilon.
 */
create or replace function public.derive_payment_status(
  p_paid numeric,
  p_total numeric,
  p_has_refund boolean
)
returns text
language sql
immutable
set search_path to 'public', 'pg_catalog'
as $$
  select case
    when p_paid <= 0 and p_has_refund then 'refunded'
    when p_paid <= 0                  then 'unpaid'
    when p_paid >= p_total            then 'paid'
    else                                   'partially_paid'
  end;
$$;

/*
 * Recomputes on EVERY write to `orders`, which buys two things:
 *
 *  1. Application code cannot set payment_status or amount_paid. Whatever it
 *     sends is replaced by the derived value.
 *  2. A change to `total` re-derives automatically. Adding shipping to an
 *     already-paid order has to drop it back to partially_paid, or the shop
 *     silently under-collects.
 */
create or replace function public.sync_order_payment_totals()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog'
as $$
declare
  v_paid numeric;
  v_has_refund boolean;
begin
  select coalesce(sum(amount), 0), coalesce(bool_or(amount < 0), false)
    into v_paid, v_has_refund
  from public.order_payments
  where order_id = new.id;

  new.amount_paid := v_paid;
  new.payment_status := public.derive_payment_status(v_paid, new.total, v_has_refund);

  return new;
end;
$$;

/*
 * Ledger writes touch the parent order so the trigger above re-derives.
 * SECURITY DEFINER because a customer may read their own payments but has no
 * UPDATE policy on `orders` — the same reason cancel-order.ts needs the
 * service-role client.
 */
create or replace function public.touch_order_after_payment()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $$
declare
  v_order_id uuid := coalesce(new.order_id, old.order_id);
begin
  update public.orders set updated_at = now() where id = v_order_id;
  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------------
-- Backfill before the triggers exist
--
-- 5 orders are already marked 'paid' with no ledger rows behind them. Pure
-- derivation would flip them to 'unpaid' on their next update and lose that
-- fact, so give them a ledger row equal to their total first.
-- ---------------------------------------------------------------------------

insert into public.order_payments (order_id, amount, method, notes)
select o.id, o.total, 'cod',
       'ترحيل تلقائي: الطلب كان مسجلاً كمدفوع قبل إضافة سجل المدفوعات'
from public.orders o
where o.payment_status = 'paid'
  and o.total > 0
  and not exists (
    select 1 from public.order_payments p where p.order_id = o.id
  );

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists sync_order_payment_totals_trigger on public.orders;
create trigger sync_order_payment_totals_trigger
  before insert or update on public.orders
  for each row execute function public.sync_order_payment_totals();

drop trigger if exists touch_order_after_payment_trigger on public.order_payments;
create trigger touch_order_after_payment_trigger
  after insert or update or delete on public.order_payments
  for each row execute function public.touch_order_after_payment();

-- One pass to bring every existing order in line with its (possibly just
-- backfilled) ledger. The BEFORE trigger does the actual work.
update public.orders set updated_at = updated_at;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.order_payments enable row level security;

-- Customers see their own payment history on the order detail page. Guest
-- orders have user_id null and are unreachable here by design — the success
-- page reads them through the order itself.
drop policy if exists "Customers read own order payments" on public.order_payments;
create policy "Customers read own order payments"
  on public.order_payments for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_payments.order_id
        and o.user_id = (select auth.uid())
    )
  );

drop policy if exists "Admins manage order payments" on public.order_payments;
create policy "Admins manage order payments"
  on public.order_payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
