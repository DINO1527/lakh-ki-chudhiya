-- Structural regression checks for catalogue publication RLS helpers.
-- Run after the catalogue RLS recursion migration.
begin;

do $$
declare
  product_policy text;
  collection_policy text;
  product_helper record;
  collection_helper record;
begin
  select coalesce(qual, '') || coalesce(with_check, '')
    into product_policy
  from pg_policies
  where schemaname = 'public' and tablename = 'products'
    and policyname = 'staff can manage products';

  select coalesce(qual, '') || coalesce(with_check, '')
    into collection_policy
  from pg_policies
  where schemaname = 'public' and tablename = 'collections'
    and policyname = 'staff can manage collections';

  select prosecdef, proconfig, prosrc
    into product_helper
  from pg_proc
  where oid = 'private.product_is_publishable(uuid,integer,smallint,text,text)'::regprocedure;

  select prosecdef, proconfig, prosrc
    into collection_helper
  from pg_proc
  where oid = 'private.collection_is_publishable(uuid)'::regprocedure;

  if product_policy not like '%private.product_is_publishable%'
    or product_policy like '%product_variants%'
    or product_policy like '%product_media%'
    or collection_policy not like '%private.collection_is_publishable%'
    or collection_policy like '%collection_media%'
    or product_helper.prosecdef is distinct from true
    or collection_helper.prosecdef is distinct from true
    or not (product_helper.proconfig @> array['search_path=""'])
    or not (collection_helper.proconfig @> array['search_path=""'])
    or product_helper.prosrc not like '%auth.uid()%'
    or product_helper.prosrc not like '%has_admin_role%'
    or collection_helper.prosrc not like '%auth.uid()%'
    or collection_helper.prosrc not like '%has_admin_role%' then
    raise exception 'Catalogue admin RLS helpers are missing safe, non-recursive publication checks';
  end if;

  if has_function_privilege('authenticated', 'private.product_is_publishable(uuid,integer,smallint,text,text)', 'execute') is distinct from true
    or has_function_privilege('authenticated', 'private.collection_is_publishable(uuid)', 'execute') is distinct from true
    or has_function_privilege('anon', 'private.product_is_publishable(uuid,integer,smallint,text,text)', 'execute')
    or has_function_privilege('anon', 'private.collection_is_publishable(uuid)', 'execute')
    or exists (
      select 1 from pg_proc proc
      cross join lateral aclexplode(coalesce(proc.proacl, acldefault('f', proc.proowner))) grant_entry
      where proc.oid in (
        'private.product_is_publishable(uuid,integer,smallint,text,text)'::regprocedure,
        'private.collection_is_publishable(uuid)'::regprocedure
      )
        and grant_entry.grantee = 0
        and grant_entry.privilege_type = 'EXECUTE'
    ) then
    raise exception 'Anonymous users can execute catalogue publication helpers';
  end if;
end;
$$;

rollback;
