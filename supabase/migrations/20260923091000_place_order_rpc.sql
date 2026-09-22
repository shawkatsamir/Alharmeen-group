-- Atomic order creation.
--
-- createOrder used to INSERT the order, then INSERT its items as a second
-- request. When the second failed, the order stayed behind with nothing in
-- it: 8 such orders exist in production. There is no transaction across two
-- PostgREST calls, so the only fix is one call that does both.
--
-- Pricing deliberately stays in TypeScript (features/checkout/lib/shipping.ts
-- is the single implementation, shared with the browser preview). This
-- function STORES what the Server Action computed; it does not price. That is
-- only safe because nobody but the server can call it: EXECUTE is granted to
-- service_role alone, so a browser holding the publishable key cannot hand it
-- a 1 EGP total.
--
-- Guests are refused (p_order.user_id must be set). Guest checkout has been
-- impossible since 2026-02-14 — `orders` has no anon INSERT policy and
-- /order-success has no anon read path — and restoring it is a separate
-- piece of work. Refusing here keeps this function from quietly becoming the
-- thing that re-enables it half-way.
--
-- Side effect worth knowing: log_status_change_trigger records
-- changed_by = auth.uid(), which is NULL under the service role, so the first
-- history row of a new order has no changed_by. orders.user_id still records
-- who placed it.

create or replace function public.place_order(p_order jsonb, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $$
declare
  v_order_id uuid;
begin
  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'لا يمكن إنشاء طلب بدون منتجات' using errcode = '22023';
  end if;

  if nullif(p_order->>'user_id', '') is null then
    raise exception 'يجب تسجيل الدخول لإتمام الطلب' using errcode = '42501';
  end if;

  -- A new order starts at the head of the state machine; anything else is a
  -- caller bug, not a business decision to honour.
  if p_order->>'status' is distinct from 'قيد الانتظار' then
    raise exception 'حالة الطلب الابتدائية غير صحيحة' using errcode = '22023';
  end if;

  -- Explicit columns, not jsonb_populate_record(null::orders, ...): that would
  -- send NULL for id, order_number, tracking_token and created_at instead of
  -- letting their defaults fire. payment_status / amount_paid are omitted —
  -- sync_order_payment_totals_trigger derives them.
  insert into public.orders (
    user_id,
    customer_name,
    customer_email,
    customer_phone,
    shipping_governorate,
    shipping_city,
    shipping_locality_id,
    shipping_distance_km,
    delivery_tier,
    shipping_address_line,
    customer_notes,
    subtotal,
    shipping_cost,
    discount_amount,
    total,
    status,
    payment_method
  ) values (
    (p_order->>'user_id')::uuid,
    p_order->>'customer_name',
    p_order->>'customer_email',
    p_order->>'customer_phone',
    p_order->>'shipping_governorate',
    p_order->>'shipping_city',
    (p_order->>'shipping_locality_id')::integer,
    (p_order->>'shipping_distance_km')::numeric,
    p_order->>'delivery_tier',
    p_order->>'shipping_address_line',
    p_order->>'customer_notes',
    (p_order->>'subtotal')::numeric,
    (p_order->>'shipping_cost')::numeric,
    coalesce((p_order->>'discount_amount')::numeric, 0),
    (p_order->>'total')::numeric,
    p_order->>'status',
    p_order->>'payment_method'
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id,
    product_id,
    product_name,
    product_image,
    brand_name,
    quantity,
    unit_price,
    total_price
  )
  select
    v_order_id,
    (item->>'product_id')::uuid,
    item->>'product_name',
    item->>'product_image',
    item->>'brand_name',
    (item->>'quantity')::integer,
    (item->>'unit_price')::numeric,
    (item->>'total_price')::numeric
  from jsonb_array_elements(p_items) as item;

  return v_order_id;
end;
$$;

revoke all on function public.place_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb) to service_role;
