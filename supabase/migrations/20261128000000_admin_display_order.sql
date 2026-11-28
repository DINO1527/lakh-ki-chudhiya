-- Keep admin display ordering as a small, atomic move instead of free-form numbers.
begin;

create or replace function public.create_collection_draft(
  p_name text,
  p_slug text,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  next_sort_order bigint;
  created_id uuid;
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;
  if p_name is null or btrim(p_name) = '' or length(p_name) > 120
    or p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_slug) > 100
    or p_description is null or length(p_description) > 2000 then
    raise exception 'Invalid collection details' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('admin-collection-order'), 0);
  select coalesce(max(collection.sort_order)::bigint + 1, 0)
    into next_sort_order
  from public.collections as collection;
  if next_sort_order > 2147483647 then
    raise exception 'Collection ordering needs to be renumbered' using errcode = '22003';
  end if;

  insert into public.collections (name, slug, description, sort_order, status)
  values (btrim(p_name), p_slug, p_description, next_sort_order::integer, 'draft')
  returning id into created_id;
  return created_id;
end;
$function$;

create or replace function public.add_collection_media(
  p_collection_id uuid,
  p_storage_path text,
  p_alt_text text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  ordered_ids uuid[];
  next_sort_order integer;
  created_id uuid;
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;
  if p_collection_id is null
    or p_storage_path is null
    or p_storage_path !~ (
      '^collections/' || p_collection_id::text ||
      '/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|avif)$'
    )
    or p_alt_text is null
    or btrim(p_alt_text) = ''
    or length(p_alt_text) > 250 then
    raise exception 'Invalid collection image details' using errcode = '22023';
  end if;

  perform 1
  from public.collections as collection
  where collection.id = p_collection_id
  for update;
  if not found then
    raise exception 'Collection not found' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('admin-collection-media-order'),
    hashtext(p_collection_id::text)
  );
  select array_agg(media.id order by media.sort_order, media.id)
    into ordered_ids
  from public.collection_media as media
  where media.collection_id = p_collection_id
    and media.status <> 'archived';
  if coalesce(array_length(ordered_ids, 1), 0) >= 20 then
    raise exception 'A collection can have at most 20 active images'
      using errcode = '23514', constraint = 'collection_media_active_limit';
  end if;

  update public.collection_media as media
  set sort_order = (positioned.ordinality - 1)::integer
  from unnest(ordered_ids) with ordinality as positioned(id, ordinality)
  where media.id = positioned.id
    and media.collection_id = p_collection_id
    and media.status <> 'archived'
    and media.sort_order is distinct from (positioned.ordinality - 1)::integer;

  next_sort_order := coalesce(array_length(ordered_ids, 1), 0);
  insert into public.collection_media (collection_id, storage_path, alt_text, sort_order)
  values (p_collection_id, p_storage_path, btrim(p_alt_text), next_sort_order)
  returning id into created_id;
  return created_id;
end;
$function$;

create or replace function public.move_collection_order(
  p_collection_id uuid,
  p_direction text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  ordered_ids uuid[];
  current_index integer;
  neighbor_index integer;
  neighbor_id uuid;
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;
  if p_direction is null or p_direction not in ('up', 'down') then
    raise exception 'Choose up or down' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('admin-collection-order'), 0);
  select array_agg(collection.id order by collection.sort_order, collection.name, collection.id)
    into ordered_ids
  from public.collections as collection;

  current_index := array_position(ordered_ids, p_collection_id);
  if current_index is null then
    raise exception 'Collection not found' using errcode = 'P0002';
  end if;

  neighbor_index := current_index + case when p_direction = 'up' then -1 else 1 end;
  if neighbor_index < 1 or neighbor_index > coalesce(array_length(ordered_ids, 1), 0) then
    return false;
  end if;

  neighbor_id := ordered_ids[neighbor_index];
  ordered_ids[neighbor_index] := ordered_ids[current_index];
  ordered_ids[current_index] := neighbor_id;

  update public.collections as collection
  set sort_order = (positioned.ordinality - 1)::integer
  from unnest(ordered_ids) with ordinality as positioned(id, ordinality)
  where collection.id = positioned.id
    and collection.sort_order is distinct from (positioned.ordinality - 1)::integer;

  return true;
end;
$function$;

create or replace function public.move_collection_media_order(
  p_collection_id uuid,
  p_media_id uuid,
  p_direction text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  ordered_ids uuid[];
  current_index integer;
  neighbor_index integer;
  neighbor_id uuid;
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;
  if p_direction is null or p_direction not in ('up', 'down') then
    raise exception 'Choose up or down' using errcode = '22023';
  end if;

  perform 1
  from public.collections as collection
  where collection.id = p_collection_id
  for update;
  if not found then
    raise exception 'Collection not found' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('admin-collection-media-order'),
    hashtext(p_collection_id::text)
  );
  select array_agg(media.id order by media.sort_order, media.id)
    into ordered_ids
  from public.collection_media as media
  where media.collection_id = p_collection_id
    and media.status <> 'archived';

  current_index := array_position(ordered_ids, p_media_id);
  if current_index is null then
    raise exception 'Active collection image not found' using errcode = 'P0002';
  end if;

  neighbor_index := current_index + case when p_direction = 'up' then -1 else 1 end;
  if neighbor_index < 1 or neighbor_index > coalesce(array_length(ordered_ids, 1), 0) then
    return false;
  end if;

  neighbor_id := ordered_ids[neighbor_index];
  ordered_ids[neighbor_index] := ordered_ids[current_index];
  ordered_ids[current_index] := neighbor_id;

  update public.collection_media as media
  set sort_order = (positioned.ordinality - 1)::integer
  from unnest(ordered_ids) with ordinality as positioned(id, ordinality)
  where media.id = positioned.id
    and media.collection_id = p_collection_id
    and media.status <> 'archived'
    and media.sort_order is distinct from (positioned.ordinality - 1)::integer;

  return true;
end;
$function$;

revoke all on function public.create_collection_draft(text, text, text) from public, anon, authenticated;
revoke all on function public.add_collection_media(uuid, text, text) from public, anon, authenticated;
revoke all on function public.move_collection_order(uuid, text) from public, anon, authenticated;
revoke all on function public.move_collection_media_order(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.create_collection_draft(text, text, text) to authenticated;
grant execute on function public.add_collection_media(uuid, text, text) to authenticated;
grant execute on function public.move_collection_order(uuid, text) to authenticated;
grant execute on function public.move_collection_media_order(uuid, uuid, text) to authenticated;

commit;
