-- Catalogue hygiene, ahead of colour becoming a structured variant axis.
--
-- Three defects were found by auditing the live catalogue (81 rows, 38 active)
-- while designing product variant groups. Each of them silently breaks the
-- grouping of a product with its own colour siblings, so all three have to go
-- before `products.variant_values` exists.
--
--   1. Seven `sku` values carry surrounding whitespace — three with leading
--      spaces ("  RF-31FTV-BK") and four with a trailing newline
--      ("SJ-58C(SL)\n"). `sku` is UNIQUE, so these are live landmines: a store
--      owner retyping the SKU correctly gets a duplicate-key error against a
--      row whose SKU *looks* identical in the dashboard.
--
--   2. `RF-31FTV-DST` has three spec fields copy-pasted from a different
--      product (`RF-40FTV-BK`) — see below.
--
--   3. Colour is recorded as free text and has already drifted the same way
--      `orders.shipping_governorate` did before `normalize_governorate_name()`:
--      "سيلفر"(6) vs "فضي"(5), "أسود"(29) vs "اسود"(1),
--      "استانلس" vs "استانلس ستيل". A swatch row rendering "أسود" and "اسود"
--      as two separate colours is the exact failure this prevents.
--
-- Forward-only. Verified before writing: trimming collides with no existing
-- SKU and produces no duplicates, and no `slug` or `name_ar` is affected.

-- ---------------------------------------------------------------------------
-- 1. Colour match key
-- ---------------------------------------------------------------------------

/*
 * Returns a *comparison key* for a colour name, not a display value — the same
 * split `normalize_governorate_name()` uses. Callers that need to show a colour
 * read the stored text; callers that need to know whether two colours are the
 * same compare this.
 *
 * Folds: trim (including newlines and tabs, which `btrim/1` does NOT — its
 * default character set is the space alone, a trap that made an earlier version
 * of this migration a silent no-op on four rows), collapse internal runs of
 * whitespace, strip tashkeel, lowercase, fold hamza forms onto bare alef,
 * ة onto ه, ى onto ي, and drop tatweel.
 *
 * Tashkeel (the diacritic block U+064B–U+0652 plus superscript alef U+0670) is
 * stripped first: no colour carries a diacritic today, but "أَسود" pasted from a
 * vowelled supplier sheet is otherwise a different string from "أسود", which is
 * precisely the drift this function exists to absorb.
 *
 * Deliberately does NOT fold "استانلس غامق" onto "استانلس" — dark stainless is
 * a different finish that the shop sells alongside plain stainless, and merging
 * them would collapse two real variants of RF-480TV/RF-580TV into one.
 */
create or replace function public.normalize_color_name(p_name text)
returns text
language sql
immutable
set search_path to 'public', 'pg_catalog'
as $$
  select lower(translate(
           btrim(regexp_replace(
             regexp_replace(coalesce(p_name, ''), '[ًٌٍَُِّْٰ]', '', 'g'),
             '\s+', ' ', 'g'
           )),
           'أإآةىـ', 'اااهي'
         ));
$$;

comment on function public.normalize_color_name(text) is
  'Comparison key for a free-text colour name. Mirrored in TypeScript by '
  'src/features/products/constants/variant-axes.ts — change both together.';

-- ---------------------------------------------------------------------------
-- 2. Strip whitespace from sku
-- ---------------------------------------------------------------------------

-- `regexp_replace`, not `btrim(sku)`: four of the seven bad rows end in a
-- newline, which the single-argument form of btrim does not remove.
update public.products
set sku = regexp_replace(sku, '^\s+|\s+$', '', 'g')
where sku <> regexp_replace(sku, '^\s+|\s+$', '', 'g');

-- ---------------------------------------------------------------------------
-- 3. Repair RF-31FTV-DST
-- ---------------------------------------------------------------------------

/*
 * This row is "ثلاجة تورنيدو انفرتر نوفروست 296 لتر استانلس غامق RF-31FTV-DST"
 * but carried موديل المنتج = 'RF-40FTV-BK', السعة = '355 لتر' and
 * الألوان = 'أسود' — all three pasted from RF-40FTV-BK in one edit.
 *
 * `name_ar` is the field the customer sees and the only one of the four that is
 * self-consistent, so it is taken as the source of truth. Both RF-31FTV rows
 * are archived (`is_active = false`), so this corrects no live storefront page.
 *
 * Left uncorrected, the SKU-root heuristic reads this row as a 355 لتر أسود
 * fridge and groups it with RF-40FTV rather than with its actual sibling
 * RF-31FTV-BK.
 */
update public.products
set specifications = specifications
      || jsonb_build_object(
           'موديل المنتج', 'RF-31FTV-DST',
           'السعة',        '296 لتر',
           'الألوان',      'استانلس غامق'
         )
where sku = 'RF-31FTV-DST'
  and specifications->>'موديل المنتج' = 'RF-40FTV-BK';

-- ---------------------------------------------------------------------------
-- 4. Canonicalise colour spellings
-- ---------------------------------------------------------------------------

/*
 * An explicit review list rather than a generated fold, because the canonical
 * form is a judgement call that has to match how the shop actually writes:
 * every product *name* uses "سيلفر" and "استانلس", so the spec values follow
 * the names rather than the other way round.
 *
 * Conservative on purpose. "اينوكس" (inox) and "أوف وايت" (off-white) are left
 * alone — they are plausibly distinct finishes in this catalogue, and folding a
 * colour that turns out to be real is far more expensive to undo than leaving
 * two spellings that an admin can merge by hand.
 */
-- Both spelling keys are rewritten in a single aggregated jsonb merge. No row
-- currently holds both `الألوان` and `اللون`, but an `UPDATE ... FROM` that can
-- match one target row twice applies only one of the matches, so the shape is
-- made safe rather than left dependent on that.
with canonical(variant, canonical_name) as (
  values
    ('اسود',          'أسود'),
    ('فضي',           'سيلفر'),
    ('استانلس ستيل',  'استانلس')
),
fixes as (
  select p.id, jsonb_object_agg(k.key, c.canonical_name) as patch
  from public.products p
  cross join (values ('الألوان'), ('اللون')) as k(key)
  join canonical c
    on public.normalize_color_name(c.variant)
       = public.normalize_color_name(p.specifications->>k.key)
  where p.specifications ? k.key
    and p.specifications->>k.key <> c.canonical_name
  group by p.id
)
update public.products p
set specifications = p.specifications || f.patch
from fixes f
where f.id = p.id;
