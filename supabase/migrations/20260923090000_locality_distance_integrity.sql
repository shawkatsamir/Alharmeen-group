-- Locality distances: owned by the database, validated at write time, and
-- changed only by an admin in a single transaction.
--
-- What went wrong under 20260823090000: the seeded origin (30.8167, 31.4333)
-- is ~7.6 km north of ديرب نجم, so every straight_km was measured from the
-- wrong point and then multiplied by the road factor — southern towns
-- over-charged, northern towns under-charged. Fixing the pin was impossible to
-- do safely: the admin had no way to edit a locality's coordinates, and saving
-- the origin was five separate UPDATEs followed by a recompute any
-- authenticated customer could also call.

-- ---------------------------------------------------------------------------
-- straight_km is derived, so a trigger owns it
--
-- Same discipline as log_status_change_trigger owning order_status_history:
-- application code cannot write a stale distance because it never writes one.
-- `UPDATE OF lat, lng` means recompute_locality_distances(), which only SETs
-- straight_km, does not re-fire this trigger.
-- ---------------------------------------------------------------------------

create or replace function public.localities_set_straight_km()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog'
as $$
declare
  v_lat double precision;
  v_lng double precision;
begin
  if new.lat is null or new.lng is null then
    new.straight_km := null;
    return new;
  end if;

  select (value #>> '{}')::double precision into v_lat
  from public.app_settings where key = 'delivery_origin_lat';

  select (value #>> '{}')::double precision into v_lng
  from public.app_settings where key = 'delivery_origin_lng';

  -- Fail loudly rather than store a distance measured from nowhere.
  if v_lat is null or v_lng is null then
    raise exception 'لم يتم ضبط موقع المتجر';
  end if;

  new.straight_km := public.haversine_km(v_lat, v_lng, new.lat, new.lng);
  return new;
end;
$$;

drop trigger if exists localities_set_straight_km on public.localities;
create trigger localities_set_straight_km
  before insert or update of lat, lng on public.localities
  for each row execute function public.localities_set_straight_km();

-- ---------------------------------------------------------------------------
-- Every locality must be priceable by distance
--
-- Without coordinates or an override, a quote fell back to the governorate
-- flat rate and skipped max_delivery_km entirely. All 97 rows have
-- coordinates, so this closes the path without touching data.
-- ---------------------------------------------------------------------------

alter table public.localities
  drop constraint if exists localities_has_distance;
alter table public.localities
  add constraint localities_has_distance
  check ((lat is not null and lng is not null) or distance_km_override is not null);

-- Swapped lat/lng is the classic silent error: both are valid numbers, the
-- haversine happily returns a distance, and nothing complains. Egypt's
-- bounding box catches it. Mirrored by isInEgypt() in shipping.ts.
alter table public.localities
  drop constraint if exists localities_coordinates_in_egypt;
alter table public.localities
  add constraint localities_coordinates_in_egypt
  check (
    (lat is null or lat between 22 and 32)
    and (lng is null or lng between 24.5 and 37)
  );

-- ---------------------------------------------------------------------------
-- recompute is no longer callable by customers
--
-- It is SECURITY DEFINER and was granted to `authenticated` with no admin
-- check. It only rewrites derived values, but any signed-in customer could
-- trigger a full-table UPDATE at will. Admins reach it through
-- update_delivery_settings below.
-- ---------------------------------------------------------------------------

revoke execute on function public.recompute_locality_distances() from authenticated;

-- ---------------------------------------------------------------------------
-- Origin and distance policy, saved atomically
--
-- Replaces five separate UPDATEs from the Server Action: those could leave the
-- origin half-moved (lat saved, lng not), and an UPDATE on a missing key
-- matched zero rows and reported success. Upsert, recompute, one transaction.
-- ---------------------------------------------------------------------------

create or replace function public.update_delivery_settings(
  p_origin_name text,
  p_origin_lat double precision,
  p_origin_lng double precision,
  p_road_factor numeric,
  p_max_delivery_km numeric
)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'غير مصرح' using errcode = '42501';
  end if;

  if p_origin_lat is null or p_origin_lat not between 22 and 32
     or p_origin_lng is null or p_origin_lng not between 24.5 and 37 then
    raise exception 'إحداثيات الموقع خارج مصر' using errcode = '22023';
  end if;

  if p_road_factor is null or p_road_factor < 1 then
    raise exception 'معامل الطريق يجب أن يكون 1 أو أكثر' using errcode = '22023';
  end if;

  if p_max_delivery_km is null or p_max_delivery_km <= 0 then
    raise exception 'أقصى مسافة يجب أن تكون أكبر من صفر' using errcode = '22023';
  end if;

  insert into public.app_settings (key, value, updated_by) values
    ('delivery_origin_name', to_jsonb(coalesce(p_origin_name, '')), auth.uid()),
    ('delivery_origin_lat',  to_jsonb(p_origin_lat),  auth.uid()),
    ('delivery_origin_lng',  to_jsonb(p_origin_lng),  auth.uid()),
    ('delivery_road_factor', to_jsonb(p_road_factor), auth.uid()),
    ('max_delivery_km',      to_jsonb(p_max_delivery_km), auth.uid())
  on conflict (key) do update
    set value = excluded.value,
        updated_by = excluded.updated_by,
        updated_at = now();

  v_count := public.recompute_locality_distances();
  return v_count;
end;
$$;

revoke all on function public.update_delivery_settings(text, double precision, double precision, numeric, numeric)
  from public, anon;
grant execute on function public.update_delivery_settings(text, double precision, double precision, numeric, numeric)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Free-shipping semantics (see qualifiesForFreeShipping in shipping.ts)
--
-- "Narrowest band decides" was non-monotonic: with {20 km: 5000} and
-- {50 km: 3000}, a 4000 order got free delivery at 40 km but paid at 10 km.
-- Any covering band now suffices. Identical for well-ordered rules.
-- ---------------------------------------------------------------------------

comment on table public.free_shipping_rules is
  'Distance-banded free delivery. An order qualifies when ANY rule whose '
  'max_distance_km covers the trip has min_order_total <= subtotal. Empty '
  'means free shipping is off.';
