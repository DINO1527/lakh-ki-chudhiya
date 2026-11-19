-- Structural checks for the private product-media bucket and policy shape.
-- Run against a database where migrations and the bucket config have been applied.
begin;

do $$
declare
  bucket_is_private boolean;
  published_policy text;
  admin_policy text;
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
    and policyname = 'published product media can be signed';

  if published_policy is null
    or published_policy not like '%storage.object.sign%'
    or published_policy not like '%published%'
    or published_policy like '%object.list%' then
    raise exception 'published media policy does not limit signing to published rows';
  end if;

  select qual || coalesce(with_check, '') into admin_policy
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'admins can manage product media objects';

  if admin_policy is null
    or admin_policy not like '%app_metadata%'
    or admin_policy not like '%admin%'
    or admin_policy not like '%product-media%' then
    raise exception 'admin Storage policy is missing trusted role or bucket checks';
  end if;
end;
$$;

rollback;
