begin;

create or replace function public.unpublish_product(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;
  if p_product_id is null then
    raise exception 'Choose a product to move to drafts' using errcode = '22023';
  end if;

  perform 1
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;

  update public.products
  set status = 'draft'
  where id = p_product_id
    and status = 'published';

  if not found then
    raise exception 'Only published products can be moved to drafts' using errcode = '22023';
  end if;
end;
$function$;

revoke all on function public.unpublish_product(uuid) from public, anon;
grant execute on function public.unpublish_product(uuid) to authenticated;

commit;
