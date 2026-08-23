-- Product variant groups: link the colour/size siblings of one physical product.
--
-- Until now a colour variant was an unrelated `products` row. Nothing in the
-- schema said that SJ-58C(BK), SJ-58C(SL) and SJ-58C(ST) are one fridge in three
-- finishes, so the storefront could not offer a colour switcher, category grids
-- repeated three near-identical cards, and search returned three rows for one
-- product. Nothing told Google either — the sibling pages were unlinked and
-- unmarked, which is what actually costs rankings, rather than the mere fact of
-- their having separate URLs.
--
-- Every variant keeps its own row, slug, SKU, price, stock and images, and stays
-- separately indexable. This migration adds only the *relationship*.
--
-- The axis model is deliberately multi-axis (`variant_values jsonb`) even though
-- the UI ships with colour alone: the catalogue already sells the same appliance
-- in several capacities, and widening a jsonb object later costs nothing whereas
-- adding a second dedicated column costs a migration plus a re-backfill.

-- ---------------------------------------------------------------------------
-- 1. product_groups
-- ---------------------------------------------------------------------------

create table if not exists public.product_groups (
  id         uuid primary key default gen_random_uuid(),
  -- Group display name, e.g. "ثلاجة شارب نوفروست 450 لتر" — the product without
  -- its finish. Used in the admin group picker and as the ProductGroup `name`
  -- in structured data.
  name_ar    text not null,
  name_en    text,
  -- Ordered axis keys, e.g. {'اللون'} or {'اللون','السعة'}. Ordering drives the
  -- order the selectors render in, which is why it is an array and not a set.
  axes       text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint product_groups_axes_not_empty check (cardinality(axes) > 0)
);

drop trigger if exists set_product_groups_updated_at on public.product_groups;
create trigger set_product_groups_updated_at
  before update on public.product_groups
  for each row execute function public.set_updated_at();

comment on table public.product_groups is
  'A physical product sold in several variants. Each variant remains its own '
  'row in `products`; this table only carries what the variants share.';

-- ---------------------------------------------------------------------------
-- 2. products columns
-- ---------------------------------------------------------------------------

alter table public.products
  -- `on delete set null`, not cascade: deleting a grouping must never delete
  -- product rows that `order_items.product_id` still references.
  add column if not exists group_id uuid
    references public.product_groups(id) on delete set null,
  add column if not exists variant_values jsonb,
  add column if not exists is_group_primary boolean not null default false;

-- Mirrors `products_content_blocks_is_array`: keep the jsonb shape honest at the
-- column rather than trusting every writer.
alter table public.products
  drop constraint if exists products_variant_values_is_object;
alter table public.products
  add constraint products_variant_values_is_object
  check (variant_values is null or jsonb_typeof(variant_values) = 'object');

-- A product cannot be the primary of a group it does not belong to.
alter table public.products
  drop constraint if exists products_group_primary_requires_group;
alter table public.products
  add constraint products_group_primary_requires_group
  check (not is_group_primary or group_id is not null);

comment on column public.products.variant_values is
  'Axis value per key in product_groups.axes, e.g. {"اللون":"سيلفر"}. Colour '
  'values are compared with normalize_color_name().';

comment on column public.products.is_group_primary is
  'The variant that represents the group in listings and that carries the '
  'ProductGroup structured data. Exactly one per group.';

-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------

create index if not exists products_group_id_idx
  on public.products (group_id) where group_id is not null;

/*
 * Exactly one primary per group. Deliberately the same shape as the
 * `unique (product_id) where is_primary` index on product_images added in
 * 20260819090000 — that index exists because 3 products had two primary images
 * and 21 had none, and the identical mistake is available here.
 */
create unique index if not exists products_group_primary_uniq
  on public.products (group_id) where is_group_primary;

-- Two variants of one group cannot claim the same combination of axis values —
-- "the admin duplicated a product and forgot to change the colour".
create unique index if not exists products_group_variant_uniq
  on public.products (group_id, variant_values) where group_id is not null;

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------

-- Mirrors the policies added for product_images in 20260819090000: world
-- readable (the storefront renders it anonymously), admin-writable via the
-- existing SECURITY DEFINER helper `public.is_admin()`.
alter table public.product_groups enable row level security;

drop policy if exists "Enable read access for all users" on public.product_groups;
create policy "Enable read access for all users"
  on public.product_groups
  for select
  to public
  using (true);

drop policy if exists "Admins can insert product groups" on public.product_groups;
create policy "Admins can insert product groups"
  on public.product_groups
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update product groups" on public.product_groups;
create policy "Admins can update product groups"
  on public.product_groups
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete product groups" on public.product_groups;
create policy "Admins can delete product groups"
  on public.product_groups
  for delete
  to authenticated
  using (public.is_admin());
