-- Admin write access for product images.
--
-- RLS is enabled on `product_images` but the only policy on it is
-- "Enable read access for all users" (SELECT). There is no INSERT, UPDATE or
-- DELETE policy, so the admin dashboard cannot attach, reorder or remove an
-- image at all — every write is rejected. The 93 rows that exist today were
-- created through the Supabase dashboard, which bypasses RLS, which is why the
-- gap went unnoticed.
--
-- The same is true of Storage: bucket `products` is public and has a single
-- SELECT policy on storage.objects (`enable read access 1ifhysk_0`), so uploads
-- fail too. Uploads have to go browser-direct rather than through a Server
-- Action (product photos routinely exceed the Server Action body limit), so a
-- service-role client cannot paper over the missing policy — it must exist.
--
-- Mirrors the admin policies already on `products`, but uses the existing
-- SECURITY DEFINER helper `public.is_admin()` rather than repeating the inline
-- `exists (select 1 from profiles ...)` subquery.
--
-- Forward-only: adds objects rather than recreating existing ones.

-- ---------------------------------------------------------------------------
-- 1. product_images write policies
-- ---------------------------------------------------------------------------

drop policy if exists "Admins can insert product images" on public.product_images;
create policy "Admins can insert product images"
  on public.product_images
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update product images" on public.product_images;
create policy "Admins can update product images"
  on public.product_images
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete product images" on public.product_images;
create policy "Admins can delete product images"
  on public.product_images
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Storage write policies, scoped to the `products` bucket
-- ---------------------------------------------------------------------------

drop policy if exists "Admins can upload product media" on storage.objects;
create policy "Admins can upload product media"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'products' and public.is_admin());

drop policy if exists "Admins can update product media" on storage.objects;
create policy "Admins can update product media"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'products' and public.is_admin())
  with check (bucket_id = 'products' and public.is_admin());

drop policy if exists "Admins can delete product media" on storage.objects;
create policy "Admins can delete product media"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'products' and public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Exactly one primary image per product
-- ---------------------------------------------------------------------------
--
-- The storefront resolves the hero image as `images.find(is_primary) ?? images[0]`
-- (product page metadata, gallery, cards). Today that invariant is unenforced and
-- the data has drifted both ways: 3 products carry two primaries, and 21 products
-- have images but no primary at all. In the second case the fallback lands on
-- whatever order PostgREST happened to return, so the hero image is not stable
-- across ISR rebuilds.
--
-- Both are repaired here before the index is created, otherwise the index build
-- fails on the duplicates.

-- Demote extra primaries, keeping the earliest by the same ordering the gallery
-- uses so the visible hero image does not change for those products.
with ranked as (
  select id,
         row_number() over (
           partition by product_id
           order by display_order, created_at, id
         ) as rn
  from public.product_images
  where is_primary
)
update public.product_images pi
   set is_primary = false
  from ranked r
 where pi.id = r.id
   and r.rn > 1;

-- Promote a primary for products that have images but none marked, so
-- `is_primary` is meaningful for every product and the hero becomes deterministic.
with first_image as (
  select distinct on (product_id) id
    from public.product_images
   where product_id not in (
           select product_id from public.product_images where is_primary
         )
   order by product_id, display_order, created_at, id
)
update public.product_images pi
   set is_primary = true
  from first_image f
 where pi.id = f.id;

drop index if exists public.product_images_one_primary_per_product;
create unique index product_images_one_primary_per_product
  on public.product_images (product_id)
  where is_primary;

comment on index public.product_images_one_primary_per_product is
  'At most one primary image per product. The storefront picks the hero as '
  'images.find(is_primary) ?? images[0]; without this the choice is ambiguous.';
