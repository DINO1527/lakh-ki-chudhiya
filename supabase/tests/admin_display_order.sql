-- Admin display-order RPCs reject anonymous and unassigned authenticated callers.
-- Run in a rollback-only transaction after the display-order migration.
begin;

set local role anon;

do $$
begin
  begin
    perform public.create_collection_draft('Unauthorized test', 'unauthorized-test', '');
    raise exception 'Anonymous users can create collections';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.add_collection_media(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'collections/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/00000000-0000-4000-8000-000000000001.jpg',
      'Unauthorized test'
    );
    raise exception 'Anonymous users can add collection images';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.move_collection_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'up');
    raise exception 'Anonymous users can reorder collections';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.move_collection_media_order(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'down'
    );
    raise exception 'Anonymous users can reorder collection images';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

do $$
begin
  begin
    perform public.create_collection_draft('Unauthorized test', 'unauthorized-test', '');
    raise exception 'Unassigned accounts can create collections';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.add_collection_media(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'collections/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/00000000-0000-4000-8000-000000000001.jpg',
      'Unauthorized test'
    );
    raise exception 'Unassigned accounts can add collection images';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.move_collection_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'up');
    raise exception 'Unassigned accounts can reorder collections';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.move_collection_media_order(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'down'
    );
    raise exception 'Unassigned accounts can reorder collection images';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

rollback;
