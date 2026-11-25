-- Require checkout to confirm the complete visible quote, not only its subtotal.

create or replace function public.quote_cart(p_items jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  item_count integer;
  matched_count integer;
  quote_items jsonb;
  quote_hash text;
  subtotal bigint;
  all_available boolean;
begin
  if coalesce(jsonb_typeof(p_items), '') <> 'array' then
    raise exception 'Cart must be a JSON array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'Cart must contain between 1 and 20 variants' using errcode = '22023';
  end if;

  select count(*) into item_count
  from jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer);

  if item_count <> jsonb_array_length(p_items)
    or exists (
      select 1
      from jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer)
      where requested.variant_id is null or requested.quantity is null
        or requested.quantity not between 1 and 99
    )
    or (select count(distinct requested.variant_id)
        from jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer)) <> item_count then
    raise exception 'Cart contains invalid or duplicate variants' using errcode = '22023';
  end if;

  select
    count(*),
    coalesce(sum(variant.price_minor::bigint * requested.quantity::bigint), 0),
    coalesce(bool_and(variant.stock_on_hand - variant.reserved_quantity >= requested.quantity), false),
    coalesce(jsonb_agg(jsonb_build_object(
      'variant_id', variant.id,
      'product_title', product.title,
      'variant_label', concat_ws(' · ', nullif(variant.size_code, ''), variant.colour_name),
      'unit_price_minor', variant.price_minor,
      'quantity', requested.quantity,
      'line_total_minor', variant.price_minor::bigint * requested.quantity::bigint,
      'quantity_available', variant.stock_on_hand - variant.reserved_quantity >= requested.quantity
    ) order by variant.id), '[]'::jsonb)
  into matched_count, subtotal, all_available, quote_items
  from jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer)
  join public.product_variants as variant on variant.id = requested.variant_id
  join public.products as product on product.id = variant.product_id
  where variant.is_active and product.status = 'published';

  if matched_count <> item_count then
    raise exception 'One or more cart variants are unavailable' using errcode = 'P0002';
  end if;

  select md5(jsonb_agg(jsonb_build_object(
    'variant_id', variant.id,
    'product_title', product.title,
    'variant_label', concat_ws(' · ', nullif(variant.size_code, ''), variant.colour_name),
    'unit_price_minor', variant.price_minor,
    'quantity', requested.quantity
  ) order by variant.id)::text)
  into quote_hash
  from jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer)
  join public.product_variants as variant on variant.id = requested.variant_id
  join public.products as product on product.id = variant.product_id
  where variant.is_active and product.status = 'published';

  return jsonb_build_object(
    'items', quote_items,
    'subtotal_minor', subtotal,
    'all_available', all_available,
    'quote_hash', quote_hash
  );
end;
$function$;

create or replace function public.create_order_with_quote(
  p_items jsonb,
  p_idempotency_key uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_delivery_address text,
  p_delivery_city text,
  p_delivery_postal_code text,
  p_delivery_note text,
  p_confirmed_subtotal_minor bigint,
  p_confirmed_quote_hash text,
  p_guest_access_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  quote jsonb;
begin
  if p_idempotency_key is null then
    raise exception 'Checkout key is required' using errcode = '22023';
  end if;

  -- Serialize retries so a completed idempotent order is replayed even after catalogue edits.
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 0));
  if exists (
    select 1 from public.orders as order_row
    where order_row.idempotency_key = p_idempotency_key
  ) then
    return public.create_order(
      p_items, p_idempotency_key, p_customer_name, p_customer_email,
      p_customer_phone, p_delivery_address, p_delivery_city,
      p_delivery_postal_code, p_delivery_note, p_confirmed_subtotal_minor,
      p_guest_access_hash
    );
  end if;

  -- Lock requested variants before computing the quote, then call the existing order
  -- transaction while these locks remain held. Price edits and stock changes cannot race.
  perform variant.id
  from public.product_variants as variant
  join public.products as product on product.id = variant.product_id
  join jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer)
    on requested.variant_id = variant.id
  where variant.is_active and product.status = 'published'
  order by variant.id
  for update of variant;

  quote := public.quote_cart(p_items);
  if (quote ->> 'subtotal_minor')::bigint is distinct from p_confirmed_subtotal_minor
    or (quote ->> 'quote_hash') is distinct from p_confirmed_quote_hash then
    raise exception 'The visible order quote changed; review it before submitting' using errcode = 'P0001';
  end if;

  return public.create_order(
    p_items, p_idempotency_key, p_customer_name, p_customer_email,
    p_customer_phone, p_delivery_address, p_delivery_city,
    p_delivery_postal_code, p_delivery_note, p_confirmed_subtotal_minor,
    p_guest_access_hash
  );
end;
$function$;

revoke all on function public.create_order(jsonb, uuid, text, text, text, text, text, text, text, bigint, text)
  from public, anon, authenticated;
revoke all on function public.create_order_with_quote(jsonb, uuid, text, text, text, text, text, text, text, bigint, text, text)
  from public;
grant execute on function public.create_order_with_quote(jsonb, uuid, text, text, text, text, text, text, text, bigint, text, text)
  to anon, authenticated;
