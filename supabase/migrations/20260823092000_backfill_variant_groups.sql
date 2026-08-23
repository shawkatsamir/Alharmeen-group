-- Backfill the seven colour groups that exist in the catalogue today.
--
-- The SKU-suffix regex used to *discover* these clusters is deliberately not
-- shipped here. It was the right tool for an audit a human then reviewed, but as
-- production SQL it is a heuristic that silently groups the wrong two fridges:
-- it originally mis-grouped RF-31FTV-DST with RF-40FTV (because three of its
-- spec fields had been copy-pasted from that product — repaired in
-- 20260823090000), and it missed the `(BK)` suffix convention entirely, hiding
-- three of the seven groups including the only three-variant one.
--
-- So the mapping below is an explicit, reviewed list. Fifteen products, seven
-- groups, each verified against the product name rather than against
-- `specifications` — which matters, because SJ-58C(SL) has NO colour spec at
-- all (its `الألوان` key is null) while its name clearly reads "سيلفر". Reading
-- the axis value from `specifications` would have dropped that variant out of
-- its own group.
--
-- Deliberately NOT grouped: RF-31FTV-BK and RF-31FTV-DST. The SKU root suggests
-- a pair, but they are 296 لتر and 355 لتر — different products, not finishes.
--
-- Colour is the only axis any of these vary by, so every group is
-- `axes = {'اللون'}`.

-- ---------------------------------------------------------------------------
-- 1. Groups and membership
-- ---------------------------------------------------------------------------

with group_def(group_key, name_ar) as (
  values
    ('MOM-C25BBE', 'ميكروويف تورنيدو شواية 25 لتر 900 وات 10 قوائم'),
    ('RF-40FTV',   'ثلاجة تورنيدو انفرتر نوفروست 355 لتر'),
    ('RF-480TV',   'ثلاجة تورنيدو انفرتر نوفروست 396 لتر'),
    ('RF-580TV',   'ثلاجة تورنيدو انفرتر نوفروست 450 لتر'),
    ('SJ-58C',     'ثلاجة شارب نوفروست 450 لتر'),
    ('SJ-GV58G',   'ثلاجة شارب انفرتر نوفروست 450 لتر'),
    ('SJ-PC58A',   'ثلاجة شارب ديجيتال نوفروست 450 لتر')
),
-- Skip any group already present, so re-running is harmless.
pending as (
  select group_key, name_ar, gen_random_uuid() as id
  from group_def d
  where not exists (
    select 1 from public.product_groups g where g.name_ar = d.name_ar
  )
),
created as (
  insert into public.product_groups (id, name_ar, axes)
  select id, name_ar, array['اللون'] from pending
  returning id
),
member_def(group_key, sku, color) as (
  values
    ('MOM-C25BBE', 'MOM-C25BBE-BK', 'أسود'),
    ('MOM-C25BBE', 'MOM-C25BBE-S',  'سيلفر'),
    ('RF-40FTV',   'RF-40FTV-BK',   'أسود'),
    ('RF-40FTV',   'RF-40FTV-DST',  'استانلس غامق'),
    ('RF-480TV',   'RF-480TV-BK',   'أسود'),
    ('RF-480TV',   'RF-480TV-DST',  'استانلس غامق'),
    ('RF-580TV',   'RF-580TV-BK',   'أسود'),
    ('RF-580TV',   'RF-580TV-DST',  'استانلس غامق'),
    ('SJ-58C',     'SJ-58C(BK)',    'أسود'),
    -- No `الألوان` spec on this row; the colour comes from its name.
    ('SJ-58C',     'SJ-58C(SL)',    'سيلفر'),
    ('SJ-58C',     'SJ-58C(ST)',    'استانلس'),
    ('SJ-GV58G',   'SJ-GV58G-BK',   'أسود زجاجي'),
    ('SJ-GV58G',   'SJ-GV58G-SL',   'سيلفر زجاجي'),
    ('SJ-PC58A',   'SJ-PC58A(BK)',  'أسود'),
    ('SJ-PC58A',   'SJ-PC58A(ST)',  'استانلس')
)
update public.products p
set group_id       = pending.id,
    variant_values = jsonb_build_object('اللون', m.color)
from member_def m
join pending on pending.group_key = m.group_key
where p.sku = m.sku;

-- ---------------------------------------------------------------------------
-- 2. Group primaries
-- ---------------------------------------------------------------------------

/*
 * The primary is the variant that represents the group in listings and carries
 * the ProductGroup structured data.
 *
 * Ranked active-first, then cheapest: an archived variant has no page for a
 * swatch to link to (`getVariantSiblings` filters `is_active`), so making one
 * primary would point the group at a URL that `generateStaticParams` never
 * built. Cheapest-among-active then matches what the grid advertises — quoting
 * anything above the group's real entry price reads as a price rise.
 *
 * `sku` is the final tiebreak so the choice is reproducible.
 */
with ranked as (
  select id,
         row_number() over (
           partition by group_id
           order by is_active desc, price asc, sku asc
         ) = 1 as should_be_primary
  from public.products
  where group_id is not null
)
update public.products p
set is_group_primary = ranked.should_be_primary
from ranked
where ranked.id = p.id
  and p.is_group_primary is distinct from ranked.should_be_primary;
