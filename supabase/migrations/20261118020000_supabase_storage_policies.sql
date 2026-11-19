-- Supabase Storage access for product media.
-- The product-media bucket is private and declared in supabase/config.toml.
-- Public users may request short-lived signed URLs only for published media
-- belonging to published products. Object listing and draft access stay closed.

create policy "published product media can be signed"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'product-media'
    and storage.allow_only_operation('storage.object.sign')
    and exists (
      select 1
      from public.product_media media
      join public.products product on product.id = media.product_id
      where media.storage_path = storage.objects.name
        and media.status = 'published'
        and product.status = 'published'
    )
  );

-- Privileged roles must be assigned through trusted Supabase Auth app_metadata.
-- The browser cannot edit app_metadata; user_metadata is deliberately ignored.
create policy "admins can manage product media objects"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'product-media'
    and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    bucket_id = 'product-media'
    and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
