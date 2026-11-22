-- Stage 2: staff authorization, catalogue administration, content and inventory.

create table public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'staff')),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index staff_members_active_role_idx
  on public.staff_members (role, user_id)
  where is_active;

alter table public.product_variants
  add column reserved_quantity integer not null default 0
    check (reserved_quantity >= 0 and reserved_quantity <= stock_on_hand);

drop index if exists public.product_variants_available_size_colour_idx;
drop index if exists public.product_variants_available_colour_idx;
alter table public.product_variants drop column is_available;
alter table public.product_variants
  add column is_available boolean
    generated always as (is_active and stock_on_hand > reserved_quantity) stored;
create index product_variants_available_size_colour_idx
  on public.product_variants (size_code, colour_name, product_id)
  where is_available;
create index product_variants_available_colour_idx
  on public.product_variants (colour_name, product_id)
  where is_available;

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  movement_type text not null check (
    movement_type in ('adjustment', 'reserved', 'released', 'dispatched', 'restocked')
  ),
  on_hand_delta integer not null default 0,
  reserved_delta integer not null default 0,
  reason text not null check (length(trim(reason)) between 1 and 500),
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (on_hand_delta <> 0 or reserved_delta <> 0)
);

create index inventory_movements_variant_created_idx
  on public.inventory_movements (variant_id, created_at desc, id desc);

create table public.site_content (
  content_key text primary key check (content_key ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),
  eyebrow text not null default '' check (length(eyebrow) <= 120),
  title text not null check (length(trim(title)) between 1 and 160),
  body text not null default '' check (length(body) <= 4_000),
  cta_label text not null default '' check (length(cta_label) <= 80),
  cta_href text not null default '' check (
    cta_href = '' or (
      left(cta_href, 1) = '/'
      and left(cta_href, 2) <> '//'
      and cta_href ~ '^/[A-Za-z0-9/_-]*$'
    )
  ),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  updated_at timestamptz not null default now()
);

insert into public.site_content (content_key, eyebrow, title, body, cta_label, cta_href, status)
values (
  'home_hero',
  'Lac bangles, made by hand',
  'Colour with a story of its own.',
  'We are preparing a thoughtful collection of handcrafted lac bangles. The pieces, sizes and details will be shared here once they are ready.',
  'Explore the collection',
  '/shop',
  'published'
);

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  resource_type text not null check (
    resource_type in ('product', 'product_variant', 'collection', 'product_media', 'site_content', 'staff_member')
  ),
  record_id text not null,
  action text not null check (action in ('insert', 'update')),
  changed_fields text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index admin_audit_logs_created_idx
  on public.admin_audit_logs (created_at desc, id desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

create trigger staff_members_set_updated_at
  before update on public.staff_members
  for each row execute function public.set_updated_at();
create trigger collections_set_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();
create trigger product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();
create trigger site_content_set_updated_at
  before update on public.site_content
  for each row execute function public.set_updated_at();

create or replace function public.has_admin_role(p_roles text[] default array['owner', 'staff'])
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.staff_members as member
    where member.user_id = (select auth.uid())
      and member.is_active
      and member.role = any (p_roles)
  );
$function$;

revoke all on function public.has_admin_role(text[]) from public, anon;
grant execute on function public.has_admin_role(text[]) to authenticated;

drop policy "admins can manage product media objects" on storage.objects;
create policy "staff can manage product media objects"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'product-media'
    and (select public.has_admin_role(array['owner', 'staff']))
  )
  with check (
    bucket_id = 'product-media'
    and (select public.has_admin_role(array['owner', 'staff']))
  );

create or replace function public.audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  changed text[];
  resource_id text;
begin
  if tg_op = 'INSERT' then
    changed := array['created'];
    resource_id := to_jsonb(new) ->> tg_argv[0];
    insert into public.admin_audit_logs (
      actor_user_id, resource_type, record_id, action, changed_fields
    ) values (
      (select auth.uid()), tg_argv[1], resource_id, 'insert', changed
    );
    return new;
  end if;

  select coalesce(array_agg(current_row.key order by current_row.key), '{}'::text[])
    into changed
  from jsonb_each(to_jsonb(new)) as current_row
  where current_row.key not in ('created_at', 'updated_at')
    and (to_jsonb(old) -> current_row.key) is distinct from current_row.value;

  if cardinality(changed) > 0 then
    resource_id := to_jsonb(new) ->> tg_argv[0];
    insert into public.admin_audit_logs (
      actor_user_id, resource_type, record_id, action, changed_fields
    ) values (
      (select auth.uid()), tg_argv[1], resource_id, 'update', changed
    );
  end if;
  return new;
