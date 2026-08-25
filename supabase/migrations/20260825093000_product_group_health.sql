-- A read-only health report for variant groups, backing /admin/products/groups.
--
-- The constraints added alongside this cover STORAGE integrity — one primary per
-- group, no duplicate combinations, no grouped row without values. They cannot
-- cover the things that make a group merely *wrong*: a member with no photo, a
-- member missing one of the axes its group declares, a group left with a single
-- member after its sibling was archived.
--
-- Enforcing those at write time would need `product_groups.axes` inside a
-- per-row trigger on `products`, which is a lot of machinery for a two-admin
-- shop and would fight the backfill. Reporting them is the proportionate
-- answer: the admin sees what needs attention and decides.

create or replace view public.product_group_health as
select
  g.id,
  g.name_ar,
  g.axes,
  count(p.id)                                          as member_count,
  count(p.id) filter (where p.is_active)               as active_count,
  count(p.id) filter (where p.is_group_primary)        as primary_count,
  count(p.id) filter (
    where not exists (select 1 from public.product_images i where i.product_id = p.id)
  )                                                    as members_without_images,
  /*
   * A member is "incomplete" when it carries no value for one of the axes its
   * group declares — it renders as an option with a blank label, or drops out
   * of that axis row entirely.
   */
  count(p.id) filter (
    where exists (
      select 1 from unnest(g.axes) as axis
      where coalesce(p.variant_values ->> axis, '') = ''
    )
  )                                                    as members_missing_axis,
  /*
   * The reverse: a value for an axis the group does not declare. Usually the
   * residue of a group that was re-axed, and invisible everywhere in the UI.
   */
  count(p.id) filter (
    where exists (
      select 1 from jsonb_object_keys(coalesce(p.variant_values, '{}'::jsonb)) as k
      where not (k = any (g.axes))
    )
  )                                                    as members_with_extra_axis
from public.product_groups g
left join public.products p on p.group_id = g.id
group by g.id, g.name_ar, g.axes;

comment on view public.product_group_health is
  'Per-group warnings for the admin groups page: singletons, members with no '
  'image, members missing a declared axis, members carrying an undeclared axis, '
  'and groups without exactly one primary.';

/*
 * Run as the invoker, so the view sees exactly what the caller is allowed to
 * see. This matters more than it looks:
 *
 * `products` restricts anonymous reads to `is_active = true`, so an anonymous
 * caller counts only published members — verified: the 396 لتر group, whose two
 * members are both archived, reports `member_count = 0` to anon and 2 to an
 * admin. The admin dashboard is the only intended consumer and reads through a
 * cookie-bound client, which is what makes the archived-member warnings correct
 * there.
 *
 * Without `security_invoker` the view would run as its owner and leak archived
 * rows to the storefront.
 */
alter view public.product_group_health set (security_invoker = on);
