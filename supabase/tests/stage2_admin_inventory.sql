-- Security and shape checks for Stage 2. Run in a rollback-only transaction
-- after the Stage 2 migration. Positive stock mutation checks require an
-- owner-approved UAT staff account and are performed through the app workflow.
begin;

do $$
begin
  if not exists (
    select 1
    from pg_attribute
    where attrelid = 'public.product_variants'::regclass
      and attname = 'is_available'
      and attgenerated = 's'
      and not attisdropped
  ) then
    raise exception 'Variant availability is not generated from current stock and reservations';
  end if;
end;
$$;

set local role anon;

do $$
begin
  begin
    perform user_id from public.staff_members limit 1;
    raise exception 'Anonymous users can read staff membership';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform stock_on_hand from public.product_variants limit 1;
    raise exception 'Anonymous users can read exact stock quantities';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform reserved_quantity from public.product_variants limit 1;
    raise exception 'Anonymous users can read reserved quantities';
  exception
    when insufficient_privilege then null;
  end;

  if not exists (
    select 1 from public.site_content
    where content_key = 'home_hero' and status = 'published'
  ) then
    raise exception 'Published homepage content is not visible';
  end if;
end;
$$;

set local role authenticated;

do $$
begin
  if public.has_admin_role(array['owner', 'staff']) then
    raise exception 'An unscoped authenticated user was treated as staff';
  end if;

  begin
    perform public.adjust_inventory(
      'a3000000-0000-4000-8000-000000000001', 1, 'unauthorized test'
    );
    raise exception 'An unassigned account adjusted inventory';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.product_variants set stock_on_hand = stock_on_hand + 1;
    raise exception 'Direct stock updates are allowed';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.inventory_movements (variant_id, movement_type, on_hand_delta, reason)
    values ('a3000000-0000-4000-8000-000000000001', 'adjustment', 1, 'forged movement');
    raise exception 'Direct inventory movement inserts are allowed';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

rollback;
