-- Make every multi-table variant-group write atomic and reversible.
--
-- ---------------------------------------------------------------------------
-- What went wrong without these
--
-- 1. Group creation was two PostgREST calls with no transaction: insert the
--    group, then assign the product. When the assign failed the group stayed,
--    the error message said "try again", and every retry left another orphan.
--    The live catalogue accumulated four member-less groups, three sharing one
--    name. A compensating delete was added in application code; this replaces
--    it with the real thing.
--
-- 2. An axis key, once typed, was permanent. Changing it means rewriting
--    product_groups.axes AND re-keying every member's variant_values — two
--    tables — so nobody did. The live catalogue shows the cost: a group axed
--    on `موراندي جراي` (a colour VALUE typed into the axis field) and a
--    `الشاشة` group, both deleted and recreated rather than corrected.
--
-- 3. Fixing one member's value meant opening its whole product form, which is
--    how a mislabelled sibling went unnoticed: the Toshiba gas cooker whose
--    name says شاشة ديجيتال carries variant_values {"نوع الشاشة":"بدون شاشة"},
--    so the genuinely screenless product could not be added — six
--    products_group_variant_norm_uniq violations in two minutes.
--
-- Pattern copied from update_delivery_settings() and place_order(): SECURITY
-- DEFINER with an internal is_admin() check, EXECUTE to `authenticated` only,
-- never to `anon`.
--
-- NONE of these touch normalize_axis_value(), so NO REINDEX of
-- products_group_variant_norm_uniq is required. Re-keying a jsonb object
-- cannot create a collision that the index did not already forbid: two members
-- that differed under the old key still differ under the new one.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Which specifications key to write an axis value into
-- ---------------------------------------------------------------------------

/*
 * The axis key is not always the key the product already uses. The colour
 * groups declare `اللون` while 68 products record the colour under `الألوان`.
 * Writing blindly under the axis key would leave a product carrying BOTH
 * `الألوان: سيلفر` (stale) and `اللون: رمادي غامق` (new) — two colour rows in
 * one spec table, which is worse than the single wrong row it replaced.
 *
 * So: update the alias the product already has, and only fall back to the axis
 * key when it has none. `array_position` ordering prefers the axis key itself
 * when both are present.
 */
create or replace function public.axis_spec_write_key(p_axis text, p_specs jsonb)
returns text
language sql
stable
set search_path to 'public', 'pg_catalog'
as $$
  select coalesce(
    (
      select sk
      from unnest(public.axis_spec_keys(p_axis)) as sk
      where coalesce(p_specs ->> sk, '') <> ''
      order by array_position(public.axis_spec_keys(p_axis), sk)
      limit 1
    ),
    p_axis
  );
$$;

comment on function public.axis_spec_write_key(text, jsonb) is
  'The specifications key an axis value should be written to: the alias the '
  'product already uses, else the axis key. Prevents a second colour row '
  'appearing next to a stale one.';

-- ---------------------------------------------------------------------------
-- 2. create_variant_group
-- ---------------------------------------------------------------------------

