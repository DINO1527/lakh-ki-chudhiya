-- Catalogue model: one product per named colour, size-only sellable SKUs,
-- and private media galleries for both products and collections.

-- Keep the old column only for historical SQL compatibility. Colour is not a
-- SKU dimension; shoppers identify it from the product name and gallery.
alter table public.product_variants
  alter column colour_name drop not null;

drop index if exists public.product_variants_available_size_colour_idx;
drop index if exists public.product_variants_available_colour_idx;
alter table public.product_variants
  drop constraint product_variants_product_id_size_code_colour_name_key;



do $migration$
begin
  if exists (
    select 1 from public.product_variants
    group by product_id, size_code having count(*) > 1
  ) then
    raise exception 'A product has more than one SKU for a size after the catalogue backfill.'
      using errcode = '23505';
  end if;
  if exists (
    select 1 from public.product_variants
    group by product_id having count(distinct colour_name) > 1
  ) then
    raise exception 'A product still contains more than one colour after the catalogue backfill.'
      using errcode = '23505';
  end if;
  if exists (select 1 from public.products where status = 'published' and set_count < 2) then
    raise exception 'A published product has fewer than two bangles per set after the catalogue backfill.'
      using errcode = '23514';
  end if;
end;
$migration$;

alter table public.product_variants
  add constraint product_variants_product_id_size_code_key
  unique nulls not distinct (product_id, size_code);
create index product_variants_available_size_idx
  on public.product_variants (size_code, product_id)
  where is_available;

do $migration$
begin
  if exists (select 1 from public.products where status = 'published' and set_count < 2) then
    raise exception 'A published product has fewer than two bangles per set. Correct its set count before applying the size-only catalogue migration.'
      using errcode = '23514';
  end if;
end;
$migration$;

revoke select (colour_name) on public.product_variants from anon, authenticated;
revoke insert (colour_name) on public.product_variants from authenticated;
revoke update (colour_name) on public.product_variants from authenticated;

grant select (id, product_id, sku, size_code, inner_diameter_mm, price_minor,
  compare_at_price_minor, is_available)
  on public.product_variants to anon;
grant select (id, product_id, sku, size_code, inner_diameter_mm, price_minor,
  compare_at_price_minor, stock_on_hand, reserved_quantity, is_active,
  is_available, created_at, updated_at)
  on public.product_variants to authenticated;
grant insert (product_id, sku, size_code, inner_diameter_mm, price_minor,
  compare_at_price_minor, is_active)
  on public.product_variants to authenticated;
grant update (sku, size_code, inner_diameter_mm, price_minor,
  compare_at_price_minor, is_active)
  on public.product_variants to authenticated;

update public.product_variants set colour_name = null;

create table public.collection_media (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  storage_path text not null unique check (length(trim(storage_path)) > 0),
  alt_text text not null check (length(trim(alt_text)) between 1 and 250),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index collection_media_published_order_idx
  on public.collection_media (collection_id, sort_order, id)
  where status = 'published';

alter table public.collection_media enable row level security;
revoke all on public.collection_media from public, anon, authenticated;

grant select (id, collection_id, storage_path, alt_text, status, sort_order)
  on public.collection_media to anon, authenticated;
grant insert (collection_id, storage_path, alt_text, sort_order)
  on public.collection_media to authenticated;
grant update (alt_text, sort_order)
  on public.collection_media to authenticated;

create policy "published collection media is readable"
  on public.collection_media for select to anon, authenticated
  using (
    status = 'published'
    and exists (
      select 1 from public.collections collection
      where collection.id = collection_id
        and collection.status = 'published'
    )
  );

create policy "staff can read all collection media metadata"
  on public.collection_media for select to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])));

create policy "staff can manage collection media metadata"
  on public.collection_media for all to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])))
  with check ((select public.has_admin_role(array['owner', 'staff'])));

alter table public.admin_audit_logs
  drop constraint admin_audit_logs_resource_type_check;
alter table public.admin_audit_logs
  add constraint admin_audit_logs_resource_type_check
  check (resource_type in (
    'product', 'product_variant', 'collection', 'product_media',
    'collection_media', 'site_content', 'staff_member'
  ));

create trigger collection_media_audit_changes
  after insert or update on public.collection_media
  for each row execute function public.audit_admin_change('id', 'collection_media');

