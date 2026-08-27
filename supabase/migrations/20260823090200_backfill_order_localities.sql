-- Snapshot delivery facts onto orders, and resolve the existing free-text
-- cities to localities.
--
-- `shipping_cost` already snapshots what was charged. These add *why*: which
-- locality, how far, and which vehicle class. Without them a dispute months
-- later cannot be reconstructed, and the shop cannot compare what it charged
-- against what the trip actually cost.

alter table public.orders
  add column if not exists shipping_locality_id integer
    references public.localities(id) on delete set null,
  add column if not exists shipping_distance_km numeric,
  add column if not exists delivery_tier text references public.delivery_tiers(key);

create index if not exists orders_shipping_locality_idx
  on public.orders (shipping_locality_id);

comment on column public.orders.shipping_locality_id is
  'Resolved delivery locality. NULL for orders placed before localities '
  'existed whose free-text city could not be matched.';
comment on column public.orders.shipping_distance_km is
  'Road distance used to price this order, snapshotted at checkout.';
comment on column public.orders.delivery_tier is
  'Vehicle class the order was priced at — the largest tier in the cart.';

-- ---------------------------------------------------------------------------
-- Fix the one mis-filed governorate before resolving
--
-- One order records ديرب نجم under القاهرة. Diyarb Negm is in الشرقية; the
-- governorate is simply wrong and the row would otherwise never resolve. Same
-- precedent as the spelling normalisation in 20260821100000, which also
-- rewrote historical governorate values. No financial impact: shipping_cost is
-- already snapshotted and is not recomputed here.
-- ---------------------------------------------------------------------------

update public.orders
set shipping_governorate = 'الشرقية'
where shipping_governorate = 'القاهرة'
  and public.normalize_place_name(shipping_city)
      = public.normalize_place_name('ديرب نجم');

-- ---------------------------------------------------------------------------
-- Resolve localities
--
-- `Alex` names a governorate rather than a locality, and قرية البرجاية is a
-- village outside the seeded set. Both are left NULL deliberately: guessing
-- would mis-attribute a real order, and a null only costs analytics precision
-- since the charged amount is already stored.
-- ---------------------------------------------------------------------------

update public.orders o
set shipping_locality_id = public.find_locality(o.shipping_governorate, o.shipping_city)
where o.shipping_locality_id is null;

-- Distance follows from the locality, using the same
-- coalesce(override, straight_km * road_factor) the quote engine applies.
update public.orders o
set shipping_distance_km = round(
      coalesce(
        l.distance_km_override,
        l.straight_km * (
          select (value #>> '{}')::numeric
          from public.app_settings where key = 'delivery_road_factor'
        )
      ), 1)
from public.localities l
where l.id = o.shipping_locality_id
  and o.shipping_distance_km is null;

-- ---------------------------------------------------------------------------
-- Backfill the tier from what was actually in each order
--
-- Largest tier present, never the sum: the items shared one vehicle.
-- ---------------------------------------------------------------------------

update public.orders o
set delivery_tier = sub.tier
from (
  select oi.order_id,
         case
           when bool_or(
             coalesce(p.delivery_tier, c.delivery_tier, parent.delivery_tier, 'small') = 'large'
           ) then 'large'
           else 'small'
         end as tier
  from public.order_items oi
  join public.products p on p.id = oi.product_id
  join public.categories c on c.id = p.category_id
  left join public.categories parent on parent.id = c.parent_id
  group by oi.order_id
) sub
where sub.order_id = o.id
  and o.delivery_tier is null;