create or replace function public.create_variant_group(
  p_product_id uuid,
  p_name       text,
  p_axis       text,
  p_value      text,
  p_write_spec boolean default true
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $$
declare
  v_axis     text := btrim(regexp_replace(coalesce(p_axis, ''),  '\s+', ' ', 'g'));
  v_value    text := btrim(regexp_replace(coalesce(p_value, ''), '\s+', ' ', 'g'));
  v_name     text := btrim(regexp_replace(coalesce(p_name, ''),  '\s+', ' ', 'g'));
  v_group_id uuid;
  v_existing uuid;
  v_specs    jsonb;
  v_spec_key text;
begin
  if not public.is_admin() then
    raise exception 'only admins may create a variant group'
      using errcode = '42501';
  end if;

  -- No fallback and no default. The first version of this flow hardcoded the
  -- colour axis and invented the literal "أساسي" when a product had no colour,
  -- which is how two silver microwaves that actually differ by a grill became
  -- a colour group. A fabricated value satisfies every constraint and every
  -- validator, so nothing ever surfaces it again.
  if v_axis = '' then
    raise exception 'axis is required' using errcode = '22023';
  end if;
  if v_value = '' then
    raise exception 'axis value is required' using errcode = '22023';
  end if;
  if v_name = '' then
    raise exception 'group name is required' using errcode = '22023';
  end if;

  select group_id, specifications into v_existing, v_specs
    from public.products where id = p_product_id for update;

  if not found then
    raise exception 'product % not found', p_product_id using errcode = 'P0002';
  end if;
  if v_existing is not null then
    raise exception 'product % already belongs to a group', p_product_id
      using errcode = '23505';
  end if;

  insert into public.product_groups (name_ar, axes)
       values (v_name, array[v_axis])
    returning id into v_group_id;

  v_spec_key := public.axis_spec_write_key(v_axis, v_specs);

  /*
   * The source becomes the primary: it is the product that already ranks and
   * already carries the content, so it should keep representing the group in
   * listings and structured data.
   */
  update public.products
     set group_id         = v_group_id,
         is_group_primary = true,
         variant_values   = jsonb_build_object(v_axis, v_value),
         specifications   = case
           when p_write_spec
             then coalesce(specifications, '{}'::jsonb)
                  || jsonb_build_object(v_spec_key, v_value)
           else specifications
         end
   where id = p_product_id;

  return v_group_id;
end;
$$;

comment on function public.create_variant_group(uuid, text, text, text, boolean) is
  'Create a group, assign the product as its primary, and record the axis '
  'value in both variant_values and specifications, in one transaction. '
  'Replaces two PostgREST calls that left orphan groups when the second '
  'failed. Admin-checked; EXECUTE granted to authenticated only.';

-- ---------------------------------------------------------------------------
-- 3. rename_variant_axis
-- ---------------------------------------------------------------------------

create or replace function public.rename_variant_axis(
  p_group_id uuid,
  p_old_key  text,
  p_new_key  text
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $$
declare
  v_new  text := btrim(regexp_replace(coalesce(p_new_key, ''), '\s+', ' ', 'g'));
  v_axes text[];
begin
  if not public.is_admin() then
    raise exception 'only admins may rename a variant axis'
      using errcode = '42501';
  end if;
  if v_new = '' then
    raise exception 'new axis key is required' using errcode = '22023';
  end if;

  select axes into v_axes
    from public.product_groups where id = p_group_id for update;

  if not found then
    raise exception 'group % not found', p_group_id using errcode = 'P0002';
  end if;
  if not (p_old_key = any (v_axes)) then
    raise exception 'group % does not vary by %', p_group_id, p_old_key
      using errcode = '22023';
  end if;
  if v_new <> p_old_key and v_new = any (v_axes) then
    raise exception 'group % already varies by %', p_group_id, v_new
      using errcode = '23505';
  end if;

  if v_new = p_old_key then
    return;
  end if;

  update public.product_groups
     set axes = array_replace(axes, p_old_key, v_new)
   where id = p_group_id;

  /*
   * Re-key both objects for every member. `specifications` moves with
   * `variant_values` because an axis key IS a spec key — leaving the spec row
   * under the old name would turn a rename into exactly the disagreement
   * `members_axis_spec_mismatch` reports.
   *
   * Members that carry no value under the old key are left alone rather than
   * gaining an empty one.
   */
  update public.products
     set variant_values = case
           when variant_values ? p_old_key
             then (variant_values - p_old_key)
                  || jsonb_build_object(v_new, variant_values ->> p_old_key)
           else variant_values
         end,
         specifications = case
           when specifications ? p_old_key
             then (specifications - p_old_key)
                  || jsonb_build_object(v_new, specifications ->> p_old_key)
           else specifications
         end
   where group_id = p_group_id
     and (variant_values ? p_old_key or specifications ? p_old_key);
end;
$$;

comment on function public.rename_variant_axis(uuid, text, text) is
  'Rename one of a group''s axes, rewriting product_groups.axes and re-keying '
  'every member''s variant_values and specifications in one transaction. The '
  'operation whose absence made a mistyped axis permanent. Needs no REINDEX: '
  're-keying cannot create a collision the unique index did not already '
  'forbid.';

-- ---------------------------------------------------------------------------
-- 4. set_variant_value
-- ---------------------------------------------------------------------------

create or replace function public.set_variant_value(
  p_product_id uuid,
  p_axis       text,
  p_value      text,
  p_write_spec boolean default true
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $$
declare
  v_axis     text := btrim(regexp_replace(coalesce(p_axis, ''),  '\s+', ' ', 'g'));
  v_value    text := btrim(regexp_replace(coalesce(p_value, ''), '\s+', ' ', 'g'));
  v_group_id uuid;
  v_specs    jsonb;
  v_spec_key text;
begin
  if not public.is_admin() then
    raise exception 'only admins may set a variant value'
      using errcode = '42501';
  end if;
  if v_axis = '' then
    raise exception 'axis is required' using errcode = '22023';
  end if;
  if v_value = '' then
    raise exception 'axis value is required' using errcode = '22023';
  end if;

  select group_id, specifications into v_group_id, v_specs
    from public.products where id = p_product_id for update;

  if not found then
    raise exception 'product % not found', p_product_id using errcode = 'P0002';
  end if;
  if v_group_id is null then
    raise exception 'product % belongs to no group', p_product_id
      using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.product_groups g
     where g.id = v_group_id and v_axis = any (g.axes)
  ) then
    raise exception 'group % does not vary by %', v_group_id, v_axis
      using errcode = '22023';
  end if;

  v_spec_key := public.axis_spec_write_key(v_axis, v_specs);

  /*
   * A duplicate combination raises 23505 from
   * products_group_variant_norm_uniq, which is the correct answer and rolls
   * the whole call back — including the specifications write. Checking it here
   * as well would be a race, and the index is the authority.
   */
  update public.products
     set variant_values = coalesce(variant_values, '{}'::jsonb)
                          || jsonb_build_object(v_axis, v_value),
         specifications = case
           when p_write_spec
             then coalesce(specifications, '{}'::jsonb)
                  || jsonb_build_object(v_spec_key, v_value)
           else specifications
         end
   where id = p_product_id;
end;
$$;

comment on function public.set_variant_value(uuid, text, text, boolean) is
  'Set one member''s value for one of its group''s axes, writing '
  'variant_values and the matching specifications row together so the spec '
  'table and the switcher cannot disagree. Lets a mislabelled sibling be '
  'fixed from the group panel instead of its whole product form.';

-- ---------------------------------------------------------------------------
-- 5. Grants
-- ---------------------------------------------------------------------------

/*
 * `authenticated` only, and every function re-checks is_admin() internally.
 *
 * Never `anon`: these are SECURITY DEFINER and bypass RLS by construction.
 * The precedent is place_order(), which is granted to service_role ALONE
 * precisely because a browser that could call it would be able to submit its
 * own totals.
 */
revoke all on function public.create_variant_group(uuid, text, text, text, boolean) from public;
revoke all on function public.rename_variant_axis(uuid, text, text) from public;
revoke all on function public.set_variant_value(uuid, text, text, boolean) from public;

grant execute on function public.create_variant_group(uuid, text, text, text, boolean) to authenticated;
grant execute on function public.rename_variant_axis(uuid, text, text) to authenticated;
grant execute on function public.set_variant_value(uuid, text, text, boolean) to authenticated;
