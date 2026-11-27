-- Read-only assertions for product photo publication RPC security.
-- Every boolean result must be true for both functions.
select
  proc.oid::regprocedure::text as function_name,
  proc.prosecdef as security_definer,
  coalesce('search_path=""' = any(proc.proconfig), false) as empty_search_path,
  not pg_catalog.has_function_privilege('anon', proc.oid, 'EXECUTE') as anon_denied,
  pg_catalog.has_function_privilege('authenticated', proc.oid, 'EXECUTE') as authenticated_granted
from pg_catalog.pg_proc proc
where proc.oid in (
  'public.publish_product_media(uuid, uuid)'::regprocedure,
  'public.unpublish_product_media(uuid, uuid)'::regprocedure
)
order by function_name;
