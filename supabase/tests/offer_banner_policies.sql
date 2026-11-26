-- Rollback-only checks for offer-banner access and publication gates.
begin;

do $$
declare
  media_policy text;
  storage_policy text;
  public_offer_policy text;
  enabled_banner_trigger boolean;
  archive_banner_trigger boolean;
  media_is_rls_enabled boolean;
  offer_rpc_definition text;
  low_stock_rpc_definition text;
begin
  select relrowsecurity into media_is_rls_enabled
  from pg_class where oid = 'public.offer_media'::regclass;

  select coalesce(qual, '') into media_policy
  from pg_policies
  where schemaname = 'public' and tablename = 'offer_media'
    and policyname = 'published banners for active public offers are readable';

  select coalesce(qual, '') into storage_policy
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'published catalogue media can be signed';

  select coalesce(qual, '') into public_offer_policy
  from pg_policies
  where schemaname = 'public' and tablename = 'offers'
    and policyname = 'active offers for published catalogue targets are public';

  select exists (
    select 1 from pg_trigger
    where tgrelid = 'public.offers'::regclass
      and tgname = 'offers_require_published_banner' and not tgisinternal
  ) into enabled_banner_trigger;

  select exists (
    select 1 from pg_trigger
    where tgrelid = 'public.offer_media'::regclass
      and tgname = 'offer_media_keep_enabled_banner' and not tgisinternal
  ) into archive_banner_trigger;

  select lower(pg_get_functiondef('public.get_active_storefront_offers(integer)'::regprocedure))
    into offer_rpc_definition;
  select lower(pg_get_functiondef('public.get_public_low_stock_variants(uuid[])'::regprocedure))
    into low_stock_rpc_definition;

  if media_is_rls_enabled is distinct from true
    or media_policy not like '%published%'
    or media_policy not like '%offers%'
    or storage_policy not like '%storage.object.sign%'
    or storage_policy not like '%offer_media%'
    or storage_policy like '%object.list%'
    or public_offer_policy not like '%starts_at%'
    or public_offer_policy not like '%ends_at%'
    or public_offer_policy not like '%published%'
    or offer_rpc_definition like '%uat-fixtures-not-for-sale%'
    or offer_rpc_definition not like '%starts_at%'
    or offer_rpc_definition not like '%ends_at%'
    or offer_rpc_definition not like '%published%'
    or low_stock_rpc_definition like '%uat-%'
    or low_stock_rpc_definition not like '%between 1 and 2%'
    or enabled_banner_trigger is distinct from true
    or archive_banner_trigger is distinct from true then
    raise exception 'Offer banner privacy, publication or active-target checks are missing';
  end if;

  if has_column_privilege('anon', 'public.offer_media', 'storage_path', 'select') is distinct from true
    or has_column_privilege('anon', 'public.offer_media', 'storage_path', 'insert')
    or has_column_privilege('anon', 'public.offer_media', 'storage_path', 'update')
    or has_column_privilege('anon', 'public.offers', 'name', 'select') is distinct from true then
    raise exception 'Offer banner or offer grants are too broad or missing';
  end if;

  if not exists (
    select 1 from pg_indexes where schemaname = 'public'
      and indexname = 'offer_media_one_active_banner_idx'
  ) then
    raise exception 'Offer banners are not limited to one active image per offer';
  end if;
end;
$$;

rollback;