end;
$function$;

create trigger products_audit_changes
  after insert or update on public.products
  for each row execute function public.audit_admin_change('id', 'product');
create trigger product_variants_audit_changes
  after insert or update on public.product_variants
  for each row execute function public.audit_admin_change('id', 'product_variant');
create trigger collections_audit_changes
  after insert or update on public.collections
  for each row execute function public.audit_admin_change('id', 'collection');
create trigger product_media_audit_changes
  after insert or update on public.product_media
  for each row execute function public.audit_admin_change('id', 'product_media');
create trigger site_content_audit_changes
  after insert or update on public.site_content
  for each row execute function public.audit_admin_change('content_key', 'site_content');
create trigger staff_members_audit_changes
  after insert or update on public.staff_members
  for each row execute function public.audit_admin_change('user_id', 'staff_member');

create or replace function public.publish_product(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_product public.products%rowtype;
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;

  select * into target_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;
  if length(trim(target_product.title)) = 0
    or length(trim(target_product.care_instructions)) = 0 then
    raise exception 'Product title and care instructions are required' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.product_variants variant
    where variant.product_id = p_product_id and variant.is_active
  ) then
    raise exception 'At least one active variant is required' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.product_media media
    where media.product_id = p_product_id
      and media.media_type = 'image'
      and media.status in ('draft', 'published')
  ) then
    raise exception 'At least one image is required' using errcode = '22023';
  end if;

  update public.product_media
  set status = 'published'
  where product_id = p_product_id
    and media_type = 'image'
    and status = 'draft';
  update public.products set status = 'published' where id = p_product_id;
end;
$function$;

