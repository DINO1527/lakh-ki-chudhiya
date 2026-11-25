-- Hosted UAT assertions. Keep the transaction rollback-only and use synthetic rows only.
begin;

do $test$
declare
  test_variant_id uuid;
  other_variant_id uuid;
  test_price integer;
  other_price integer;
  test_stock integer;
  test_reserved integer;
  quote_subtotal bigint;
  quote jsonb;
  previous_quote_hash text;
  created_order jsonb;
  replayed_order jsonb;
  changed_replay_rejected boolean := false;
  changed_quote_rejected boolean := false;
  paid_cancellation_blocked boolean := false;
  checkout_key uuid := gen_random_uuid();
  quote_change_key uuid := gen_random_uuid();
begin
  if has_table_privilege('anon', 'public.orders', 'select')
    or has_table_privilege('anon', 'public.orders', 'insert')
    or has_table_privilege('authenticated', 'public.orders', 'insert') then
    raise exception 'Order table grants are broader than intended';
  end if;
  if not has_function_privilege('anon',
    'public.quote_cart(jsonb)', 'execute')
    or not has_function_privilege('anon',
    'public.create_order_with_quote(jsonb,uuid,text,text,text,text,text,text,text,bigint,text,text,text)', 'execute')
    or has_function_privilege('anon',
    'public.create_order(jsonb,uuid,text,text,text,text,text,text,text,bigint,text)', 'execute') then
    raise exception 'Guest quote and order RPCs are not executable';
  end if;

  select variant.id, variant.price_minor, variant.stock_on_hand, variant.reserved_quantity
    into test_variant_id, test_price, test_stock, test_reserved
  from public.product_variants as variant
  join public.products as product on product.id = variant.product_id
  where product.slug = 'uat-sample-bangle-not-for-sale'
    and product.status = 'published'
    and variant.sku = 'UAT-SAMPLE-S'
    and variant.is_active
  for update of variant;
  if not found then
    raise exception 'Expected synthetic UAT test variant is missing';
  end if;

  quote := public.quote_cart(jsonb_build_array(jsonb_build_object(
    'variant_id', test_variant_id,
    'quantity', 1
  )));
  if (quote ->> 'subtotal_minor')::bigint <> test_price
    or (quote ->> 'all_available')::boolean is not true
    or not coalesce((quote ->> 'quote_hash') ~ '^[0-9a-f]{32}$', false) then
    raise exception 'Cart quote did not use current price or availability';
  end if;

  created_order := public.create_order_with_quote(
    jsonb_build_array(jsonb_build_object('variant_id', test_variant_id, 'quantity', 1)),
    checkout_key,
    'UAT SQL Test Customer',
    'uat.customer@example.test',
    '+94000000000',
    '1 Synthetic Test Lane',
    'Colombo',
    '00000',
    'Rollback-only SQL test',
    test_price,
    quote ->> 'quote_hash',
    repeat('a', 64)
  );
  if created_order ->> 'status' <> 'pending_confirmation'
    or created_order ->> 'payment_status' <> 'unpaid'
    or (created_order ->> 'total_minor')::bigint <> test_price then
    raise exception 'Order was not saved pending and unpaid with its complete delivery quote';
  end if;

  replayed_order := public.create_order_with_quote(
    jsonb_build_array(jsonb_build_object('variant_id', test_variant_id, 'quantity', 1)),
    checkout_key,
    'UAT SQL Test Customer',
    'uat.customer@example.test',
    '+94000000000',
    '1 Synthetic Test Lane',
    'Colombo',
    '00000',
    'Rollback-only SQL test',
    test_price,
    quote ->> 'quote_hash',
    repeat('a', 64)
  );
  if replayed_order ->> 'id' <> created_order ->> 'id'
    or replayed_order ->> 'replayed' <> 'true' then
    raise exception 'An equivalent checkout retry created another order';
  end if;

  begin
    perform public.create_order_with_quote(
      jsonb_build_array(jsonb_build_object('variant_id', test_variant_id, 'quantity', 1)),
      checkout_key,
      'UAT SQL Test Customer',
      'uat.customer@example.test',
      '+94000000000',
      '2 Changed Test Lane',
      'Colombo',
      '00000',
      'Changed payload must fail',
      test_price,
      quote ->> 'quote_hash',
      repeat('a', 64)
    );
  exception when unique_violation then
    changed_replay_rejected := true;
  end;
  if not changed_replay_rejected then
    raise exception 'Changed payload was accepted for a reused checkout key';
  end if;

  if (select variant.stock_on_hand from public.product_variants as variant where variant.id = test_variant_id) <> test_stock
    or (select variant.reserved_quantity from public.product_variants as variant where variant.id = test_variant_id) <> test_reserved then
    raise exception 'Order creation changed or reserved inventory';
  end if;

  quote := public.quote_cart(jsonb_build_array(jsonb_build_object(
    'variant_id', test_variant_id,
    'quantity', test_stock + 1
  )));
  if (quote ->> 'all_available')::boolean is not false then
    raise exception 'Quote did not reject a quantity above current availability';
  end if;

  select variant.id, variant.price_minor into other_variant_id, other_price
  from public.product_variants as variant
  join public.products as product on product.id = variant.product_id
  where product.slug = 'uat-sample-bangle-not-for-sale'
    and variant.sku = 'UAT-SAMPLE-M'
    and variant.is_active
  for update of variant;
  if not found then
    raise exception 'Expected second synthetic UAT test variant is missing';
  end if;
  update public.product_variants set stock_on_hand = 5 where id = other_variant_id;

  quote := public.quote_cart(jsonb_build_array(
    jsonb_build_object('variant_id', test_variant_id, 'quantity', 1),
    jsonb_build_object('variant_id', other_variant_id, 'quantity', 1)
  ));
  quote_subtotal := (quote ->> 'subtotal_minor')::bigint;
  previous_quote_hash := quote ->> 'quote_hash';
  update public.product_variants set price_minor = test_price + 100 where id = test_variant_id;
  update public.product_variants set price_minor = other_price - 100 where id = other_variant_id;

  quote := public.quote_cart(jsonb_build_array(
    jsonb_build_object('variant_id', test_variant_id, 'quantity', 1),
    jsonb_build_object('variant_id', other_variant_id, 'quantity', 1)
  ));
  if (quote ->> 'subtotal_minor')::bigint <> quote_subtotal
    or quote ->> 'quote_hash' = previous_quote_hash then
    raise exception 'Test setup did not produce a same-total, changed-item quote';
  end if;

  begin
    perform public.create_order_with_quote(
      jsonb_build_array(
        jsonb_build_object('variant_id', test_variant_id, 'quantity', 1),
        jsonb_build_object('variant_id', other_variant_id, 'quantity', 1)
      ),
      quote_change_key,
      'UAT SQL Test Customer',
      'uat.customer@example.test',
      '+94000000000',
      '1 Synthetic Test Lane',
      'Colombo',
      '00000',
      'Changed line prices must fail',
      quote_subtotal,
      previous_quote_hash,
      repeat('b', 64)
    );
  exception when sqlstate 'P0001' then
    changed_quote_rejected := true;
  end;
  if not changed_quote_rejected then
    raise exception 'Changed item prices with an unchanged subtotal were accepted';
  end if;

  update public.orders
  set payment_status = 'paid'
  where id = (created_order ->> 'id')::uuid;
  begin
    update public.orders
    set status = 'cancelled'
    where id = (created_order ->> 'id')::uuid;
  exception when check_violation then
    paid_cancellation_blocked := true;
  end;
  if not paid_cancellation_blocked then
    raise exception 'A paid order was cancelled before its full refund was recorded';
  end if;
end;
$test$;

rollback;