create or replace function public.publish_collection(p_collection_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;

  perform 1 from public.collections where id = p_collection_id for update;
  if not found then
    raise exception 'Collection not found' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.collection_media media
    where media.collection_id = p_collection_id
      and media.status in ('draft', 'published')
  ) then
    raise exception 'A collection needs an active image before publishing' using errcode = '22023';
  end if;

  update public.collection_media
  set status = 'published'
  where collection_id = p_collection_id and status = 'draft';
  update public.collections set status = 'published' where id = p_collection_id;
end;
$function$;

create or replace function public.archive_collection_media(
  p_media_id uuid,
  p_collection_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  collection_status text;
  media_status text;
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;

  select collection.status into collection_status
  from public.collections collection
  where collection.id = p_collection_id
  for update;
  if not found then
    raise exception 'Collection not found' using errcode = 'P0002';
  end if;

  select media.status into media_status
  from public.collection_media media
  where media.id = p_media_id and media.collection_id = p_collection_id
  for update;
  if not found then
    raise exception 'Collection image not found' using errcode = 'P0002';
  end if;

  if collection_status = 'published'
    and media_status = 'published'
    and not exists (
      select 1 from public.collection_media media
      where media.collection_id = p_collection_id
        and media.id <> p_media_id
        and media.status = 'published'
    ) then
    raise exception 'A published collection must keep at least one image' using errcode = '23514';
  end if;

  update public.collection_media
  set status = 'archived'
  where id = p_media_id and collection_id = p_collection_id;
end;
$function$;

revoke all on function public.publish_collection(uuid) from public, anon;
revoke all on function public.archive_collection_media(uuid, uuid) from public, anon;
grant execute on function public.publish_collection(uuid) to authenticated;
grant execute on function public.archive_collection_media(uuid, uuid) to authenticated;

drop policy "staff can manage collections" on public.collections;
create policy "staff can manage collections"
  on public.collections for all to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])))
  with check (
    (select public.has_admin_role(array['owner', 'staff']))
    and (
      status <> 'published'
      or exists (
        select 1 from public.collection_media media
        where media.collection_id = public.collections.id and media.status = 'published'
      )
    )
  );

drop policy "staff can manage products" on public.products;
create policy "staff can manage products"
  on public.products for all to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])))
  with check (
    (select public.has_admin_role(array['owner', 'staff']))
    and (
      status <> 'published'
      or (
        length(trim(title)) > 0
        and length(trim(care_instructions)) > 0
        and exists (
          select 1 from public.product_variants variant
          where variant.product_id = public.products.id and variant.is_active
        )
        and exists (
          select 1 from public.product_media media
          where media.product_id = public.products.id
            and media.media_type = 'image'
            and media.status = 'published'
        )
      )
    )
  );

create or replace function public.archive_product_media(p_media_id uuid, p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  product_status text;
  media_status text;
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;

  select product.status into product_status
  from public.products product
  where product.id = p_product_id
  for update;
  if not found then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;

  select media.status into media_status
  from public.product_media media
  where media.id = p_media_id and media.product_id = p_product_id
  for update;
  if not found then
    raise exception 'Product image not found' using errcode = 'P0002';
  end if;

  if product_status = 'published'
    and media_status = 'published'
    and not exists (
      select 1 from public.product_media media
      where media.product_id = p_product_id
        and media.id <> p_media_id
        and media.media_type = 'image'
        and media.status = 'published'
    ) then
    raise exception 'A published product must keep at least one image' using errcode = '23514';
  end if;

  update public.product_media
  set status = 'archived'
  where id = p_media_id and product_id = p_product_id;
end;
$function$;

create or replace function public.publish_product_media(p_media_id uuid, p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;

  perform 1 from public.products
  where id = p_product_id and status = 'published'
  for update;
  if not found then
    raise exception 'Publish the product before publishing an additional image' using errcode = '22023';
  end if;

  update public.product_media
  set status = 'published'
  where id = p_media_id
    and product_id = p_product_id
    and media_type = 'image'
    and status = 'draft';
  if not found then
    raise exception 'Draft product image not found' using errcode = 'P0002';
  end if;
end;
$function$;

revoke all on function public.publish_product_media(uuid, uuid) from public, anon;
grant execute on function public.publish_product_media(uuid, uuid) to authenticated;

drop policy "published product media can be signed" on storage.objects;
create policy "published catalogue media can be signed"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'product-media'
    and storage.allow_only_operation('storage.object.sign')
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
    )
  );
