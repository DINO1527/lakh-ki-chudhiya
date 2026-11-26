-- Give each promotion a private, reviewable banner image.
begin;

create table public.offer_media (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  storage_path text not null unique check (length(trim(storage_path)) > 0),
  alt_text text not null check (length(trim(alt_text)) between 1 and 250),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index offer_media_one_active_banner_idx
  on public.offer_media (offer_id)
  where status <> 'archived';
create index offer_media_public_offer_idx
  on public.offer_media (offer_id, status)
  where status = 'published';

create trigger offer_media_set_updated_at
  before update on public.offer_media
  for each row execute function public.set_updated_at();
create trigger offer_media_audit_changes
  after insert or update on public.offer_media
  for each row execute function public.audit_admin_change('id', 'offer_media');

alter table public.offer_media enable row level security;
revoke all on public.offer_media from public, anon, authenticated;
grant select (id, offer_id, storage_path, alt_text, status, sort_order, created_at)
  on public.offer_media to anon, authenticated;
grant insert (offer_id, storage_path, alt_text, sort_order)
  on public.offer_media to authenticated;
grant update (alt_text, sort_order, status)
  on public.offer_media to authenticated;

create policy "published banners for active public offers are readable"
  on public.offer_media for select to anon, authenticated
  using (
    status = 'published'
    and exists (
      select 1 from public.offers offer
      where offer.id = offer_id
    )
  );

create policy "staff can read all offer banners"
  on public.offer_media for select to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])));

create policy "staff can manage offer banners"
  on public.offer_media for all to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])))
  with check ((select public.has_admin_role(array['owner', 'staff'])));

grant select (
  id, name, target_type, target_product_id, target_collection_id,
  minimum_sets, discount_basis_points, starts_at, ends_at, is_enabled,
  created_at, updated_at
) on public.offers to anon;

create policy "active offers for published catalogue targets are public"
  on public.offers for select to anon, authenticated
  using (
    is_enabled
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
    and (
      (target_type = 'product' and exists (
        select 1 from public.products product
        where product.id = target_product_id and product.status = 'published'
      ))
      or
      (target_type = 'collection' and exists (
        select 1 from public.collections collection
        where collection.id = target_collection_id and collection.status = 'published'
      ))
    )
  );

create or replace function private.require_published_offer_banner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.is_enabled and not exists (
    select 1 from public.offer_media media
    where media.offer_id = new.id and media.status = 'published'
  ) then
    raise exception 'Publish an offer banner before enabling the offer'
      using errcode = '23514';
  end if;
  return new;
end;
$function$;
revoke all on function private.require_published_offer_banner() from public, anon, authenticated;
create trigger offers_require_published_banner
  before insert or update of is_enabled on public.offers
  for each row execute function private.require_published_offer_banner();

create or replace function private.keep_banner_for_enabled_offer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if old.status = 'published' and new.status <> 'published'
    and exists (
      select 1 from public.offers offer
      where offer.id = old.offer_id and offer.is_enabled
    )
    and not exists (
      select 1 from public.offer_media other_media
      where other_media.offer_id = old.offer_id
        and other_media.id <> old.id
        and other_media.status = 'published'
    ) then
    raise exception 'Disable the offer before archiving its only published banner'
      using errcode = '23514';
  end if;
  return new;
end;
$function$;
revoke all on function private.keep_banner_for_enabled_offer() from public, anon, authenticated;
create trigger offer_media_keep_enabled_banner
  before update of status on public.offer_media
  for each row execute function private.keep_banner_for_enabled_offer();

drop policy "published catalogue media can be signed" on storage.objects;
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
      or exists (
        select 1 from public.offer_media media
        where media.storage_path = storage.objects.name
          and media.status = 'published'
      )
    )
  );

alter table public.admin_audit_logs drop constraint admin_audit_logs_resource_type_check;
alter table public.admin_audit_logs add constraint admin_audit_logs_resource_type_check
  check (resource_type in (
    'product', 'product_variant', 'collection', 'product_media', 'collection_media',
    'site_content', 'staff_member', 'store_settings', 'offer', 'offer_media', 'order'
  ));

commit;
