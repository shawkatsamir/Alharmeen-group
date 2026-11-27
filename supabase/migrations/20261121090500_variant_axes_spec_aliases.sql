-- Teach the axis/spec agreement check about alias spellings, and split it in two.
--
-- ---------------------------------------------------------------------------
-- Why this follows 20261121090000 instead of amending it
--
-- Forward-only. That migration is already applied remotely under its own
-- stamped version, and editing the file would make the tracked record differ
-- from what ran — the exact divergence CLAUDE.md warns about.
-- ---------------------------------------------------------------------------
--
-- `members_axis_spec_mismatch` as first written reported 9 of 10 live groups,
-- which makes a warning worthless. The cause was not the rule but a missing
-- fact: the colour groups declare the axis `اللون` while the catalogue records
-- the colour under `الألوان` on 68 products and `اللون` on only 7. Fifteen of
-- the eighteen flagged rows carried the SAME value under the other spelling —
-- not an error, two names for one fact. AXIS_REGISTRY has always treated both
-- as colour; the database had no way to know.
--
-- With aliases taught, what remains is real and worth acting on:
--
--   * GR-RU312WE-DMN(06)  switcher says رمادي غامق, spec says اللون = سيلفر
--   * GR-RU312WE-DMN(37H) switcher says رمادي فاتح, spec says اللون = سيلفر
--     (all three Toshiba freezers carry the silver one's colour spec)
--   * SJ-58C(SL)          no colour spec under either spelling
--   * RLA2-90MG5GE(MG)-EG no نوع الشاشة spec at all
--
-- The first two are a customer-visible contradiction — the spec table and the
-- variant switcher state different colours on the same page. The last two are
-- merely incomplete. Different urgency, different fix, so they are now two
-- columns rather than one number that mixes them.

-- ---------------------------------------------------------------------------
-- 1. Alias spellings
-- ---------------------------------------------------------------------------

alter table public.variant_axes
  add column if not exists spec_aliases text[] not null default '{}';

comment on column public.variant_axes.spec_aliases is
  'Other specifications keys that state this axis''s fact. Exists because the '
  'catalogue spells colour both الألوان (68 products) and اللون (7), and the '
  'agreement check must not read that as a disagreement. Deliberately NOT a '
  'normalisation device: these are distinct keys that groupSpecifications() '
  'still matches separately.';

/*
 * Seeded conservatively — only the colour pair, which is verified across the
 * live catalogue. The same discipline as CANONICAL_COLORS: `المقاس` and
 * `الحجم` are plausibly different facts on an appliance (external dimensions
 * versus capacity class), and merging two keys that turn out to be distinct is
 * far more expensive to undo than leaving two an admin can alias later.
 */
update public.variant_axes set spec_aliases = array['الألوان'] where key = 'اللون';
update public.variant_axes set spec_aliases = array['اللون']   where key = 'الألوان';

-- ---------------------------------------------------------------------------
-- 2. The spec keys that may state an axis
-- ---------------------------------------------------------------------------

/*
 * STABLE, not IMMUTABLE, because it reads a table.
 *
 * It must therefore NEVER back an index. That is not a limitation here — this
 * is presentation/reporting, and axis IDENTITY stays in the IMMUTABLE
 * normalize_axis_value() that products_group_variant_norm_uniq depends on.
 * Keeping the two apart is the whole point of the variant_axes seam.
 *
 * Not SECURITY DEFINER: variant_axes is world-readable, so an anonymous
 * caller of the security_invoker view resolves aliases fine.
 */
create or replace function public.axis_spec_keys(p_axis text)
returns text[]
language sql
stable
set search_path to 'public', 'pg_catalog'
as $$
  select array[p_axis] || coalesce(
    (select va.spec_aliases from public.variant_axes va where va.key = p_axis),
    '{}'::text[]
  );
$$;

comment on function public.axis_spec_keys(text) is
  'The specifications keys that may state a given axis: the axis key itself '
  'plus its declared aliases. STABLE (reads variant_axes) and so must never '
  'back an index.';

-- ---------------------------------------------------------------------------
-- 3. The view, alias-aware and split
-- ---------------------------------------------------------------------------

/*
 * DROP then CREATE, not CREATE OR REPLACE.
 *
 * `create or replace view` can only append columns — it refuses to insert
 * `members_axis_spec_missing` ahead of the existing `undeclared_axes`
 * ("cannot change name of view column"). Appending instead would leave the two
 * agreement columns separated by an unrelated one for no reason. The view
 * holds no data, nothing else depends on it, and a migration runs in one
 * transaction, so there is no window in which it is missing.
 */
drop view if exists public.product_group_health;

create view public.product_group_health as
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
  -- No value for a declared axis: renders as a blank-labelled option, or drops
  -- out of that axis row entirely.
  count(p.id) filter (
    where exists (
      select 1 from unnest(g.axes) as axis
      where coalesce(p.variant_values ->> axis, '') = ''
    )
  )                                                    as members_missing_axis,
  -- The reverse: a value for an axis the group does not declare. Usually the
  -- residue of a re-axed group, and invisible everywhere in the UI.
  count(p.id) filter (
    where exists (
      select 1 from jsonb_object_keys(coalesce(p.variant_values, '{}'::jsonb)) as k
      where not (k = any (g.axes))
    )
  )                                                    as members_with_extra_axis,
  /*
   * CONTRADICTION: a spec row states this axis and states something else.
   * The product page then shows one colour in the spec table and another on
   * the switcher. Satisfied by ANY candidate key agreeing, so the
   * اللون/الألوان split is not reported.
   */
  count(p.id) filter (
    where exists (
      select 1 from unnest(g.axes) as axis
      where coalesce(p.variant_values ->> axis, '') <> ''
        and exists (
          select 1 from unnest(public.axis_spec_keys(axis)) as sk
          where coalesce(p.specifications ->> sk, '') <> ''
        )
        and not exists (
          select 1 from unnest(public.axis_spec_keys(axis)) as sk
          where public.normalize_axis_value(axis, p.specifications ->> sk)
              = public.normalize_axis_value(axis, p.variant_values ->> axis)
        )
    )
  )                                                    as members_axis_spec_mismatch,
  /*
   * INCOMPLETE: the varying fact appears nowhere in the spec table under the
   * axis key or any alias, so groupSpecifications() cannot group it and the
   * buy-box chips cannot show it. Lower severity than a contradiction.
   */
  count(p.id) filter (
    where exists (
      select 1 from unnest(g.axes) as axis
      where coalesce(p.variant_values ->> axis, '') <> ''
        and not exists (
          select 1 from unnest(public.axis_spec_keys(axis)) as sk
          where coalesce(p.specifications ->> sk, '') <> ''
        )
    )
  )                                                    as members_axis_spec_missing,
  -- Axes with no presentation row, still on the 'text' fallback. Not broken,
  -- just unfinished, and invisible until now.
  (
    select array_agg(axis order by axis)
    from unnest(g.axes) as axis
    where not exists (select 1 from public.variant_axes va where va.key = axis)
  )                                                    as undeclared_axes
from public.product_groups g
left join public.products p on p.group_id = g.id
group by g.id, g.name_ar, g.axes;

comment on view public.product_group_health is
  'Per-group warnings for the admin groups page: singletons, members with no '
  'image, members missing a declared axis, members carrying an undeclared '
  'axis, members whose spec table contradicts their variant value, members '
  'whose varying fact is absent from their spec table, axes with no '
  'variant_axes row, and groups without exactly one primary.';

-- Re-asserted because `create or replace view` does not preserve it.
alter view public.product_group_health set (security_invoker = on);
