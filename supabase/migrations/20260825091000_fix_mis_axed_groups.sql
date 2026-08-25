-- Repair the two groups the colour-only variant tool produced.
--
-- `startVariantFromProduct` hardcoded `axes = {'اللون'}` and, when a product had
-- no colour recorded, wrote the literal "أساسي" as its colour. Both defects are
-- fixed in code (see actions/variant-groups.ts) — this migration cleans up what
-- they left behind. The code fix ships first on purpose: repairing the rows
-- while the tool still fabricates values just regenerates the mess.
--
-- ---------------------------------------------------------------------------
-- 1. Midea microwave pair — grouped by colour, actually differ by grill
--
--   EM0P042MX-S  6,600  {"اللون":"سيلفر"}   0 images
--   EG0P042MX-S  7,100  {"اللون":"أساسي"}   1 image, primary
--
-- Both are silver 32-litre Midea microwaves. What differs is the grill, so the
-- storefront switcher currently offers "سيلفر" beside "أساسي" — one of them an
-- empty tile, neither of them meaningful.
--
-- Re-axed rather than ungrouped: same brand, same capacity, same finish, and a
-- 500 EGP difference that is a real product-line choice a shopper should see.
--
-- The axis key is `نوع الشواية`, NOT the existing `الشواية` spec key whose live
-- convention is نعم/لا — "نعم" reads terribly as a swatch label. The key is
-- added to both rows' `specifications` in the same statement, honouring the
-- "an axis key IS a spec key" contract in variant-axes.ts so the selector and
-- the spec table cannot disagree.
--
-- 2. Toshiba freezer trio — a legitimate colour group with cosmetic defects
--
-- Its name carries a colour and a double space; two values spell رمادي with ى.
-- Note the ى/ي difference is DISPLAY-ONLY: those values already normalise
-- equal, so no uniqueness rule would ever have flagged them.
-- ---------------------------------------------------------------------------
--
-- Idempotency: every statement is keyed by `sku` and guarded on the exact
-- pre-state it corrects, so a re-run — or a run after an admin has fixed one of
-- these by hand — touches zero rows. Groups are resolved by MEMBER SKU, never
-- by name, because the names are what this migration changes.

-- ---------------------------------------------------------------------------
-- 1a. Re-axe the microwave group
-- ---------------------------------------------------------------------------

update public.product_groups g
set axes = array['نوع الشواية'],
    name_ar = 'ميكروويف ميديا 32 لتر'
where g.id = (select group_id from public.products where sku = 'EG0P042MX-S')
  and g.axes = array['اللون'];

-- ---------------------------------------------------------------------------
-- 1b. Replace the fabricated axis values
-- ---------------------------------------------------------------------------

/*
 * `variant_values` is REPLACED, never `||`-merged. A merge would leave the stale
 * `اللون` key behind, producing a row carrying a value for an axis its group no
 * longer declares — which nothing validates and the health view would then have
 * to report.
 */
update public.products
set variant_values = jsonb_build_object('نوع الشواية', 'بشواية'),
    specifications = coalesce(specifications, '{}'::jsonb)
                     || jsonb_build_object('نوع الشواية', 'بشواية')
where sku = 'EG0P042MX-S'
  and variant_values = '{"اللون": "أساسي"}'::jsonb;

update public.products
set variant_values = jsonb_build_object('نوع الشواية', 'بدون شواية'),
    specifications = coalesce(specifications, '{}'::jsonb)
                     || jsonb_build_object('نوع الشواية', 'بدون شواية')
where sku = 'EM0P042MX-S'
  and variant_values = '{"اللون": "سيلفر"}'::jsonb;

-- ---------------------------------------------------------------------------
-- 1c. EM0P042MX-S leads with the WRONG product's SKU
-- ---------------------------------------------------------------------------

/*
 * Its name_ar is "EG0P042MX-S ميكروويف ميديا 32 لتر -فضي" — the SKU of its
 * sibling, pasted in. Only the wrong prefix is removed; rewriting the rest is an
 * editorial decision that changes the H1, the title, OG tags and JSON-LD, and
 * belongs in the admin UI rather than in a migration.
 */
update public.products
set name_ar = btrim(regexp_replace(name_ar, '^EG0P042MX-S\s*', ''))
where sku = 'EM0P042MX-S'
  and name_ar like 'EG0P042MX-S %';

-- ---------------------------------------------------------------------------
-- 2a. Group names: collapse whitespace everywhere
-- ---------------------------------------------------------------------------

-- General and idempotent by construction; also protects any future group whose
-- name is derived from a double-spaced product name.
update public.product_groups
set name_ar = btrim(regexp_replace(name_ar, '\s+', ' ', 'g'))
where name_ar <> btrim(regexp_replace(name_ar, '\s+', ' ', 'g'));

-- ---------------------------------------------------------------------------
-- 2b. Freezer group: drop the colour from the group name
-- ---------------------------------------------------------------------------

update public.product_groups g
set name_ar = 'فريزر توشيبا 7 درج'
where g.id = (select group_id from public.products where sku = 'GR-RU312WE-DMN(57)')
  and g.name_ar like 'فريزر توشيبا 7 درج%';

-- ---------------------------------------------------------------------------
-- 2c. رمادى -> رمادي, as an explicit two-row list
-- ---------------------------------------------------------------------------

/*
 * NEVER run the full normaliser over a stored DISPLAY value. It folds أ -> ا,
 * which would turn the catalogue's canonical "أسود" into "اسود" — precisely the
 * drift migration 20260823090000 was written to remove. An explicit list is
 * reviewable and, at two rows, cheaper than a guarded generic fold.
 */
update public.products
set variant_values = jsonb_build_object('اللون', 'رمادي فاتح')
where sku = 'GR-RU312WE-DMN(37H)'
  and variant_values = '{"اللون": "رمادى فاتح"}'::jsonb;

update public.products
set variant_values = jsonb_build_object('اللون', 'رمادي غامق')
where sku = 'GR-RU312WE-DMN(06)'
  and variant_values = '{"اللون": "رمادى غامق"}'::jsonb;

-- ---------------------------------------------------------------------------
-- 3. Assert the post-state
-- ---------------------------------------------------------------------------

-- Fails loudly rather than half-succeeding, so a partial application cannot pass
-- for a clean one.
do $$
declare
  bad int;
begin
  select count(*) into bad
  from public.products
  where sku in ('EG0P042MX-S', 'EM0P042MX-S')
    and not (variant_values ? 'نوع الشواية');
  if bad > 0 then
    raise exception 'microwave pair still lacks the نوع الشواية axis (% rows)', bad;
  end if;

  select count(*) into bad
  from public.products
  where variant_values::text like '%رمادى%';
  if bad > 0 then
    raise exception 'رمادى still present in variant_values (% rows)', bad;
  end if;

  select count(*) into bad
  from public.products
  where variant_values::text like '%أساسي%';
  if bad > 0 then
    raise exception 'fabricated أساسي axis value still present (% rows)', bad;
  end if;

  select count(*) into bad from public.product_groups
  where name_ar <> btrim(regexp_replace(name_ar, '\s+', ' ', 'g'));
  if bad > 0 then
    raise exception 'group names still carry stray whitespace (% rows)', bad;
  end if;
end $$;
