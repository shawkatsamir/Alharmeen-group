-- Order traffic per governorate, for pricing delivery from real demand.
--
-- The client's stated reason for making shipping dynamic was to see "where most
-- of orders come from" and set rates accordingly. PostgREST cannot GROUP BY, so
-- the alternative was pulling every order row into the admin page and counting
-- in JavaScript — fine at 38 orders, wasteful later.
--
-- SECURITY DEFINER with an explicit `is_admin()` gate: the function aggregates
-- across all orders regardless of who placed them, which no customer may see.

create or replace function public.governorate_order_stats()
returns table (
  governorate text,
  order_count bigint,
  revenue numeric
)
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $$
begin
  if not public.is_admin() then
    raise exception 'هذا الإجراء متاح للمسؤولين فقط'
      using errcode = 'insufficient_privilege';
  end if;

  return query
    select o.shipping_governorate,
           count(*)::bigint,
           coalesce(sum(o.total), 0)::numeric
    from public.orders o
    -- Cancelled orders say nothing about where the shop actually delivers.
    where o.status <> 'ملغي'
    group by o.shipping_governorate;
end;
$$;

revoke all on function public.governorate_order_stats() from public, anon;
grant execute on function public.governorate_order_stats() to authenticated;

comment on function public.governorate_order_stats() is
  'Admin-only order counts and revenue grouped by governorate, for setting '
  'delivery rates from real traffic.';
