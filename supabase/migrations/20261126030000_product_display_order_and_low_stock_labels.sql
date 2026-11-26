-- Keep catalogue positions contiguous and expose only the small stock signal shown on cards.
begin;

create or replace function public.move_product_display_order(
  p_product_id uuid,
  p_sort_order integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  ordered_ids uuid[];
  current_position integer;
  product_count integer;
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;
  if p_product_id is null or p_sort_order is null or p_sort_order < 0 then
    raise exception 'Choose a valid product position' using errcode = '22023';
  end if;

  lock table public.products in share row exclusive mode;
  select array_agg(product.id order by product.sort_order, product.title, product.id)
    into ordered_ids
  from public.products product;
  product_count := coalesce(cardinality(ordered_ids), 0);
  current_position := array_position(ordered_ids, p_product_id) - 1;

  if current_position is null then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;
  if p_sort_order >= product_count then
    raise exception 'Choose a position from 0 to %', product_count - 1 using errcode = '22023';
  end if;

  with ranked as (
    select product.id,
      row_number() over (order by product.sort_order, product.title, product.id) - 1 as position
    from public.products product
  )
  update public.products as product
  set sort_order = case
    when ranked.id = p_product_id then p_sort_order
    when ranked.position between least(current_position, p_sort_order)
      and greatest(current_position, p_sort_order)
      then ranked.position + case when p_sort_order < current_position then 1 else -1 end
    else ranked.position
  end
  from ranked
  where product.id = ranked.id;
end;
$function$;

revoke all on function public.move_product_display_order(uuid, integer) from public, anon, authenticated;
grant execute on function public.move_product_display_order(uuid, integer) to authenticated;

-- The public storefront receives exact counts only for available variants with one or two sets.
create or replace function public.get_public_low_stock_variants(p_product_ids uuid[])
returns table (
  product_id uuid,
  variant_id uuid,
  size_code text,
  available_quantity integer
)
language sql
stable
security definer
set search_path = ''
as $function$
  select product.id, variant.id, variant.size_code,
    variant.stock_on_hand - variant.reserved_quantity
  from public.products product
  join public.product_variants variant on variant.product_id = product.id
  where coalesce(cardinality(p_product_ids), 0) between 1 and 50
    and product.id = any(p_product_ids)
    and product.status = 'published'
    and product.slug not like 'uat-%'
    and variant.is_available
    and variant.stock_on_hand - variant.reserved_quantity between 1 and 2
  order by product.id, variant.size_code nulls first, variant.id
  limit 250
$function$;

revoke all on function public.get_public_low_stock_variants(uuid[]) from public, anon, authenticated;
grant execute on function public.get_public_low_stock_variants(uuid[]) to anon, authenticated;

commit;
