-- Run only after the catalogue migration and UAT fixture seed on a disposable
-- local Supabase database or the dashboard-confirmed UAT project.
-- This script is read-only and rolls back its transaction.
begin;

set local role anon;

do $$
begin
  if has_column_privilege('anon', 'public.product_variants', 'colour_name', 'select')
    or has_column_privilege('authenticated', 'public.product_variants', 'colour_name', 'select') then
    raise exception 'Colour is still exposed as a selectable variant dimension';
  end if;

  if not exists (
    select 1
    from public.products
    where slug = 'uat-sample-bangle-not-for-sale'
      and title ilike '%Synthetic Ruby%'
  ) then
    raise exception 'Colour is not represented by the UAT product name or the product is not visible';
  end if;

  if exists (
    select 1
    from public.products
    where slug = 'uat-draft-fixture-hidden'
  ) then
    raise exception 'Draft product leaked to anon';
  end if;

  if exists (
    select 1
    from public.product_variants
    where id = 'a3000000-0000-4000-8000-000000000003'
  ) then
    raise exception 'Inactive variant leaked to anon';
  end if;

  if not exists (
    select 1
    from public.product_variants
    where id = 'a3000000-0000-4000-8000-000000000002'
      and is_available = false
  ) then
    raise exception 'Active out-of-stock variant visibility changed';
  end if;

  begin
    perform stock_on_hand from public.product_variants limit 1;
    raise exception 'Exact stock count is selectable by anon';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

rollback;
