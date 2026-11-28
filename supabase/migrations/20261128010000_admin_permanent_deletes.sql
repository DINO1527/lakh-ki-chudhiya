-- Permanently remove retired catalogue media and guarded admin records.
begin;

alter table public.admin_audit_logs
  drop constraint admin_audit_logs_action_check;
alter table public.admin_audit_logs
  add constraint admin_audit_logs_action_check
  check (action in ('insert', 'update', 'delete'));

create or replace function public.audit_admin_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  resource_id text;
begin
  resource_id := to_jsonb(old) ->> tg_argv[0];
  insert into public.admin_audit_logs (
    actor_user_id, resource_type, record_id, action, changed_fields
  ) values (
    (select auth.uid()), tg_argv[1], resource_id, 'delete', array['deleted']
  );
  return old;
end;
$function$;
revoke all on function public.audit_admin_delete() from public, anon, authenticated;

create trigger collections_audit_deletes
  after delete on public.collections
  for each row execute function public.audit_admin_delete('id', 'collection');
create trigger offers_audit_deletes
  after delete on public.offers
  for each row execute function public.audit_admin_delete('id', 'offer');
create trigger product_media_audit_deletes
  after delete on public.product_media
  for each row execute function public.audit_admin_delete('id', 'product_media');
create trigger collection_media_audit_deletes
  after delete on public.collection_media
  for each row execute function public.audit_admin_delete('id', 'collection_media');
create trigger offer_media_audit_deletes
  after delete on public.offer_media
  for each row execute function public.audit_admin_delete('id', 'offer_media');

