-- Delivery pricing: size tiers, the per-km formula inputs, and free-shipping
-- rules that scale with distance.
--
-- Shape is `base_fee + (distance_km * per_km_rate)`, not pure per-km. inDrive
-- can charge per km because the ride IS the product and marginal cost is fuel;
-- here a trip carries a large fixed cost — loading an 85 kg refrigerator, two
-- handlers, dispatching a vehicle. At 8 EGP/km a 2 km delivery prices at 16
-- EGP, which does not cover carrying it down the stairs.

-- ---------------------------------------------------------------------------
-- delivery_tiers
--
-- A fridge and a microwave are not the same trip: different vehicle, different
-- number of handlers. Both the fixed and the per-km component vary.
--
-- The seeded numbers are STARTING POINTS, not researched costs. per_km_rate is
-- applied to one-way distance but is meant to cover the round trip, since the
-- vehicle has to come back. The shop must tune these on /admin/shipping.
-- ---------------------------------------------------------------------------

create table if not exists public.delivery_tiers (
  key text primary key,
  label_ar text not null,
  base_fee numeric not null default 0 check (base_fee >= 0),
  per_km_rate numeric not null default 0 check (per_km_rate >= 0),
  min_fee numeric not null default 0 check (min_fee >= 0),
  max_fee numeric not null check (max_fee >= 0),
  display_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  check (max_fee >= min_fee)
);

drop trigger if exists set_delivery_tiers_updated_at on public.delivery_tiers;
create trigger set_delivery_tiers_updated_at
  before update on public.delivery_tiers
  for each row execute function public.set_updated_at();

insert into public.delivery_tiers
  (key, label_ar, base_fee, per_km_rate, min_fee, max_fee, display_order) values
  ('small', 'أجهزة صغيرة',  40,  4,  40,  500, 1),
  ('large', 'أجهزة كبيرة', 120,  8, 120, 1500, 2)
on conflict (key) do nothing;

comment on table public.delivery_tiers is
  'Vehicle/handling classes and their pricing inputs. Seeded values are '
  'starting points for the shop to tune, not measured costs.';

-- ---------------------------------------------------------------------------
-- Tier assignment
--
-- The category tree already encodes size: أجهزة منزلية كبيرة versus
-- أجهزة منزلية صغيرة. That is 41 products classified with zero data entry.
-- NULL means "inherit" — resolution order is product -> category -> parent
-- category -> 'small', and that resolution lives in the TypeScript registry
-- where it is unit-tested.
--
-- Weight is deliberately NOT the input: only 29 of 41 active products carry
-- الوزن الصافي in specifications, and for appliances bulk matters more anyway.
-- ---------------------------------------------------------------------------

alter table public.categories
  add column if not exists delivery_tier text references public.delivery_tiers(key);

alter table public.products
  add column if not exists delivery_tier text references public.delivery_tiers(key);

comment on column public.categories.delivery_tier is
  'Delivery size class. NULL inherits from the parent category.';
comment on column public.products.delivery_tier is
  'Per-product override. NULL inherits from the category.';

update public.categories set delivery_tier = 'large'
where name_ar in ('أجهزة منزلية كبيرة', 'شاشات و تليفيزيونات', 'مكيفات هواء')
  and delivery_tier is null;

update public.categories set delivery_tier = 'small'
where name_ar in ('أجهزة منزلية صغيرة', 'أجهزة تحضير طعام')
  and delivery_tier is null;

-- ---------------------------------------------------------------------------
-- free_shipping_rules
--
-- Replaces the single global `free_shipping_threshold`, which under distance
-- pricing would fund a 700 km trip out of a barely-qualifying order.
--
-- Seeded EMPTY on purpose: the old threshold was null (disabled), so leaving
-- this table empty preserves current behaviour exactly. Inventing a giveaway
-- policy the shop never authorised would be worse than shipping none — the
-- admin adds rules once they know their margins.
-- ---------------------------------------------------------------------------

create table if not exists public.free_shipping_rules (
  id serial primary key,
  -- Applies to orders delivered at or within this road distance.
  max_distance_km numeric not null check (max_distance_km > 0),
  -- ...whose subtotal reaches this. Both must hold.
  min_order_total numeric not null check (min_order_total > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  unique (max_distance_km)
);

drop trigger if exists set_free_shipping_rules_updated_at on public.free_shipping_rules;
create trigger set_free_shipping_rules_updated_at
  before update on public.free_shipping_rules
  for each row execute function public.set_updated_at();

comment on table public.free_shipping_rules is
  'Distance-banded free delivery. Evaluated by narrowest matching band: the '
  'first rule whose max_distance_km covers the order, then its min_order_total '
  'decides. Empty means free shipping is off.';

-- The global threshold is superseded; two competing mechanisms would drift.
delete from public.app_settings where key = 'free_shipping_threshold';

-- ---------------------------------------------------------------------------
-- RLS — matching the governorates and localities policies
-- ---------------------------------------------------------------------------

alter table public.delivery_tiers enable row level security;
alter table public.free_shipping_rules enable row level security;

drop policy if exists "Delivery tiers are publicly readable" on public.delivery_tiers;
create policy "Delivery tiers are publicly readable"
  on public.delivery_tiers for select to anon, authenticated using (true);

drop policy if exists "Admins manage delivery tiers" on public.delivery_tiers;
create policy "Admins manage delivery tiers"
  on public.delivery_tiers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Free shipping rules are publicly readable" on public.free_shipping_rules;
create policy "Free shipping rules are publicly readable"
  on public.free_shipping_rules for select to anon, authenticated using (true);

drop policy if exists "Admins manage free shipping rules" on public.free_shipping_rules;
create policy "Admins manage free shipping rules"
  on public.free_shipping_rules for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
