-- Move variant-axis PRESENTATION out of TypeScript and into data.
--
-- ---------------------------------------------------------------------------
-- The seam this migration draws
--
-- A variant axis carries four different kinds of fact, and they do NOT have the
-- same cost to change. Conflating them is why adding a new kind of group has
-- needed a developer:
--
--   IDENTITY      are two values the same value
--                 -> normalize_axis_value() + its TypeScript twin
--                 -> MUST stay in code, MUST stay axis-independent, and
--                    changing it requires REINDEX products_group_variant_norm_uniq
--
--   STRUCTURE     which axes a group varies by, and each member's value
--                 -> product_groups.axes, products.variant_values
--                 -> already accepts any key; unchanged by this migration
--
--   PRESENTATION  Arabic label, render kind, schema.org property, order
--                 -> THIS TABLE
--                 -> a row the admin writes; no deploy
--
--   AUTHORING     how the admin names an axis and sets a value
--                 -> application layer
--
-- THIS MIGRATION DOES NOT TOUCH normalize_axis_value(), so it needs NO REINDEX.
-- Do not add one defensively: rebuilding
-- products_group_variant_norm_uniq takes an exclusive lock for no reason.
-- ---------------------------------------------------------------------------
--
-- Why a table rather than more entries in AXIS_REGISTRY: the catalogue keeps
-- inventing axes. Colour and capacity were anticipated; نوع الشواية (grill or
-- no grill) was not, and نوع الشاشة (digital screen or none) was not. Each one
-- works TODAY as an unstyled text pill because variantAxisKind() defaults to
-- 'text' — but giving it a proper label, a numeric ordering or a schema.org
-- property means editing a TypeScript literal and shipping a release, for a
-- two-admin shop that does this a few times a year.
--
-- AXIS_REGISTRY stays in src/features/products/constants/variant-axes.ts as the
-- compile-time fallback and as the seed below. Resolution is a FALLBACK CHAIN,
-- never a switch:
--
--   variant_axes row  ->  AXIS_REGISTRY  ->  { kind: 'text', label: key }
--
-- so an axis with a row behaves better, an axis without one behaves exactly as
-- it does today, and an axis nobody has ever heard of still renders.

-- ---------------------------------------------------------------------------
-- 1. variant_axes
-- ---------------------------------------------------------------------------

create table if not exists public.variant_axes (
  /*
   * An axis key IS a specification key — see the header note in
   * variant-axes.ts. `groupSpecifications()` matches spec keys by exact
   * string, so a parallel vocabulary would let the buy-box selector and the
   * spec table disagree about what a product's colour is.
   */
  key             text primary key,
  label_ar        text not null,

  /*
   * How the storefront renders and orders the axis.
   *   color — image swatch, falling back to a hex chip then a text pill
   *   size  — text pill, ordered by the number inside the value
   *   text  — text pill, ordered by the order its members appear in
   * 'text' is the default for the same reason it is the default in code: it is
   * the kind that cannot render badly.
   */
  kind            text not null default 'text'
                    check (kind in ('color', 'size', 'text')),

  /*
   * The schema.org Product property that honestly expresses this axis, when
   * one exists. NULL means the axis is real but has no standard vocabulary — a
   * grill is not color, size, material or pattern — and product-json-ld.ts
   * states it as a generic `additionalProperty` instead of inventing a name.
   *
   * Constrained to the five properties the renderer knows. `model` is
   * deliberately included even though Google does not accept it in `variesBy`;
   * that filter lives in product-json-ld.ts, because it is a fact about Google
   * rather than about the catalogue.
   */
  schema_property text
                    check (schema_property is null
                           or schema_property in ('color', 'size', 'material',
                                                  'pattern', 'model')),

  -- Drives the order of the admin's axis suggestions, not the order of a
  -- group's selector rows — that is product_groups.axes, which is per group.
  display_order   int not null default 100,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint variant_axes_key_trimmed check (key = btrim(key) and key <> ''),
  constraint variant_axes_label_trimmed check (label_ar = btrim(label_ar) and label_ar <> '')
);

drop trigger if exists set_variant_axes_updated_at on public.variant_axes;
create trigger set_variant_axes_updated_at
  before update on public.variant_axes
  for each row execute function public.set_updated_at();

comment on table public.variant_axes is
  'Presentation metadata for a variant axis: Arabic label, render kind, '
  'schema.org property. Resolution is a fallback chain — this table, then '
  'AXIS_REGISTRY in variant-axes.ts, then { kind: text, label: key } — so an '
  'axis with no row here still works. Axis IDENTITY (normalize_axis_value) is '
  'deliberately NOT here: it backs a unique index and changing it needs a '
  'REINDEX.';

comment on column public.variant_axes.key is
  'Also a products.specifications key, by contract. groupSpecifications() '
  'matches by exact string.';

-- ---------------------------------------------------------------------------
-- 2. RLS — mirrors product_groups in 20260823091000
-- ---------------------------------------------------------------------------

-- World readable: the storefront renders the switcher anonymously and must be
-- able to resolve an axis label and kind without a session.
alter table public.variant_axes enable row level security;

drop policy if exists "Enable read access for all users" on public.variant_axes;
create policy "Enable read access for all users"
  on public.variant_axes
  for select
  to public
  using (true);

