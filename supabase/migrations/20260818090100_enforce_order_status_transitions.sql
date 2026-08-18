-- ============================================================================
-- Forward-only order status state machine, enforced in the database.
--
-- MIRRORS src/features/orders/constants/order-status.ts (TRANSITIONS).
-- Change both in the same commit.
--
--   قيد الانتظار  → تم التأكيد | ملغي
--   تم التأكيد    → جاري التجهيز | ملغي
--   جاري التجهيز  → تم الشحن | ملغي
--   تم الشحن      → تم التوصيل
--   تم التوصيل    → مرتجع
--   ملغي, مرتجع   → terminal
--
-- Customers may cancel anywhere before تم الشحن; after shipping the
-- correction path is مرتجع. There is deliberately NO admin override: this
-- applies to the service-role client too, so a compromised or buggy admin
-- path cannot rewrite history either.
--
-- DEPLOY ORDER: apply AFTER the app deploy.
--   The previously-deployed admin dropdown offered all six statuses with no
--   guard. Applying this first would surface raw Postgres errors in the admin
--   UI. It cannot corrupt data either way — illegal writes simply abort.
--
-- BEHAVIOUR CHANGE ON LIVE DATA:
--   - The 2 orders at 'تم الشحن' can no longer be cancelled (only → تم التوصيل).
--   - The 19 at 'قيد الانتظار' now reach 'جاري التجهيز' via 'تم التأكيد'.
--   No existing rows are rewritten.
-- ============================================================================

begin;

create or replace function public.enforce_order_status_transition()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog'
as $$
declare
  allowed text[];
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  allowed := case old.status
    when 'قيد الانتظار'  then array['تم التأكيد', 'ملغي']
    when 'تم التأكيد'    then array['جاري التجهيز', 'ملغي']
    when 'جاري التجهيز'  then array['تم الشحن', 'ملغي']
    when 'تم الشحن'      then array['تم التوصيل']
    when 'تم التوصيل'    then array['مرتجع']
    when 'ملغي'          then array[]::text[]
    when 'مرتجع'         then array[]::text[]
    -- Legacy/unknown value (e.g. the old English 'pending'): refuse rather
    -- than guess. Such a row must be corrected deliberately.
    else null
  end;

  if allowed is null then
    raise exception
      'حالة الطلب الحالية غير معروفة: «%»', old.status
      using errcode = 'check_violation';
  end if;

  if not (new.status = any (allowed)) then
    if cardinality(allowed) = 0 then
      raise exception
        '«%» حالة نهائية ولا يمكن تغييرها', old.status
        using errcode = 'check_violation';
    else
      raise exception
        'لا يمكن تغيير حالة الطلب من «%» إلى «%». المسموح: %',
        old.status, new.status, array_to_string(allowed, '، ')
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_order_status_transition_trigger on public.orders;
create trigger enforce_order_status_transition_trigger
  before update of status on public.orders
  for each row execute function public.enforce_order_status_transition();

-- The column default was 'pending', which the orders_status_check constraint
-- itself rejects — every insert was forced to set status explicitly or fail.
alter table public.orders
  alter column status set default 'قيد الانتظار';

commit;
