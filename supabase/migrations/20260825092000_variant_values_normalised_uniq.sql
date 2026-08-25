-- Compare variant combinations by their NORMALISED values, not raw jsonb.
--
-- `products_group_variant_uniq` compares `variant_values` as stored, so a group
-- already holding {"اللون":"أسود"} happily accepts {"اللون":"اسود"} — a different
-- string, the same colour — and the storefront renders two swatches for one
-- finish. A size axis is worse: "43 بوصة", "٤٣ بوصة" and "43 بوصه" are three
-- distinct strings for one screen size, and the digit spellings are exactly what
-- a supplier sheet pastes in.
--
-- ---------------------------------------------------------------------------
-- What this does and does NOT catch
--
-- It catches ORTHOGRAPHIC drift: hamza forms, ة/ه, ى/ي, tashkeel, tatweel,
-- Arabic-Indic and Persian digits, double spaces, casing.
--
-- It does NOT catch SYNONYMS. "فضي" and "سيلفر" are different words for one
-- colour; only the CANONICAL_COLORS alias table folds those, and it lives in
-- TypeScript. Baking that table into an IMMUTABLE function backing an index
-- would turn every new alias into a REINDEX that can fail against live data —
-- so synonyms stay an input-time nudge (the admin form canonicalises on blur and
-- warns about near-matches) rather than a storage constraint.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Pre-flight
-- ---------------------------------------------------------------------------

/*
 * Fail with a sentence rather than an opaque unique violation, and roll the
 * whole migration back cleanly. Verified zero collisions when written — which
 * will not stay true as the catalogue grows, which is the point of shipping the
 * index now.
 */
do $$
declare
  dupes int;
  null_values int;
begin
  select count(*) into dupes from (
    select group_id, public.normalize_variant_values(variant_values)
    from public.products
    where group_id is not null and variant_values is not null
    group by 1, 2 having count(*) > 1
  ) d;

  if dupes > 0 then
    raise exception
      'refusing to build products_group_variant_norm_uniq: % duplicate normalised combination(s) remain', dupes;
  end if;

  select count(*) into null_values
  from public.products
  where group_id is not null and variant_values is null;

  if null_values > 0 then
    raise exception
      'refusing to add products_grouped_has_variant_values: % grouped row(s) carry no variant_values', null_values;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. A grouped product must carry a combination
-- ---------------------------------------------------------------------------

/*
 * NULLs are distinct in a unique index, so without this two grouped rows with no
 * `variant_values` both insert and the index never sees them. Cheaper and
 * stronger than making the index NULLS NOT DISTINCT, which would also apply to
 * `group_id`.
 */
alter table public.products
  drop constraint if exists products_grouped_has_variant_values;
alter table public.products
  add constraint products_grouped_has_variant_values
  check (group_id is null or variant_values is not null);

-- ---------------------------------------------------------------------------
-- 3. Swap the index
-- ---------------------------------------------------------------------------

-- No CONCURRENTLY: it cannot run inside a transaction block and Supabase
-- migrations run in one. At this table size the exclusive lock is milliseconds.
create unique index if not exists products_group_variant_norm_uniq
  on public.products (group_id, public.normalize_variant_values(variant_values))
  where group_id is not null;

/*
 * The raw index is strictly weaker — raw-equal implies normalised-equal — so
 * keeping both would only mean two different Postgres error messages for one
 * class of admin mistake, and error-mapping code that has to know both.
 */
drop index if exists public.products_group_variant_uniq;

comment on index public.products_group_variant_norm_uniq is
  'Two variants of one group cannot claim the same normalised combination. '
  'Depends on normalize_axis_value(); changing that function REQUIRES '
  'REINDEX INDEX products_group_variant_norm_uniq in the same migration — '
  'Postgres neither rebuilds nor warns, and stale entries surface as phantom '
  'duplicates.';
