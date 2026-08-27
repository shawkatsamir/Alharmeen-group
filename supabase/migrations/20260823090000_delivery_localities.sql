-- Delivery localities with coordinates, so shipping can be priced by distance.
--
-- The flat per-governorate rate cannot work here: الشرقية is one row, but it
-- spans ~34 localities across hundreds of kilometres. ديرب نجم and فاقوس are
-- not the same trip. Charging them the same over-charges the near customer and
-- loses money on the far one.
--
-- `orders.shipping_city` stays free text — an order snapshots the name it was
-- placed under — but checkout will pick from this table, exactly as governorate
-- already does.

-- ---------------------------------------------------------------------------
-- Normalisation: generalise, do not fork
--
-- `normalize_governorate_name` is called by migration 20260821100000, which
-- must keep replaying, so it stays — reduced to a wrapper over a general
-- place-name normaliser. Same treatment `normalize_color_name` got when
-- `normalize_axis_value` generalised it.
--
-- `lower()` is added for Latin aliases ("Deyrab Negm", "Alex"). Arabic is
-- caseless, so this is a no-op for every existing caller.
-- ---------------------------------------------------------------------------

create or replace function public.normalize_place_name(p_name text)
returns text
language sql
immutable
set search_path to 'public', 'pg_catalog'
as $$
  select regexp_replace(
           btrim(lower(translate(coalesce(p_name, ''), 'أإآةىـ', 'اااهي'))),
           '^ال',
           ''
         );
$$;

create or replace function public.normalize_governorate_name(p_name text)
returns text
language sql
immutable
set search_path to 'public', 'pg_catalog'
as $$
  select public.normalize_place_name(p_name);
$$;

-- `governorates_normalized_name_idx` indexes this function. Replacing an
-- indexed IMMUTABLE function leaves the index built on the old definition and
-- Postgres neither rebuilds it nor warns — the trap CLAUDE.md records for
-- normalize_axis_value. lower() is a no-op on Arabic so the stored values do
-- not actually change, but reindexing is the only way to be sure of that.
reindex index public.governorates_normalized_name_idx;

-- ---------------------------------------------------------------------------
-- Great-circle distance
--
-- `least(1.0, ...)` guards the asin domain: floating point can push the sqrt
-- argument a hair above 1 for near-antipodal inputs and raise.
-- ---------------------------------------------------------------------------

create or replace function public.haversine_km(
  p_lat1 double precision, p_lng1 double precision,
  p_lat2 double precision, p_lng2 double precision
)
returns numeric
language sql
immutable
set search_path to 'public', 'pg_catalog'
as $$
  select round(
    (6371.0 * 2 * asin(least(1.0, sqrt(
      power(sin(radians(p_lat2 - p_lat1) / 2), 2)
      + cos(radians(p_lat1)) * cos(radians(p_lat2))
        * power(sin(radians(p_lng2 - p_lng1) / 2), 2)
    ))))::numeric,
    2
  );
$$;

-- ---------------------------------------------------------------------------
-- Origin and distance policy
--
-- Every distance in the system derives from this origin, so a wrong value
-- mis-prices everything. Inferred from 32 of 38 orders being ديرب نجم; the
-- admin can correct it and call recompute_locality_distances().
-- ---------------------------------------------------------------------------