drop policy if exists "Admins can insert variant axes" on public.variant_axes;
create policy "Admins can insert variant axes"
  on public.variant_axes
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update variant axes" on public.variant_axes;
create policy "Admins can update variant axes"
  on public.variant_axes
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete variant axes" on public.variant_axes;
create policy "Admins can delete variant axes"
  on public.variant_axes
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Seed from AXIS_REGISTRY
-- ---------------------------------------------------------------------------

/*
 * The nine entries currently hardcoded in variant-axes.ts, plus نوع الشاشة,
 * which a live group already varies by (da09d33e, the Toshiba gas cooker) and
 * which has therefore been running on the 'text' default with the raw key as
 * its label.
 *
 * Both colour spellings appear because the catalogue uses الألوان on 68
 * products and اللون on 7, and both are real spec keys.
 *
 * `on conflict do nothing`: re-running this migration must never overwrite a
 * label the admin has since corrected.
 */
insert into public.variant_axes (key, label_ar, kind, schema_property, display_order)
values
  ('اللون',        'اللون',       'color', 'color', 10),
  ('الألوان',      'اللون',       'color', 'color', 11),
  ('المقاس',       'المقاس',      'size',  'size',  20),
  ('السعة',        'السعة',       'size',  'size',  30),
  ('الحجم',        'الحجم',       'size',  'size',  31),
  ('حجم الشاشة',   'حجم الشاشة',  'size',  'size',  40),
  ('البوصة',       'المقاس',      'size',  'size',  41),
  ('نوع الشواية',  'نوع الشواية', 'text',  null,    50),
  ('نوع الشاشة',   'نوع الشاشة',  'text',  null,    51),
  ('موديل المنتج', 'الموديل',     'text',  'model', 90)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 4. product_group_health: two new warnings
-- ---------------------------------------------------------------------------

/*
 * Replaces the view from 20260825093000. The two columns added here are the
 * ones that would have caught the live mistakes:
 *
 *   members_axis_spec_mismatch — the Toshiba gas cooker declares
 *     variant_values = {"نوع الشاشة":"بدون شاشة"} and has NO نوع الشاشة row in
 *     its specifications at all, so the switcher and the spec table disagree
 *     and groupSpecifications() cannot group the one fact that distinguishes
 *     the variants. CLAUDE.md recorded this as an open item; it is now counted.
 *
 *   undeclared_axes — axes with no variant_axes row, running on the 'text'
 *     fallback with the raw key as their label. Not broken, just unfinished,
 *     and invisible until now.
 */
create or replace view public.product_group_health as
select
  g.id,
  g.name_ar,
  g.axes,
  count(p.id)                                          as member_count,
  count(p.id) filter (where p.is_active)               as active_count,
  count(p.id) filter (where p.is_group_primary)        as primary_count,
  count(p.id) filter (
    where not exists (select 1 from public.product_images i where i.product_id = p.id)
  )                                                    as members_without_images,
  /*
   * A member is "incomplete" when it carries no value for one of the axes its
   * group declares — it renders as an option with a blank label, or drops out
   * of that axis row entirely.
   */
  count(p.id) filter (
    where exists (
      select 1 from unnest(g.axes) as axis
      where coalesce(p.variant_values ->> axis, '') = ''
    )
  )                                                    as members_missing_axis,
  /*
   * The reverse: a value for an axis the group does not declare. Usually the
   * residue of a group that was re-axed, and invisible everywhere in the UI.
   */
  count(p.id) filter (
    where exists (
      select 1 from jsonb_object_keys(coalesce(p.variant_values, '{}'::jsonb)) as k
      where not (k = any (g.axes))
    )
  )                                                    as members_with_extra_axis,
  /*
   * The axis value and the spec row for the same key must agree — an axis key
   * IS a spec key. Compared through normalize_axis_value so a ة/ه difference
   * is not reported as a disagreement.
   *
   * A MISSING spec row counts as a mismatch: normalize_axis_value(axis, NULL)
   * returns '' and the variant value does not, so `is distinct from` is true.
   * That is deliberate — a missing row is exactly the gas cooker's state and
   * the thing worth surfacing.
   */
  count(p.id) filter (
    where exists (
      select 1 from unnest(g.axes) as axis
      where coalesce(p.variant_values ->> axis, '') <> ''
        and public.normalize_axis_value(axis, p.variant_values ->> axis)
            is distinct from
            public.normalize_axis_value(axis, p.specifications ->> axis)
    )
  )                                                    as members_axis_spec_mismatch,
  -- Axes with no presentation row, still running on the 'text' fallback.
  (
    select array_agg(axis order by axis)
    from unnest(g.axes) as axis
    where not exists (
      select 1 from public.variant_axes va where va.key = axis
    )
  )                                                    as undeclared_axes
from public.product_groups g
left join public.products p on p.group_id = g.id
group by g.id, g.name_ar, g.axes;

comment on view public.product_group_health is
  'Per-group warnings for the admin groups page: singletons, members with no '
  'image, members missing a declared axis, members carrying an undeclared '
  'axis, members whose axis value disagrees with their own specifications, '
  'axes with no variant_axes row, and groups without exactly one primary.';

/*
 * Run as the invoker, so the view sees exactly what the caller is allowed to
 * see — `products` restricts anonymous reads to is_active = true, so an
 * anonymous caller counts only published members while the admin dashboard,
 * reading through a cookie-bound client, sees archived ones too. Without this
 * the view would run as its owner and leak archived rows to the storefront.
 *
 * Re-asserted because `create or replace view` does not preserve it.
 */
alter view public.product_group_health set (security_invoker = on);
