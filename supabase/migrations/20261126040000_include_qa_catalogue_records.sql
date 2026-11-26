-- UAT catalogue fixtures use normal published/stock rules and remain visible for QA.
begin;

create or replace function public.get_active_storefront_offers(p_limit integer default 8)
returns table (
  id uuid, name text, target_type text, target_name text, target_slug text,
  minimum_sets smallint, discount_basis_points integer, ends_at timestamptz
)
language sql stable security definer set search_path = ''
as $function$
  select offer.id, offer.name, offer.target_type, product.title, product.slug,
    offer.minimum_sets, offer.discount_basis_points, offer.ends_at
  from public.offers offer
  join public.products product
    on offer.target_type = 'product' and product.id = offer.target_product_id
  where offer.is_enabled
    and (offer.starts_at is null or offer.starts_at <= now())
    and (offer.ends_at is null or offer.ends_at > now())
    and product.status = 'published'
  union all
  select offer.id, offer.name, offer.target_type, collection.name, collection.slug,
    offer.minimum_sets, offer.discount_basis_points, offer.ends_at
  from public.offers offer
  join public.collections collection
    on offer.target_type = 'collection' and collection.id = offer.target_collection_id
  where offer.is_enabled
    and (offer.starts_at is null or offer.starts_at <= now())
    and (offer.ends_at is null or offer.ends_at > now())
    and collection.status = 'published'
  order by ends_at asc nulls last, discount_basis_points desc, name asc, id asc
  limit least(greatest(coalesce(p_limit, 8), 1), 12);
$function$;

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
    and variant.is_available
    and variant.stock_on_hand - variant.reserved_quantity between 1 and 2
  order by product.id, variant.size_code nulls first, variant.id
  limit 250
$function$;

revoke all on function public.get_active_storefront_offers(integer) from public;
grant execute on function public.get_active_storefront_offers(integer) to anon, authenticated;
revoke all on function public.get_public_low_stock_variants(uuid[]) from public, anon, authenticated;
grant execute on function public.get_public_low_stock_variants(uuid[]) to anon, authenticated;

commit;
