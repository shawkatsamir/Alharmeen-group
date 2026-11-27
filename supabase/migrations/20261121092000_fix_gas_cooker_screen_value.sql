-- Un-invert the Toshiba gas cooker's variant value.
--
-- ---------------------------------------------------------------------------
-- What happened
--
-- RLA2-90MG5GE(MG)-EG is named
--   "بوتاجاز توشيبا 90 سم - أمان كامل - شاشة ديجيتال - مزود بمروحة للتبريد"
-- and it HAS the digital screen. Its group (axes = {'نوع الشاشة'}) recorded it
-- as `{"نوع الشاشة":"بدون شاشة"}` — the OTHER product's value.
--
-- Confirmed with the owner. The consequence was six consecutive
-- products_group_variant_norm_uniq violations between 22:34 and 22:36 on
-- 2026-11-20: the screenless sibling genuinely IS "بدون شاشة", that value was
-- already claimed by this row, and nothing on screen said which product held
-- it. The value is freed here.
--
-- How it got written: the create-group panel asked for «قيمة هذا المنتج» in a
-- box two inputs from the axis name, named no product, and offered a
-- suggestion list seeded from six hardcoded colour/size spec keys — none of
-- which was نوع الشاشة. The admin, thinking about the pair, typed the other
-- one's value. The panel now picks the axis from the product's own
-- specifications and READS the value from that spec row, so a value typed for
-- the wrong product is no longer expressible.
--
-- Done as a migration rather than through set_variant_value() because that
-- function checks is_admin(), and a migration runs with no auth.uid().
-- ---------------------------------------------------------------------------

-- `بشاشة ديجيتال` mirrors the vocabulary the Midea pair already uses for the
-- same shape of distinction (`بشواية` / `بدون شواية`).
update public.products
   set variant_values = jsonb_build_object('نوع الشاشة', 'بشاشة ديجيتال'),
       -- The axis key IS a spec key, and this product had no نوع الشاشة row at
       -- all — which is why the spec table never mentioned the one fact that
       -- distinguishes the variants, and why product_group_health now counts
       -- `members_axis_spec_missing`.
       specifications = coalesce(specifications, '{}'::jsonb)
                        || jsonb_build_object('نوع الشاشة', 'بشاشة ديجيتال')
 where sku = 'RLA2-90MG5GE(MG)-EG'
   and variant_values ->> 'نوع الشاشة' = 'بدون شاشة';

do $$
declare
  fixed int;
begin
  select count(*) into fixed
  from public.products
  where sku = 'RLA2-90MG5GE(MG)-EG'
    and variant_values ->> 'نوع الشاشة' = 'بشاشة ديجيتال'
    and specifications ->> 'نوع الشاشة' = 'بشاشة ديجيتال';

  if fixed <> 1 then
    raise exception
      'expected RLA2-90MG5GE(MG)-EG to carry بشاشة ديجيتال on both the axis and the spec row, found % matching row(s)', fixed;
  end if;
end $$;
