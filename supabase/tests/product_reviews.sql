-- Read-only permission and public-surface checks. Run against a disposable/UAT database.
begin;

do $checks$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products'
      and column_name = 'reviews_enabled' and column_default is not null
  ) then
    raise exception 'Product review control is missing or has no default';
  end if;

  if not (
    select relrowsecurity from pg_class
    where oid = 'public.product_reviews'::regclass
  ) then
    raise exception 'Product review row-level security is not enabled';
  end if;

  if has_table_privilege('anon', 'public.product_reviews', 'INSERT')
    or has_table_privilege('anon', 'public.product_reviews', 'UPDATE')
    or has_table_privilege('anon', 'public.product_reviews', 'DELETE') then
    raise exception 'Anonymous users must not write reviews';
  end if;
  if has_table_privilege('authenticated', 'public.product_reviews', 'INSERT')
    or has_table_privilege('authenticated', 'public.product_reviews', 'UPDATE')
    or has_table_privilege('authenticated', 'public.product_reviews', 'DELETE') then
    raise exception 'Customer writes must use the guarded review RPC';
  end if;
  if has_column_privilege('anon', 'public.product_reviews', 'user_id', 'SELECT')
    or has_column_privilege('anon', 'public.product_reviews', 'order_id', 'SELECT')
    or has_column_privilege('anon', 'public.product_reviews', 'moderated_by', 'SELECT') then
    raise exception 'Public review reads must not expose customer or moderation identifiers';
  end if;

  if has_function_privilege('anon', 'public.submit_product_review(uuid,smallint,text)', 'EXECUTE') then
    raise exception 'Anonymous users must not submit reviews';
  end if;
  if not has_function_privilege('authenticated', 'public.submit_product_review(uuid,smallint,text)', 'EXECUTE') then
    raise exception 'Signed-in customers must be able to call the guarded review RPC';
  end if;
  if not has_function_privilege('authenticated', 'public.moderate_product_review(uuid,text)', 'EXECUTE') then
    raise exception 'Signed-in staff must be able to call the guarded moderation RPC';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'product_reviews_order_item_uidx'
  ) then
    raise exception 'One-review-per-order-item uniqueness index is missing';
  end if;
end;
$checks$;

-- An unknown UUID can reveal only the empty aggregate, never another customer's data.
do $summary$
declare result_row record;
begin
  select * into result_row
  from public.get_product_review_summary('00000000-0000-4000-8000-000000000001');
  if result_row.average_rating <> 0 or result_row.review_count <> 0 then
    raise exception 'Unknown product should return an empty review summary';
  end if;
end;
$summary$;

set local role anon;
do $public_visibility$
begin
  if exists (
    select 1 from public.product_reviews where status <> 'approved'
  ) then
    raise exception 'Anonymous role can see a review awaiting or declined moderation';
  end if;
end;
$public_visibility$;
reset role;

rollback;
