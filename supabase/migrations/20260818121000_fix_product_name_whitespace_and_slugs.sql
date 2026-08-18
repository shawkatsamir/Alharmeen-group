-- Data hygiene for values entered by hand through the Supabase table editor.
--
-- 1. Trailing newlines on names.
--    `btrim(x)` with no explicit character set strips *spaces only*, so an
--    earlier pass reported success while leaving 59 names ending in "\n".
--    Those newlines surface as stray whitespace in <h1>, breadcrumbs, <title>
--    and the JSON-LD `name`.
--
-- 2. Two unusable slugs.
--    '/sharp-...' has a leading slash and 'toshiba-... aew-...' an embedded
--    space. Next.js encodes both (%2F, %20), so neither product page could ever
--    resolve — they were 404s at build time. Rewriting them can only improve on
--    that, since there is no working URL to break.

update public.products
   set name_ar = btrim(name_ar, E' \t\n\r\f\v')
 where name_ar <> btrim(name_ar, E' \t\n\r\f\v');

update public.products
   set name_en = btrim(name_en, E' \t\n\r\f\v')
 where name_en is not null
   and name_en <> btrim(name_en, E' \t\n\r\f\v');

update public.categories
   set name_ar = btrim(name_ar, E' \t\n\r\f\v'),
       name_en = btrim(name_en, E' \t\n\r\f\v')
 where name_ar <> btrim(name_ar, E' \t\n\r\f\v')
    or name_en <> btrim(name_en, E' \t\n\r\f\v');

update public.products
   set slug = 'sharp-refrigerator-digital-no-frost-396-liter-stainless-sj-pc48a-st'
 where slug = '/sharp-refrigerator-digital-no-frost-396-liter-stainless-sj-pc48a-st';

update public.products
   set slug = 'toshiba-washing-machine-11-kg-silver-aew-e1150supds'
 where slug = 'toshiba-washing-maching-11-kg-sliver aew-eqq50supds';