create or replace function public.archive_product(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;

  update public.products set status = 'archived' where id = p_product_id;
  if not found then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;
end;
$function$;

create or replace function public.archive_product_media(p_media_id uuid, p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;

  update public.product_media
  set status = 'archived'
  where id = p_media_id and product_id = p_product_id;
  if not found then
    raise exception 'Product media not found' using errcode = 'P0002';
  end if;
end;
$function$;

create or replace function public.set_product_collections(
  p_product_id uuid,
  p_collection_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  selected_ids uuid[] := coalesce(p_collection_ids, '{}'::uuid[]);
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;
  perform 1 from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from unnest(selected_ids) as selected(collection_id)
    where not exists (
      select 1 from public.collections collection
      where collection.id = selected.collection_id
    )
  ) then
    raise exception 'Collection not found' using errcode = 'P0002';
  end if;

  delete from public.product_collections link
  where link.product_id = p_product_id
    and not (link.collection_id = any(selected_ids));
  insert into public.product_collections (product_id, collection_id)
  select p_product_id, selected.collection_id
  from (select distinct unnest(selected_ids) as collection_id) as selected
  on conflict (product_id, collection_id) do nothing;

  insert into public.admin_audit_logs (
    actor_user_id, resource_type, record_id, action, changed_fields
  ) values (
    (select auth.uid()), 'product', p_product_id::text, 'update', array['collections']
  );
end;
$function$;

create or replace function public.adjust_inventory(
  p_variant_id uuid,
  p_quantity_delta integer,
  p_reason text
)
returns table (stock_on_hand integer, reserved_quantity integer, available_quantity integer)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_on_hand integer;
  current_reserved integer;
  next_on_hand bigint;
  normalized_reason text := trim(coalesce(p_reason, ''));
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;
  if p_quantity_delta = 0 then
    raise exception 'Quantity change must not be zero' using errcode = '22023';
  end if;
  if length(normalized_reason) not between 1 and 500 then
    raise exception 'A reason between 1 and 500 characters is required' using errcode = '22023';
  end if;

  select variant.stock_on_hand, variant.reserved_quantity
    into current_on_hand, current_reserved
  from public.product_variants as variant
  where variant.id = p_variant_id
  for update;

  if not found then
    raise exception 'Variant not found' using errcode = 'P0002';
  end if;

  next_on_hand := current_on_hand::bigint + p_quantity_delta::bigint;
  if next_on_hand < current_reserved then
    raise exception 'Stock cannot be reduced below reserved quantity' using errcode = '23514';
  end if;
  if next_on_hand > 2147483647 then
    raise exception 'Stock quantity is too large' using errcode = '22003';
  end if;

  update public.product_variants as variant
  set stock_on_hand = next_on_hand::integer
  where variant.id = p_variant_id;

  insert into public.inventory_movements (
    variant_id, movement_type, on_hand_delta, reserved_delta, reason, actor_user_id
  ) values (
    p_variant_id, 'adjustment', p_quantity_delta, 0, normalized_reason, (select auth.uid())
  );

  return query
  select variant.stock_on_hand, variant.reserved_quantity,
    variant.stock_on_hand - variant.reserved_quantity
  from public.product_variants as variant
  where variant.id = p_variant_id;
end;
$function$;

create or replace function public.manage_staff_member(
  p_user_id uuid,
  p_role text,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  existing_role text;
  existing_active boolean;
  active_owners bigint;
begin
  if not public.has_admin_role(array['owner']) then
    raise exception 'Owner privilege required' using errcode = '42501';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'Use another owner account to change your membership' using errcode = '22023';
  end if;
  if p_role is null or p_role not in ('owner', 'staff') or p_is_active is null then
    raise exception 'Invalid staff role or status' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users as auth_user where auth_user.id = p_user_id) then
    raise exception 'Auth user not found' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(52022026);
  select member.role, member.is_active
    into existing_role, existing_active
  from public.staff_members as member
  where member.user_id = p_user_id
  for update;

  if found
    and existing_role = 'owner'
    and existing_active
    and (p_role <> 'owner' or not p_is_active) then
    select count(*) into active_owners
    from public.staff_members as member
    where member.role = 'owner' and member.is_active;
    if active_owners <= 1 then
      raise exception 'At least one active owner must remain' using errcode = '23514';
    end if;
  end if;

  insert into public.staff_members (user_id, role, is_active, created_by)
  values (p_user_id, p_role, p_is_active, (select auth.uid()))
  on conflict (user_id) do update
    set role = excluded.role, is_active = excluded.is_active;
end;
$function$;

create or replace function public.set_homepage_content(
  p_eyebrow text,
  p_title text,
  p_body text,
  p_cta_label text,
  p_cta_href text,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;

  insert into public.site_content (
    content_key, eyebrow, title, body, cta_label, cta_href, status
  ) values (
    'home_hero', trim(coalesce(p_eyebrow, '')), trim(coalesce(p_title, '')),
    coalesce(p_body, ''), trim(coalesce(p_cta_label, '')),
    trim(coalesce(p_cta_href, '')), p_status
  )
  on conflict (content_key) do update set
    eyebrow = excluded.eyebrow,
    title = excluded.title,
    body = excluded.body,
    cta_label = excluded.cta_label,
    cta_href = excluded.cta_href,
    status = excluded.status;
end;
$function$;

revoke all on function public.publish_product(uuid) from public, anon;
revoke all on function public.archive_product(uuid) from public, anon;
revoke all on function public.archive_product_media(uuid, uuid) from public, anon;
revoke all on function public.set_product_collections(uuid, uuid[]) from public, anon;
revoke all on function public.adjust_inventory(uuid, integer, text) from public, anon;
revoke all on function public.manage_staff_member(uuid, text, boolean) from public, anon;
revoke all on function public.set_homepage_content(text, text, text, text, text, text) from public, anon;
grant execute on function public.publish_product(uuid) to authenticated;
grant execute on function public.archive_product(uuid) to authenticated;
grant execute on function public.archive_product_media(uuid, uuid) to authenticated;
grant execute on function public.set_product_collections(uuid, uuid[]) to authenticated;
grant execute on function public.adjust_inventory(uuid, integer, text) to authenticated;
grant execute on function public.manage_staff_member(uuid, text, boolean) to authenticated;
grant execute on function public.set_homepage_content(text, text, text, text, text, text) to authenticated;

alter table public.staff_members enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.site_content enable row level security;
alter table public.admin_audit_logs enable row level security;

drop policy "admins can read all product media metadata" on public.product_media;
create policy "staff can read all product media metadata"
  on public.product_media for select to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])));

