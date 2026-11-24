-- Structural checks for the private product-media bucket and policy shape.
-- Run against a database where migrations and the bucket config have been applied.
begin;

do $$
declare
  bucket_is_private boolean;
  published_policy text;
  staff_policy text;
  role_helper_is_definer boolean;
  role_helper_config text[];
  role_helper_source text;
begin
  select not public into bucket_is_private
  from storage.buckets
  where id = 'product-media';

  if bucket_is_private is distinct from true then
    raise exception 'product-media bucket is missing or public';
  end if;

  select qual into published_policy
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'published catalogue media can be signed';

  if published_policy is null
    or published_policy not like '%storage.object.sign%'
    or published_policy not like '%published%'
    or published_policy not like '%collection_media%'
    or published_policy like '%object.list%' then
    raise exception 'published catalogue media policy does not limit signing to published rows';
  end if;

  select qual || coalesce(with_check, '') into staff_policy
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'staff can manage product media objects';

  select prosecdef, proconfig, prosrc
    into role_helper_is_definer, role_helper_config, role_helper_source
  from pg_proc
  where oid = 'public.has_admin_role(text[])'::regprocedure;

  if staff_policy is null
    or staff_policy not like '%has_admin_role%'
    or staff_policy not like '%staff%'
    or staff_policy not like '%product-media%'
    or staff_policy like '%app_metadata%'
    or role_helper_is_definer is distinct from true
    or not (role_helper_config @> array['search_path=""'])
    or role_helper_source not like '%public.staff_members%' then
    raise exception 'Storage policy does not use the fixed-path database staff role check';
  end if;
end;
$$;

rollback;
