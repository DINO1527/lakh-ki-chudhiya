begin;

drop policy if exists "published catalogue media can be signed" on storage.objects;

create policy "published catalogue media can be signed"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'product-media'
    and storage.allow_any_operation(array[
      'storage.object.sign',
      'storage.object.sign_many'
    ])
    and (
      exists (
        select 1
        from public.product_media media
        join public.products product on product.id = media.product_id
        where media.storage_path = storage.objects.name
          and media.media_type = 'image'
          and media.status = 'published'
          and product.status = 'published'
      )
      or exists (
        select 1
        from public.collection_media media
        join public.collections collection on collection.id = media.collection_id
        where media.storage_path = storage.objects.name
          and media.status = 'published'
          and collection.status = 'published'
      )
      or exists (
        select 1
        from public.offer_media media
        where media.storage_path = storage.objects.name
          and media.status = 'published'
      )
    )
  );

commit;
