-- Rollback-only assertions for permanent admin media and record deletion.
begin;

do $$
declare
  function_oid oid;
  function_definition text;
  audit_check text;
  table_name text;
  trigger_name text;
  function_names regprocedure[] := array[
    'public.delete_product_media(uuid, uuid)'::regprocedure,
    'public.delete_collection_media(uuid, uuid)'::regprocedure,
    'public.delete_offer_media(uuid, uuid)'::regprocedure,
    'public.replace_offer_banner(uuid, text, text)'::regprocedure,
    'public.delete_offer(uuid)'::regprocedure,
    'public.delete_collection(uuid)'::regprocedure
  ];
begin
  foreach function_oid in array function_names loop
    if pg_catalog.has_function_privilege('anon', function_oid, 'EXECUTE')
      or not pg_catalog.has_function_privilege('authenticated', function_oid, 'EXECUTE')
      or not (select proc.prosecdef from pg_catalog.pg_proc as proc where proc.oid = function_oid)
      or not coalesce((
        select 'search_path=""' = any(proc.proconfig)
        from pg_catalog.pg_proc as proc
        where proc.oid = function_oid
      ), false) then
      raise exception 'Admin deletion RPC grants or execution context are invalid: %', function_oid;
    end if;
  end loop;

  select pg_catalog.pg_get_constraintdef(constraint_row.oid)
    into audit_check
  from pg_catalog.pg_constraint as constraint_row
  where constraint_row.conrelid = 'public.admin_audit_logs'::regclass
    and constraint_row.conname = 'admin_audit_logs_action_check';
  if audit_check is null or audit_check not like '%delete%' then
    raise exception 'Admin audit logs do not accept delete actions';
  end if;

  foreach table_name in array array[
    'collections', 'offers', 'product_media', 'collection_media', 'offer_media'
  ] loop
    trigger_name := table_name || '_audit_deletes';
    if not exists (
      select 1 from pg_catalog.pg_trigger as trigger_row
      where trigger_row.tgrelid = ('public.' || table_name)::regclass
        and trigger_row.tgname = trigger_name
        and not trigger_row.tgisinternal
    ) then
      raise exception 'Missing delete audit trigger: %', trigger_name;
    end if;
  end loop;

  function_definition := lower(pg_catalog.pg_get_functiondef(
    'public.delete_product_media(uuid, uuid)'::regprocedure
  ));
  if function_definition not like '%must keep at least one image%' then
    raise exception 'Product image deletion does not protect the last published image';
  end if;

  function_definition := lower(pg_catalog.pg_get_functiondef(
    'public.delete_collection_media(uuid, uuid)'::regprocedure
  ));
  if function_definition not like '%must keep at least one image%' then
    raise exception 'Collection image deletion does not protect the last published image';
  end if;

  function_definition := lower(pg_catalog.pg_get_functiondef(
    'public.delete_offer_media(uuid, uuid)'::regprocedure
  ));
  if function_definition not like '%disable the offer before deleting%' then
    raise exception 'Offer banner deletion does not protect an enabled offer';
  end if;

  function_definition := lower(pg_catalog.pg_get_functiondef(
    'public.replace_offer_banner(uuid, text, text)'::regprocedure
  ));
  if function_definition not like '%disable the offer before replacing%'
    or function_definition not like '%''draft''%' then
    raise exception 'Offer banner replacement must require a disabled offer and create a draft';
  end if;

  function_definition := lower(pg_catalog.pg_get_functiondef(
    'public.delete_collection(uuid)'::regprocedure
  ));
  if function_definition not like '%target_collection_id%'
    or function_definition not like '%23503%'
    or function_definition not like '%delete from public.product_collections%' then
    raise exception 'Collection deletion does not guard offer targets';
  end if;

  function_definition := lower(pg_catalog.pg_get_functiondef(
    'public.delete_offer(uuid)'::regprocedure
  ));
  if function_definition not like '%delete from public.offers%' then
    raise exception 'Offer deletion does not remove the offer record';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid = 'public.orders'::regclass
      and constraint_row.confrelid = 'public.offers'::regclass
      and constraint_row.contype = 'f'
      and constraint_row.confdeltype = 'n'
  ) then
    raise exception 'Offer deletion would not preserve order snapshots';
  end if;
end;
$$;

set local role anon;

do $$
begin
  begin
    perform public.delete_product_media(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    );
    raise exception 'Anonymous users can delete product images';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.delete_collection_media(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    );
    raise exception 'Anonymous users can delete collection images';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.delete_offer_media(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    );
    raise exception 'Anonymous users can delete offer banners';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.replace_offer_banner(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'offers/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/00000000-0000-4000-8000-000000000001.jpg',
      'Unauthorized test'
    );
    raise exception 'Anonymous users can replace offer banners';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.delete_offer('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    raise exception 'Anonymous users can delete offers';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.delete_collection('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    raise exception 'Anonymous users can delete collections';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

do $$
begin
  begin
    perform public.delete_product_media(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    );
    raise exception 'Unassigned accounts can delete product images';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.delete_collection_media(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    );
    raise exception 'Unassigned accounts can delete collection images';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.delete_offer_media(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    );
    raise exception 'Unassigned accounts can delete offer banners';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.replace_offer_banner(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'offers/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/00000000-0000-4000-8000-000000000001.jpg',
      'Unauthorized test'
    );
    raise exception 'Unassigned accounts can replace offer banners';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.delete_offer('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    raise exception 'Unassigned accounts can delete offers';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.delete_collection('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    raise exception 'Unassigned accounts can delete collections';
  exception when insufficient_privilege then null;
  end;
end;
$$;

rollback;