create policy "staff can manage products"
  on public.products for all to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])))
  with check ((select public.has_admin_role(array['owner', 'staff'])));
create policy "staff can manage collections"
  on public.collections for all to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])))
  with check ((select public.has_admin_role(array['owner', 'staff'])));
create policy "staff can manage product collection links"
  on public.product_collections for all to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])))
  with check ((select public.has_admin_role(array['owner', 'staff'])));
create policy "staff can read all product variants"
  on public.product_variants for select to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])));
create policy "staff can insert product variants"
  on public.product_variants for insert to authenticated
  with check ((select public.has_admin_role(array['owner', 'staff'])));
create policy "staff can update product variants"
  on public.product_variants for update to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])))
  with check ((select public.has_admin_role(array['owner', 'staff'])));
create policy "staff can manage product media metadata"
  on public.product_media for all to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])))
  with check ((select public.has_admin_role(array['owner', 'staff'])));
create policy "published homepage content is readable"
  on public.site_content for select to anon, authenticated
  using (status = 'published');
create policy "staff can manage homepage content"
  on public.site_content for all to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])))
  with check ((select public.has_admin_role(array['owner', 'staff'])));
create policy "users can read their staff membership and owners can read all"
  on public.staff_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.has_admin_role(array['owner']))
  );
create policy "staff can read inventory movement history"
  on public.inventory_movements for select to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])));
create policy "owners can read admin audit logs"
  on public.admin_audit_logs for select to authenticated
  using ((select public.has_admin_role(array['owner'])));

revoke all on public.staff_members, public.inventory_movements,
  public.site_content, public.admin_audit_logs
  from public, anon, authenticated;

grant select (id, slug, name, description, status, sort_order)
  on public.collections to authenticated;
grant insert (slug, name, description, status, sort_order),
  update (slug, name, description, status, sort_order)
  on public.collections to authenticated;

grant select (id, slug, title, description, material, care_instructions,
  set_count, status, sort_order, created_at, updated_at)
  on public.products to authenticated;
grant insert (slug, title, description, material, care_instructions, set_count, sort_order),
  update (slug, title, description, material, care_instructions, set_count, sort_order)
  on public.products to authenticated;

grant select (product_id, collection_id, created_at)
  on public.product_collections to authenticated;
grant insert (product_id, collection_id), delete
  on public.product_collections to authenticated;

grant select (id, product_id, sku, size_code, inner_diameter_mm, colour_name,
  price_minor, compare_at_price_minor, stock_on_hand, reserved_quantity,
  is_active, is_available, created_at, updated_at)
  on public.product_variants to authenticated;
grant insert (product_id, sku, size_code, inner_diameter_mm, colour_name,
  price_minor, compare_at_price_minor, is_active)
  on public.product_variants to authenticated;
grant update (sku, size_code, inner_diameter_mm, colour_name,
  price_minor, compare_at_price_minor, is_active)
  on public.product_variants to authenticated;

grant select (id, product_id, variant_id, storage_path, alt_text,
  media_type, status, sort_order, created_at)
  on public.product_media to authenticated;
grant insert (product_id, variant_id, storage_path, alt_text, media_type, sort_order),
  update (variant_id, alt_text, sort_order)
  on public.product_media to authenticated;

grant select (content_key, eyebrow, title, body, cta_label, cta_href, status, updated_at)
  on public.site_content to anon, authenticated;
grant insert (content_key, eyebrow, title, body, cta_label, cta_href, status),
  update (eyebrow, title, body, cta_label, cta_href, status)
  on public.site_content to authenticated;

grant select (user_id, role, is_active, created_by, created_at, updated_at)
  on public.staff_members to authenticated;
grant select (id, variant_id, movement_type, on_hand_delta, reserved_delta,
  reason, actor_user_id, created_at)
  on public.inventory_movements to authenticated;
grant select (id, actor_user_id, resource_type, record_id, action, changed_fields, created_at)
  on public.admin_audit_logs to authenticated;

grant select (id, product_id, size_code, inner_diameter_mm, colour_name,
  price_minor, compare_at_price_minor, is_available)
  on public.product_variants to anon, authenticated;