create or replace function public.delete_product_media(
  p_product_id uuid,
  p_media_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  product_status text;
  media_path text;
  media_status text;
  media_type text;
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;
  if p_product_id is null or p_media_id is null then
    raise exception 'Choose a product image to delete' using errcode = '22023';
  end if;

  select product.status into product_status
  from public.products as product
  where product.id = p_product_id
  for update;
  if not found then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;

  select media.storage_path, media.status, media.media_type
    into media_path, media_status, media_type
  from public.product_media as media
  where media.id = p_media_id and media.product_id = p_product_id
  for update;
  if not found then
    raise exception 'Product image not found' using errcode = 'P0002';
  end if;
  if media_type <> 'image' then
    raise exception 'Only product images can be deleted here' using errcode = '22023';
  end if;

  if product_status = 'published'
    and media_status = 'published'
    and not exists (
      select 1 from public.product_media as other_media
      where other_media.product_id = p_product_id
        and other_media.id <> p_media_id
        and other_media.media_type = 'image'
        and other_media.status = 'published'
    ) then
    raise exception 'A published product must keep at least one image' using errcode = '23514';
  end if;

  delete from public.product_media where id = p_media_id and product_id = p_product_id;
  return media_path;
end;
$function$;

create or replace function public.delete_collection_media(
  p_collection_id uuid,
  p_media_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  collection_status text;
  media_path text;
  media_status text;
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;
  if p_collection_id is null or p_media_id is null then
    raise exception 'Choose a collection image to delete' using errcode = '22023';
  end if;

  select collection.status into collection_status
  from public.collections as collection
  where collection.id = p_collection_id
  for update;
  if not found then
    raise exception 'Collection not found' using errcode = 'P0002';
  end if;

  select media.storage_path, media.status into media_path, media_status
  from public.collection_media as media
  where media.id = p_media_id and media.collection_id = p_collection_id
  for update;
  if not found then
    raise exception 'Collection image not found' using errcode = 'P0002';
  end if;

  if collection_status = 'published'
    and media_status = 'published'
    and not exists (
      select 1 from public.collection_media as other_media
      where other_media.collection_id = p_collection_id
        and other_media.id <> p_media_id
        and other_media.status = 'published'
    ) then
    raise exception 'A published collection must keep at least one image' using errcode = '23514';
  end if;

  delete from public.collection_media
  where id = p_media_id and collection_id = p_collection_id;
  return media_path;
end;
$function$;

create or replace function public.delete_offer_media(
  p_offer_id uuid,
  p_media_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  offer_enabled boolean;
  media_path text;
  media_status text;
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;
  if p_offer_id is null or p_media_id is null then
    raise exception 'Choose an offer banner to delete' using errcode = '22023';
  end if;

  select offer.is_enabled into offer_enabled
  from public.offers as offer
  where offer.id = p_offer_id
  for update;
  if not found then
    raise exception 'Offer not found' using errcode = 'P0002';
  end if;

  select media.storage_path, media.status into media_path, media_status
  from public.offer_media as media
  where media.id = p_media_id and media.offer_id = p_offer_id
  for update;
  if not found then
    raise exception 'Offer banner not found' using errcode = 'P0002';
  end if;

  if offer_enabled and media_status = 'published'
    and not exists (
      select 1 from public.offer_media as other_media
      where other_media.offer_id = p_offer_id
        and other_media.id <> p_media_id
        and other_media.status = 'published'
    ) then
    raise exception 'Disable the offer before deleting its only published banner'
      using errcode = '23514';
  end if;

  delete from public.offer_media where id = p_media_id and offer_id = p_offer_id;
  return media_path;
end;
$function$;

create or replace function public.replace_offer_banner(
  p_offer_id uuid,
  p_storage_path text,
  p_alt_text text
)
returns text[]
language plpgsql
security definer
set search_path = ''
as $function$
declare
  offer_enabled boolean;
  old_paths text[];
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;
  if p_offer_id is null
    or p_storage_path is null
    or p_storage_path !~ (
      '^offers/' || p_offer_id::text ||
      '/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|avif)$'
    )
    or p_alt_text is null
    or btrim(p_alt_text) = ''
    or length(p_alt_text) > 250 then
    raise exception 'Invalid offer banner details' using errcode = '22023';
  end if;

  select offer.is_enabled into offer_enabled
  from public.offers as offer
  where offer.id = p_offer_id
  for update;
  if not found then
    raise exception 'Offer not found' using errcode = 'P0002';
  end if;
  if offer_enabled then
    raise exception 'Disable the offer before replacing its banner' using errcode = '23514';
  end if;

  select coalesce(array_agg(media.storage_path order by media.created_at, media.id), '{}'::text[])
    into old_paths
  from public.offer_media as media
  where media.offer_id = p_offer_id;

  delete from public.offer_media
  where offer_id = p_offer_id;
  insert into public.offer_media (offer_id, storage_path, alt_text, status)
  values (p_offer_id, p_storage_path, btrim(p_alt_text), 'draft');

  return old_paths;
end;
$function$;

create or replace function public.delete_offer(p_offer_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $function$
declare
  storage_paths text[];
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;
  if p_offer_id is null then
    raise exception 'Choose an offer to delete' using errcode = '22023';
  end if;

  perform 1 from public.offers as offer where offer.id = p_offer_id for update;
  if not found then
    raise exception 'Offer not found' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(media.storage_path order by media.created_at, media.id), '{}'::text[])
    into storage_paths
  from public.offer_media as media
  where media.offer_id = p_offer_id;

  update public.offers set is_enabled = false where id = p_offer_id and is_enabled;
  delete from public.offer_media where offer_id = p_offer_id;
  delete from public.offers where id = p_offer_id;
  return storage_paths;
end;
$function$;

create or replace function public.delete_collection(p_collection_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $function$
declare
  storage_paths text[];
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;
  if p_collection_id is null then
    raise exception 'Choose a collection to delete' using errcode = '22023';
  end if;

  perform 1 from public.collections as collection where collection.id = p_collection_id for update;
  if not found then
    raise exception 'Collection not found' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.offers as offer where offer.target_collection_id = p_collection_id
  ) then
    raise exception 'Retarget or delete offers using this collection first' using errcode = '23503';
  end if;

  select coalesce(array_agg(media.storage_path order by media.sort_order, media.id), '{}'::text[])
    into storage_paths
  from public.collection_media as media
  where media.collection_id = p_collection_id;

  delete from public.collection_media where collection_id = p_collection_id;
  delete from public.product_collections where collection_id = p_collection_id;
  delete from public.collections where id = p_collection_id;
  return storage_paths;
end;
$function$;

revoke all on function public.delete_product_media(uuid, uuid) from public, anon, authenticated;
revoke all on function public.delete_collection_media(uuid, uuid) from public, anon, authenticated;
revoke all on function public.delete_offer_media(uuid, uuid) from public, anon, authenticated;
revoke all on function public.replace_offer_banner(uuid, text, text) from public, anon, authenticated;
revoke all on function public.delete_offer(uuid) from public, anon, authenticated;
revoke all on function public.delete_collection(uuid) from public, anon, authenticated;
grant execute on function public.delete_product_media(uuid, uuid) to authenticated;
grant execute on function public.delete_collection_media(uuid, uuid) to authenticated;
grant execute on function public.delete_offer_media(uuid, uuid) to authenticated;
grant execute on function public.replace_offer_banner(uuid, text, text) to authenticated;
grant execute on function public.delete_offer(uuid) to authenticated;
grant execute on function public.delete_collection(uuid) to authenticated;

commit;
