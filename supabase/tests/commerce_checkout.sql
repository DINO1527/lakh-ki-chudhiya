-- Hosted UAT assertions only. The transaction rolls back every test fixture change.
begin;

do $test$
declare
  test_product_id uuid;
  test_variant_id uuid;
  test_price integer;
  quote jsonb;
  expected_discount bigint;
  duplicate_size_rejected boolean := false;
begin
  if exists (
    select 1 from public.product_variants
    group by product_id, size_code having count(*) > 1
  ) or exists (
    select 1 from public.product_variants where colour_name is not null
  ) then
    raise exception 'Legacy catalogue colour rows were not split into named products with size-only variants';
  end if;

  select product.id, variant.id, variant.price_minor
    into test_product_id, test_variant_id, test_price
  from public.products product
  join public.product_variants variant on variant.product_id = product.id
  where product.slug = 'uat-sample-bangle-not-for-sale'
    and variant.sku = 'UAT-SAMPLE-S'
    and variant.is_active;
  if not found then raise exception 'Synthetic UAT product size is missing'; end if;

  update public.products
  set delivery_fee_minor = 1490, cod_enabled = true
  where id = test_product_id;
  update public.store_settings
  set cod_enabled = true, whatsapp_number = '94771234567'
  where singleton;
  insert into public.offers (
    name, target_type, target_product_id, minimum_sets,
    discount_basis_points, is_enabled
  ) values (
    'UAT test: 3 sets save 10%', 'product', test_product_id, 3, 1000, true
  );

  quote := public.quote_cart(jsonb_build_array(jsonb_build_object(
    'variant_id', test_variant_id, 'quantity', 3
  )));
  expected_discount := (test_price::bigint * 3 * 1000) / 10000;
  if (quote ->> 'subtotal_minor')::bigint <> test_price::bigint * 3
    or (quote ->> 'discount_minor')::bigint <> expected_discount
    or (quote ->> 'delivery_fee_minor')::bigint <> 1490
    or (quote ->> 'total_minor')::bigint <> test_price::bigint * 3 - expected_discount + 1490
    or quote ->> 'offer_name' <> 'UAT test: 3 sets save 10%'
    or (quote ->> 'cod_available')::boolean is not true
    or (quote ->> 'online_payment_available')::boolean is not false
    or (quote ->> 'all_available')::boolean is not true
    or quote #>> '{items,0,variant_label}' <> 'UAT-S'
    or (quote #>> '{items,0,set_count}')::integer <> 5 then
    raise exception 'Server quote did not apply the set threshold, percentage, single delivery fee, COD or size-only label correctly';
  end if;

  update public.offers
  set ends_at = now() - interval '1 minute'
  where name = 'UAT test: 3 sets save 10%';
  quote := public.quote_cart(jsonb_build_array(jsonb_build_object(
    'variant_id', test_variant_id, 'quantity', 3
  )));
  if (quote ->> 'discount_minor')::bigint <> 0 or quote ->> 'offer_name' is not null then
    raise exception 'An expired seasonal offer remained active';
  end if;

  begin
    insert into public.product_variants (
      product_id, sku, size_code, price_minor, is_active
    ) values (
      test_product_id, 'UAT-DUPLICATE-SIZE-CHECK', 'UAT-S', test_price, true
    );
  exception when unique_violation then
    duplicate_size_rejected := true;
  end;
  if not duplicate_size_rejected then
    raise exception 'A second sellable SKU for the same product size was accepted';
  end if;
end;
$test$;

rollback;
