-- Admin-editable shipping cost per governorate, plus the shared settings table.
--
-- Until now `shipping_cost` was hardcoded to 0 in three separate places
-- (checkout-actions.ts, OrderSummary.tsx, CartSummary.tsx) and the customer was
-- shown "مجاني" for every order. The shop delivers to different governorates at
-- different costs and cannot serve all of them, so the rate has to be data, not
-- a constant — and the client needs to set it themselves from real order
-- traffic rather than have it baked into a deploy.
--
-- `orders.shipping_governorate` stays free text on purpose: an order must
-- snapshot the name it was placed under, and `orders.shipping_cost` already
-- snapshots the rate. What changes is the *input* — checkout now picks from
-- this table instead of accepting typed text.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog'
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

/*
 * Collapses the Arabic spelling variants that free-text entry produced.
 *
 * The 38 existing orders hold 11 distinct governorate strings for 5 actual
 * governorates: "الشرقية", "الشرقية " (trailing space) and "الشرقيه " (ه for ة)
 * are the same place, as are "اسكندرية" and "الاسكندريه" (missing hamza, ه for
 * ة, and one of them lacking the ال prefix entirely). Grouping orders by the
 * raw column therefore produces useless traffic figures.
 *
 * Normalising: trim, fold hamza forms onto bare alef, ة onto ه, ى onto ي,
 * drop tatweel, then drop a leading ال.
 */
create or replace function public.normalize_governorate_name(p_name text)
returns text
language sql
immutable
set search_path to 'public', 'pg_catalog'
as $$
  select regexp_replace(
           btrim(translate(coalesce(p_name, ''), 'أإآةىـ', 'اااهي')),
           '^ال',
           ''
         );
$$;

-- ---------------------------------------------------------------------------
-- governorates
-- ---------------------------------------------------------------------------

create table if not exists public.governorates (
  id serial primary key,
  name_ar text not null unique,
  shipping_cost numeric not null default 0 check (shipping_cost >= 0),
  -- The shop cannot reach every governorate. Checkout refuses these outright
  -- rather than taking an order it can never fulfil.
  is_deliverable boolean not null default true,
  display_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create index if not exists governorates_normalized_name_idx
  on public.governorates (public.normalize_governorate_name(name_ar));

drop trigger if exists set_governorates_updated_at on public.governorates;
create trigger set_governorates_updated_at
  before update on public.governorates
  for each row execute function public.set_updated_at();

comment on table public.governorates is
  'The 27 Egyptian governorates with an admin-editable delivery rate. '
  'Source of truth for the checkout governorate picker and shipping cost.';

-- Starting rates, banded by distance from the Sharqia/Cairo delivery base.
-- These are defaults so the feature works the day it ships; the client is
-- expected to tune them from the traffic column on /admin/shipping.
insert into public.governorates (name_ar, shipping_cost, display_order) values
  ('القاهرة',        60,  1),
  ('الجيزة',         60,  2),
  ('الإسكندرية',     75,  3),
  ('الشرقية',        50,  4),
  ('القليوبية',      60,  5),
  ('الدقهلية',       70,  6),
  ('المنوفية',       70,  7),
  ('الغربية',        70,  8),
  ('البحيرة',        75,  9),
  ('كفر الشيخ',      75, 10),
  ('دمياط',          75, 11),
  ('بورسعيد',        80, 12),
  ('الإسماعيلية',    70, 13),
  ('السويس',         75, 14),
  ('الفيوم',         85, 15),
  ('بني سويف',       85, 16),
  ('المنيا',         90, 17),
  ('أسيوط',          95, 18),
  ('سوهاج',         100, 19),
  ('قنا',           105, 20),
  ('الأقصر',        110, 21),
  ('أسوان',         115, 22),
  ('البحر الأحمر',  120, 23),
  ('مطروح',         120, 24),
  ('الوادي الجديد', 130, 25),
  ('شمال سيناء',    130, 26),
  ('جنوب سيناء',    130, 27)
on conflict (name_ar) do nothing;

-- ---------------------------------------------------------------------------
-- app_settings
-- ---------------------------------------------------------------------------

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

comment on table public.app_settings is
  'Site-wide admin-editable values. Every row is public-readable, so store '
  'only values that are safe to ship in the client bundle — never secrets.';

insert into public.app_settings (key, value, description) values
  ('free_shipping_threshold',
   'null'::jsonb,
   'Order subtotal in EGP at or above which shipping is free. null disables it.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- RLS
--
-- Both tables are written as tracked policies from the start. The policies on
-- `orders` and `notifications` were configured through the dashboard and exist
-- nowhere in this repo; these two should not repeat that.
-- ---------------------------------------------------------------------------

alter table public.governorates enable row level security;
alter table public.app_settings enable row level security;

-- Read is open to anon: checkout supports guest orders, so an unauthenticated
-- visitor has to be able to price their own delivery.
drop policy if exists "Governorates are publicly readable" on public.governorates;
create policy "Governorates are publicly readable"
  on public.governorates for select to anon, authenticated using (true);

drop policy if exists "Admins manage governorates" on public.governorates;
create policy "Admins manage governorates"
  on public.governorates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Settings are publicly readable" on public.app_settings;
create policy "Settings are publicly readable"
  on public.app_settings for select to anon, authenticated using (true);

drop policy if exists "Admins manage settings" on public.app_settings;
create policy "Admins manage settings"
  on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Backfill: canonicalise the governorate spellings already in `orders`
-- ---------------------------------------------------------------------------

update public.orders o
set shipping_governorate = g.name_ar
from public.governorates g
where public.normalize_governorate_name(o.shipping_governorate)
    = public.normalize_governorate_name(g.name_ar)
  and o.shipping_governorate is distinct from g.name_ar;

-- Trailing/leading whitespace on the city line, same free-text origin.
update public.orders
set shipping_city = btrim(shipping_city)
where shipping_city <> btrim(shipping_city);
