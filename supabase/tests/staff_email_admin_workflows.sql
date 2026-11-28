-- Security and RPC-shape checks for email-based staff administration.
begin;

do $$
declare
  list_function regprocedure := 'public.list_staff_members_with_email()'::regprocedure;
  manage_function regprocedure := 'public.manage_staff_member_by_email(text,text,boolean)'::regprocedure;
  actor_function regprocedure := 'public.get_admin_actor_emails(uuid[])'::regprocedure;
  list_is_definer boolean;
  list_config text[];
  list_source text;
  manage_is_definer boolean;
  manage_config text[];
  manage_source text;
  actor_is_definer boolean;
  actor_config text[];
  actor_source text;
begin
  select prosecdef, proconfig, prosrc into list_is_definer, list_config, list_source
  from pg_proc where oid = list_function;
  select prosecdef, proconfig, prosrc into manage_is_definer, manage_config, manage_source
  from pg_proc where oid = manage_function;
  select prosecdef, proconfig, prosrc into actor_is_definer, actor_config, actor_source
  from pg_proc where oid = actor_function;

  if list_is_definer is distinct from true
    or not (list_config @> array['search_path=""'])
    or list_source not like '%has_admin_role%'
    or list_source not like '%auth.users%' then
    raise exception 'Staff email list is missing a fixed-path owner check';
  end if;

  if manage_is_definer is distinct from true
    or not (manage_config @> array['search_path=""'])
    or manage_source not like '%has_admin_role%'
    or manage_source not like '%manage_staff_member%' then
    raise exception 'Email staff management does not reuse the protected staff mutation';
  end if;

  if actor_is_definer is distinct from true
    or not (actor_config @> array['search_path=""'])
    or actor_source not like '%has_admin_role%'
    or actor_source not like '%staff_members%' then
    raise exception 'Audit actor lookup is missing a fixed-path staff check';
  end if;

  if has_function_privilege('anon', list_function, 'EXECUTE')
    or has_function_privilege('anon', manage_function, 'EXECUTE')
    or has_function_privilege('anon', actor_function, 'EXECUTE')
    or not has_function_privilege('authenticated', list_function, 'EXECUTE')
    or not has_function_privilege('authenticated', manage_function, 'EXECUTE')
    or not has_function_privilege('authenticated', actor_function, 'EXECUTE') then
    raise exception 'Staff administration RPC grants are too broad or incomplete';
  end if;
end;
$$;

rollback;