insert into public.app_settings (key, value, description) values
  ('delivery_origin_name', '"ديرب نجم، الشرقية"'::jsonb,
   'Human-readable name of the dispatch point. Display only.'),
  ('delivery_origin_lat', '30.8167'::jsonb,
   'Latitude of the shop. Changing this requires recompute_locality_distances().'),
  ('delivery_origin_lng', '31.4333'::jsonb,
   'Longitude of the shop. Changing this requires recompute_locality_distances().'),
  ('delivery_road_factor', '1.3'::jsonb,
   'Multiplier from straight-line to road distance. Delta roads run ~1.25-1.35x. '
   'Applied at quote time, so changing it needs no recompute.'),
  ('max_delivery_km', '150'::jsonb,
   'Beyond this road distance the shop stops quoting and asks the customer to '
   'make contact, rather than accepting a trip it loses money on.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- localities
--
-- Deliberately not called `cities`. The shop distinguishes ديرب نجم (a markaz),
-- الشروق (a new city) and فيصل (a Giza district) at whatever granularity it
-- actually drives to. Administrative purity would mean rejecting the values
-- customers actually type.
-- ---------------------------------------------------------------------------

create table if not exists public.localities (
  id serial primary key,
  governorate_id integer not null references public.governorates(id) on delete cascade,
  name_ar text not null,
  lat double precision,
  lng double precision,
  -- Great-circle km to the origin, recomputed only when the origin moves.
  straight_km numeric,
  -- Set when reality disagrees with the map: a ferry crossing, a bad road.
  -- Takes precedence over straight_km * road_factor entirely.
  distance_km_override numeric check (distance_km_override is null or distance_km_override >= 0),
  is_deliverable boolean not null default true,
  -- Seeded coordinates are approximate locality centres. A wrong one silently
  -- mis-prices with no error, so the admin audit screen surfaces these.
  coordinates_verified boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  unique (governorate_id, name_ar)
);

create index if not exists localities_governorate_idx
  on public.localities (governorate_id);

create index if not exists localities_normalized_name_idx
  on public.localities (public.normalize_place_name(name_ar));

drop trigger if exists set_localities_updated_at on public.localities;
create trigger set_localities_updated_at
  before update on public.localities
  for each row execute function public.set_updated_at();

comment on table public.localities is
  'Delivery destinations with coordinates. Mixed granularity on purpose — '
  'markaz, new cities and major districts — matching how the shop actually '
  'plans trips rather than administrative boundaries.';

-- ---------------------------------------------------------------------------
-- locality_aliases
--
-- normalize_place_name folds Arabic orthography, but "Deyrab Negm" -> ديرب نجم
-- is transliteration, not spelling, and no algorithm gets there. Explicit
-- aliases, the same reason CANONICAL_COLORS exists alongside
-- normalize_axis_value in the variant work.
-- ---------------------------------------------------------------------------

create table if not exists public.locality_aliases (
  id serial primary key,
  locality_id integer not null references public.localities(id) on delete cascade,
  alias text not null
);

-- Global uniqueness: an alias must resolve to exactly one locality, or lookup
-- is ambiguous. A collision here should fail loudly rather than pick a winner.
create unique index if not exists locality_aliases_normalized_uniq
  on public.locality_aliases (public.normalize_place_name(alias));

create index if not exists locality_aliases_locality_idx
  on public.locality_aliases (locality_id);

comment on table public.locality_aliases is
  'Transliterations, truncations and colloquial names that map onto a '
  'locality. Populated from real order data.';

-- ---------------------------------------------------------------------------
-- Seed
--
-- الشرقية in full — it is the core market, 30 of 38 orders. Main localities for
-- the governorates within realistic reach, and the capital alone for the rest:
-- those resolve to the out-of-range path anyway, where the customer is asked to
-- make contact instead of being quoted.
-- ---------------------------------------------------------------------------

insert into public.localities (governorate_id, name_ar, lat, lng)
select g.id, v.name_ar, v.lat, v.lng
from (values
  -- الشرقية
  ('الشرقية', 'ديرب نجم',            30.8167, 31.4333),
  ('الشرقية', 'الزقازيق',            30.5877, 31.5020),
  ('الشرقية', 'منيا القمح',          30.4667, 31.4500),
  ('الشرقية', 'بلبيس',               30.4167, 31.5667),
  ('الشرقية', 'أبو حماد',            30.5333, 31.6667),
  ('الشرقية', 'أبو كبير',            30.7281, 31.6706),
  ('الشرقية', 'فاقوس',               30.7286, 31.7975),
  ('الشرقية', 'الحسينية',            30.8667, 31.9167),
  ('الشرقية', 'كفر صقر',             30.7969, 31.6236),
  ('الشرقية', 'الإبراهيمية',         30.6167, 31.7167),
  ('الشرقية', 'ههيا',                30.6667, 31.5833),
  ('الشرقية', 'مشتول السوق',         30.3667, 31.4167),
  ('الشرقية', 'القرين',              30.4667, 31.6667),
  ('الشرقية', 'أولاد صقر',           30.8500, 31.7167),
  ('الشرقية', 'الصالحية الجديدة',    30.6167, 32.0333),
  ('الشرقية', 'العاشر من رمضان',     30.3000, 31.7500),
  ('الشرقية', 'القنايات',            30.5667, 31.4167),
  ('الشرقية', 'صان الحجر',           30.9667, 31.8833),
  ('الشرقية', 'منشأة أبو عمر',       30.7500, 31.9500),
  -- الدقهلية
  ('الدقهلية', 'المنصورة',           31.0409, 31.3785),
  ('الدقهلية', 'ميت غمر',            30.7178, 31.2586),
  ('الدقهلية', 'السنبلاوين',         30.8794, 31.4589),
  ('الدقهلية', 'أجا',                30.9425, 31.2919),
  ('الدقهلية', 'بلقاس',              31.2167, 31.3500),
  ('الدقهلية', 'دكرنس',              31.0925, 31.5942),
  ('الدقهلية', 'المنزلة',            31.1592, 31.9375),
  -- القليوبية
  ('القليوبية', 'بنها',              30.4611, 31.1844),
  ('القليوبية', 'شبرا الخيمة',       30.1286, 31.2422),
  ('القليوبية', 'قليوب',             30.1792, 31.2072),
  ('القليوبية', 'طوخ',               30.3536, 31.2003),
  ('القليوبية', 'الخانكة',           30.2081, 31.3564),
  ('القليوبية', 'العبور',            30.2286, 31.4711),
  ('القليوبية', 'القناطر الخيرية',   30.1936, 31.1319),
  -- القاهرة
  ('القاهرة', 'مدينة نصر',           30.0561, 31.3300),
  ('القاهرة', 'مصر الجديدة',         30.0878, 31.3239),
  ('القاهرة', 'المعادي',             29.9603, 31.2578),
  ('القاهرة', 'الشروق',              30.1500, 31.6167),
  ('القاهرة', 'التجمع الخامس',       30.0080, 31.4300),
  ('القاهرة', 'وسط البلد',           30.0444, 31.2357),
  ('القاهرة', 'حلوان',               29.8419, 31.3342),
  ('القاهرة', 'شبرا',                30.0728, 31.2444),
  ('القاهرة', 'المرج',               30.1614, 31.3364),
  ('القاهرة', 'مدينة بدر',           30.1500, 31.7167),
  ('القاهرة', 'العباسية',            30.0700, 31.2800),
  ('القاهرة', 'الزيتون',             30.1000, 31.3167),
  -- الجيزة
  ('الجيزة', 'الدقي',                30.0383, 31.2119),
  ('الجيزة', 'المهندسين',            30.0592, 31.2003),
  ('الجيزة', 'فيصل',                 29.9964, 31.1531),
  ('الجيزة', 'الهرم',                29.9931, 31.1544),
  ('الجيزة', 'السادس من أكتوبر',     29.9285, 30.9188),
  ('الجيزة', 'الشيخ زايد',           30.0333, 30.9667),
  ('الجيزة', 'إمبابة',               30.0756, 31.2072),
  ('الجيزة', 'البدرشين',             29.8500, 31.2667),
  -- الإسكندرية
  ('الإسكندرية', 'الرمل',            31.2333, 29.9500),
  ('الإسكندرية', 'سموحة',            31.2117, 29.9439),
  ('الإسكندرية', 'المنتزه',          31.2833, 30.0167),
  ('الإسكندرية', 'العجمي',           31.1000, 29.7667),
  ('الإسكندرية', 'محرم بك',          31.1936, 29.9139),
  ('الإسكندرية', 'سيدي جابر',        31.2189, 29.9464),
  -- الغربية
  ('الغربية', 'طنطا',                30.7865, 31.0004),
  ('الغربية', 'المحلة الكبرى',       30.9706, 31.1669),
  ('الغربية', 'كفر الزيات',          30.8250, 30.8158),
  ('الغربية', 'زفتى',                30.7128, 31.2456),
  -- المنوفية
  ('المنوفية', 'شبين الكوم',         30.5525, 31.0094),
  ('المنوفية', 'منوف',               30.4658, 30.9314),
  ('المنوفية', 'أشمون',              30.2975, 31.0075),
  ('المنوفية', 'السادات',            30.3667, 30.5167),
  -- الإسماعيلية
  ('الإسماعيلية', 'الإسماعيلية',     30.5965, 32.2715),
  ('الإسماعيلية', 'فايد',            30.3167, 32.3000),
  ('الإسماعيلية', 'القنطرة',         30.8500, 32.3167),
  -- بورسعيد
  ('بورسعيد', 'بورسعيد',             31.2653, 32.3019),
  ('بورسعيد', 'بورفؤاد',             31.2500, 32.3333),
  -- دمياط
  ('دمياط', 'دمياط',                 31.4165, 31.8133),
  ('دمياط', 'رأس البر',              31.5167, 31.8333),
  ('دمياط', 'فارسكور',               31.3333, 31.7167),
  -- كفر الشيخ
  ('كفر الشيخ', 'كفر الشيخ',         31.1117, 30.9397),
  ('كفر الشيخ', 'دسوق',              31.1314, 30.6469),
  ('كفر الشيخ', 'بلطيم',             31.5586, 31.0872),
  -- البحيرة
  ('البحيرة', 'دمنهور',              31.0341, 30.4682),
  ('البحيرة', 'كفر الدوار',          31.1342, 30.1281),
  ('البحيرة', 'إدكو',                31.3086, 30.2939),
  ('البحيرة', 'رشيد',                31.4044, 30.4164),
  -- Capitals only: beyond realistic range, these resolve to "contact us".
  ('السويس', 'السويس',               29.9668, 32.5498),
  ('الفيوم', 'الفيوم',               29.3084, 30.8428),
  ('بني سويف', 'بني سويف',           29.0661, 31.0994),
  ('المنيا', 'المنيا',               28.1099, 30.7503),
  ('المنيا', 'ملوي',                 27.7307, 30.8418),
  ('أسيوط', 'أسيوط',                 27.1783, 31.1859),
  ('سوهاج', 'سوهاج',                 26.5569, 31.6947),
  ('قنا', 'قنا',                     26.1642, 32.7267),
  ('الأقصر', 'الأقصر',               25.6872, 32.6396),
  ('أسوان', 'أسوان',                 24.0889, 32.8998),
  ('البحر الأحمر', 'الغردقة',        27.2579, 33.8116),
  ('مطروح', 'مرسى مطروح',            31.3543, 27.2373),
  ('الوادي الجديد', 'الخارجة',       25.4514, 30.5464),
  ('شمال سيناء', 'العريش',           31.1249, 33.7999),
  ('جنوب سيناء', 'شرم الشيخ',        27.9158, 34.3300)
) as v(governorate, name_ar, lat, lng)
join public.governorates g on g.name_ar = v.governorate
on conflict (governorate_id, name_ar) do nothing;

-- Aliases drawn from the values customers actually typed.
insert into public.locality_aliases (locality_id, alias)
select l.id, v.alias
from (values
  ('ديرب نجم',          'Deyrab Negm'),
  ('ديرب نجم',          'Diyarb Negm'),
  ('ديرب نجم',          'ديرب ن'),
  ('الزقازيق',          'Zagazig'),
  ('المنصورة',          'Mansoura'),
  ('الإسماعيلية',       'Ismailia'),
  ('بورسعيد',           'Port Said'),
  ('الشروق',            'الشروق٢ حي النوادي'),
  ('الشروق',            'مدينة الشروق'),
  ('السادس من أكتوبر',  '6 أكتوبر'),
  ('السادس من أكتوبر',  '6 October'),
  ('العاشر من رمضان',   'العاشر'),
  ('التجمع الخامس',     'التجمع'),
  ('المحلة الكبرى',     'المحلة')
) as v(locality, alias)
join public.localities l on l.name_ar = v.locality
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Distance computation
-- ---------------------------------------------------------------------------

/*
 * Recomputes straight_km for every locality from the configured origin.
 *
 * Only needed when the origin moves — road_factor is applied at quote time, so
 * tuning it does not touch a single row.
 */
create or replace function public.recompute_locality_distances()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $$
declare
  v_lat double precision;
  v_lng double precision;
  v_count integer;
begin
  select (value #>> '{}')::double precision into v_lat
  from public.app_settings where key = 'delivery_origin_lat';

  select (value #>> '{}')::double precision into v_lng
  from public.app_settings where key = 'delivery_origin_lng';

  if v_lat is null or v_lng is null then
    raise exception 'لم يتم ضبط موقع المتجر';
  end if;

  update public.localities
  set straight_km = public.haversine_km(v_lat, v_lng, lat, lng)
  where lat is not null and lng is not null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.recompute_locality_distances() from public, anon;
grant execute on function public.recompute_locality_distances() to authenticated;

select public.recompute_locality_distances();

-- ---------------------------------------------------------------------------
-- Lookup used by the backfill and by any future free-text resolution
-- ---------------------------------------------------------------------------

create or replace function public.find_locality(
  p_governorate text,
  p_name text
)
returns integer
language sql
stable
set search_path to 'public', 'pg_catalog'
as $$
  select l.id
  from public.localities l
  join public.governorates g on g.id = l.governorate_id
  left join public.locality_aliases a on a.locality_id = l.id
  where public.normalize_place_name(g.name_ar) = public.normalize_place_name(p_governorate)
    and (
      public.normalize_place_name(l.name_ar) = public.normalize_place_name(p_name)
      or public.normalize_place_name(a.alias) = public.normalize_place_name(p_name)
    )
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- RLS — matching the governorates policies
-- ---------------------------------------------------------------------------

alter table public.localities enable row level security;
alter table public.locality_aliases enable row level security;

drop policy if exists "Localities are publicly readable" on public.localities;
create policy "Localities are publicly readable"
  on public.localities for select to anon, authenticated using (true);

drop policy if exists "Admins manage localities" on public.localities;
create policy "Admins manage localities"
  on public.localities for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Locality aliases are publicly readable" on public.locality_aliases;
create policy "Locality aliases are publicly readable"
  on public.locality_aliases for select to anon, authenticated using (true);

drop policy if exists "Admins manage locality aliases" on public.locality_aliases;
create policy "Admins manage locality aliases"
  on public.locality_aliases for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
