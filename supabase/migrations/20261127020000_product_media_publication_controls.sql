begin;

-- Product images can be prepared independently while their parent product is a draft.
-- Public signed URLs still require the parent product to be published (Storage RLS).
create or replace function public.publish_product_media(p_media_id uuid, p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  product_status text;
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
  if product_status = 'archived' then
    raise exception 'Archived product images cannot be published' using errcode = '22023';
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

create or replace function public.unpublish_product_media(p_media_id uuid, p_product_id uuid)
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
  where media.id = p_media_id
    and media.product_id = p_product_id
    and media.media_type = 'image'
  for update;
  if not found then
    raise exception 'Product image not found' using errcode = 'P0002';
  end if;
  if media_status <> 'published' then
    raise exception 'Only a published image can be moved to drafts' using errcode = '22023';
  end if;
  if product_status = 'published'
    and not exists (
      select 1
      from public.product_media media
      where media.product_id = p_product_id
        and media.id <> p_media_id
        and media.media_type = 'image'
        and media.status = 'published'
    ) then
    raise exception 'A published product must keep at least one published image' using errcode = '23514';
  end if;

  update public.product_media
  set status = 'draft'
  where id = p_media_id
    and product_id = p_product_id;
end;
$function$;

revoke all on function public.publish_product_media(uuid, uuid) from public, anon;
revoke all on function public.unpublish_product_media(uuid, uuid) from public, anon;
grant execute on function public.publish_product_media(uuid, uuid) to authenticated;
grant execute on function public.unpublish_product_media(uuid, uuid) to authenticated;

commit;
