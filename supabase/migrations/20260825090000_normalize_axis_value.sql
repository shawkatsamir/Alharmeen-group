-- Generalise the variant-value normaliser from colour to any axis.
--
-- `normalize_color_name()` was written when colour was the only thing a product
-- could vary by. The catalogue now also varies by size (43/55 بوصة on screens,
-- 32 لتر on microwaves) and by component (a microwave with a grill and the same
-- microwave without one), and a size axis has a hygiene problem colour does not:
-- Arabic-Indic digits. "٤٣ بوصة" and "43 بوصة" are the same size written two
-- ways, and nothing folded them.
--
-- ---------------------------------------------------------------------------
-- Why a new function plus a wrapper, rather than editing the existing one
--
--   * `normalize_color_name` is called by shipped migration 20260823090000,
--     which must keep replaying from scratch on a branch or a rebuild. The
--     symbol has to keep existing with the same signature.
--   * A function whose NAME says colour should not silently fold digits.
--   * One implementation behind two names makes drift structurally impossible
--     rather than a convention someone has to remember.
--
-- Mirrored in TypeScript by src/features/products/constants/variant-axes.ts
-- (`normalizeAxisValue`) — change both in the same commit.
-- ---------------------------------------------------------------------------

/*
 * Comparison key for a variant axis value — not a display value. Two values are
 * the same value when their keys match; the customer sees the stored text.
 *
 * Folds, in this exact order (the TypeScript twin must match step for step):
 *   1. strip tashkeel (U+064B–U+0652, U+0670)
 *   2. collapse internal whitespace runs to one space
 *   3. trim
 *   4. أإآ -> ا, ة -> ه, ى -> ي, Arabic-Indic and Persian digits -> ASCII,
 *      tatweel deleted
 *   5. lowercase
 *
 * TATWEEL MUST STAY LAST in the `translate` source string. `translate` deletes
 * a character whose position exceeds the length of the target string, and that
 * is the only reason tatweel disappears. Appending the digit pairs in front of
 * it preserves that; appending them after would silently give tatweel a
 * replacement and leave the digits unfolded.
 *
 * `p_axis` is deliberately unused. It is NOT a hook for per-axis rules — unit
 * synonyms (كجم/كيلوجرام) must never be folded here, because normalisation
 * decides identity and a wrong fold merges two genuinely different products.
 * The argument exists so the signature matches the TypeScript twin: a unique
 * index depends on this function, and changing its signature later would mean
 * dropping and rebuilding that index.
 *
 * NOTE: this function backs a UNIQUE INDEX. Changing its body requires
 *   REINDEX INDEX public.products_group_variant_norm_uniq;
 * in the same migration — Postgres will neither rebuild nor warn, and stale
 * index entries surface as phantom duplicates.
 */
create or replace function public.normalize_axis_value(p_axis text, p_value text)
returns text
language sql
immutable
set search_path to 'public', 'pg_catalog'
as $$
  select lower(translate(
           btrim(regexp_replace(
             regexp_replace(coalesce(p_value, ''), '[ًٌٍَُِّْٰ]', '', 'g'),
             '\s+', ' ', 'g'
           )),
           'أإآةى' || '٠١٢٣٤٥٦٧٨٩' || '۰۱۲۳۴۵۶۷۸۹' || 'ـ',
           'اااهي' || '0123456789' || '0123456789'
         ));
$$;

comment on function public.normalize_axis_value(text, text) is
  'Comparison key for a variant axis value. Mirrored in TypeScript by '
  'src/features/products/constants/variant-axes.ts — change both together, and '
  'REINDEX products_group_variant_norm_uniq when the body changes.';

-- Colour-specific alias, kept so migration 20260823090000 keeps replaying and
-- so no existing call site moves.
create or replace function public.normalize_color_name(p_name text)
returns text
language sql
immutable
set search_path to 'public', 'pg_catalog'
as $$
  select public.normalize_axis_value('اللون', p_name);
$$;

comment on function public.normalize_color_name(text) is
  'Thin wrapper over normalize_axis_value() retained for the colour axis and '
  'for migration 20260823090000.';

/*
 * Normalise every value in a `variant_values` object.
 *
 * Exists to back a functional unique index, which is why it has to be a scalar
 * IMMUTABLE function: `jsonb_each_text` is set-returning and cannot appear in
 * an index expression directly.
 *
 * The `coalesce` is load-bearing — `jsonb_object_agg` over an empty set returns
 * NULL, and a NULL index entry stops colliding with anything, which would
 * quietly defeat the uniqueness it exists to enforce.
 *
 * jsonb stores object keys in a canonical order already, so key order needs no
 * handling here.
 */
create or replace function public.normalize_variant_values(p_values jsonb)
returns jsonb
language sql
immutable
set search_path to 'public', 'pg_catalog'
as $$
  select case
    when p_values is null or jsonb_typeof(p_values) <> 'object' then p_values
    else coalesce(
      (
        select jsonb_object_agg(kv.key, public.normalize_axis_value(kv.key, kv.value))
        from jsonb_each_text(p_values) kv
      ),
      '{}'::jsonb
    )
  end;
$$;

comment on function public.normalize_variant_values(jsonb) is
  'Per-value normalisation of products.variant_values, backing the '
  'products_group_variant_norm_uniq index.';
