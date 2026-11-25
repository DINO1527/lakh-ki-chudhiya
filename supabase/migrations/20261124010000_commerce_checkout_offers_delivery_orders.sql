-- Extend the existing guest/account checkout and stock lifecycle with server-priced
-- offers, per-product delivery settings, COD eligibility and inspected returns.

alter table public.products
  add column delivery_fee_minor integer check (delivery_fee_minor is null or delivery_fee_minor >= 0),
  add column cod_enabled boolean not null default false;

drop policy "staff can manage products" on public.products;
create policy "staff can manage products"
  on public.products for all to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])))
  with check (
    (select public.has_admin_role(array['owner', 'staff']))
    and (
      status <> 'published'
      or (
        delivery_fee_minor is not null
        and set_count >= 2
        and length(trim(title)) > 0
        and length(trim(care_instructions)) > 0
        and exists (
          select 1 from public.product_variants v
          where v.product_id = public.products.id and v.is_active
        )
        and exists (
          select 1 from public.product_media m
          where m.product_id = public.products.id
            and m.media_type = 'image' and m.status = 'published'
        )
      )
    )
  );


-- Keep the synthetic UAT sample checkoutable at a zero fee. This is test data only.
update public.products
set delivery_fee_minor = 0
where slug = 'uat-sample-bangle-not-for-sale';

-- Keep legacy products out of checkout until required commercial details and
-- a verified image gallery are present. The UAT-only checkout fixture is the
-- sole explicit exception and contains synthetic, non-fulfilable data.
update public.products product
set status = 'draft', updated_at = now()
where product.status = 'published'
  and product.slug <> 'uat-sample-bangle-not-for-sale'
  and (
    product.delivery_fee_minor is null
    or product.set_count < 2
    or not exists (
      select 1 from public.product_variants variant
      where variant.product_id = product.id and variant.is_active
    )
    or not exists (
      select 1 from public.product_media media
      where media.product_id = product.id
        and media.media_type = 'image'
        and media.status = 'published'
    )
  );

grant select (delivery_fee_minor) on public.products to anon;
grant select (delivery_fee_minor, cod_enabled) on public.products to authenticated;
grant insert (delivery_fee_minor, cod_enabled), update (delivery_fee_minor, cod_enabled)
  on public.products to authenticated;

create table public.store_settings (
  singleton boolean primary key default true check (singleton),
  cod_enabled boolean not null default false,
  whatsapp_number text check (whatsapp_number is null or whatsapp_number ~ '^[1-9][0-9]{7,14}$'),
  updated_at timestamptz not null default now(),
  check (not cod_enabled or whatsapp_number is not null)
);
insert into public.store_settings (singleton) values (true);
create trigger store_settings_set_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();
create trigger store_settings_audit_changes
  after update on public.store_settings
  for each row execute function public.audit_admin_change('singleton', 'store_settings');
alter table public.store_settings enable row level security;
revoke all on public.store_settings from public, anon, authenticated;
grant select (cod_enabled, whatsapp_number) on public.store_settings to anon, authenticated;
grant select (singleton, cod_enabled, whatsapp_number, updated_at)
  on public.store_settings to authenticated;
create policy "public checkout settings are readable"
  on public.store_settings for select to anon, authenticated using (singleton);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  target_type text not null check (target_type in ('product', 'collection')),
  target_product_id uuid references public.products(id) on delete cascade,
  target_collection_id uuid references public.collections(id) on delete cascade,
  minimum_sets smallint not null check (minimum_sets between 1 and 1000),
  discount_basis_points integer not null check (discount_basis_points between 1 and 10000),
  starts_at timestamptz,
  ends_at timestamptz,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (target_type = 'product' and target_product_id is not null and target_collection_id is null)
    or (target_type = 'collection' and target_collection_id is not null and target_product_id is null)
  ),
  check (starts_at is null or ends_at is null or ends_at > starts_at)
);
create index offers_enabled_schedule_idx on public.offers (starts_at, ends_at) where is_enabled;
create trigger offers_set_updated_at
  before update on public.offers for each row execute function public.set_updated_at();
create trigger offers_audit_changes
  after insert or update on public.offers
  for each row execute function public.audit_admin_change('id', 'offer');
alter table public.offers enable row level security;
revoke all on public.offers from public, anon, authenticated;
grant select on public.offers to authenticated;
create policy "staff can read offers"
  on public.offers for select to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])));

alter table public.admin_audit_logs drop constraint admin_audit_logs_resource_type_check;
alter table public.admin_audit_logs add constraint admin_audit_logs_resource_type_check
  check (resource_type in (
    'product', 'product_variant', 'collection', 'product_media', 'collection_media',
    'site_content', 'staff_member', 'store_settings', 'offer', 'order'
  ));

-- Existing orders stay in place. Their totals remain NULL until staff have set a
-- delivery fee; new checkout orders always persist the complete price snapshot.
alter table public.orders
  add column discount_minor bigint not null default 0 check (discount_minor >= 0),
  add column quote_hash text check (quote_hash is null or quote_hash ~ '^[0-9a-f]{32}$'),
  add column payment_method text not null default 'manual' check (payment_method in ('manual', 'cod')),
  add column offer_id uuid references public.offers(id) on delete set null,
  add column offer_name_snapshot text,
  add column offer_discount_basis_points integer,
  add column payment_refunded_at timestamptz,
  add column payment_refund_note text;
alter table public.orders drop column total_minor;
alter table public.orders add column total_minor bigint generated always as (
  case when delivery_fee_minor is null then null
    else subtotal_minor - discount_minor + delivery_fee_minor end
) stored;
alter table public.orders add constraint orders_discount_lte_subtotal check (discount_minor <= subtotal_minor);
alter table public.orders drop constraint orders_status_check;
alter table public.orders add constraint orders_status_check check (
  status in ('pending_confirmation', 'confirmed', 'processing', 'packed', 'dispatched',
    'delivered', 'delivery_failed', 'cancelled')
);

alter table public.order_items
  add column set_count_snapshot smallint not null default 1 check (set_count_snapshot >= 1);
update public.order_items item
set set_count_snapshot = product.set_count::smallint
from public.product_variants variant
join public.products product on product.id = variant.product_id
where item.variant_id = variant.id;

alter table public.order_events drop constraint order_events_event_type_check;
alter table public.order_events add constraint order_events_event_type_check check (
  event_type in ('created', 'status_changed', 'delivery_fee_set', 'payment_recorded',
    'payment_refunded', 'delivery_failed', 'return_inspected')
);

alter table public.inventory_movements
  add column order_id uuid references public.orders(id) on delete restrict,
  add column order_item_id uuid references public.order_items(id) on delete restrict,
  add column return_inspection_id uuid;

create table public.return_inspections (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  idempotency_key uuid not null,
  sellable_quantity integer not null check (sellable_quantity >= 0),
  damaged_quantity integer not null check (damaged_quantity >= 0),
  missing_quantity integer not null check (missing_quantity >= 0),
  reason text not null check (length(trim(reason)) between 1 and 500),
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (order_item_id, idempotency_key),
  check (sellable_quantity + damaged_quantity + missing_quantity > 0)
);
create index return_inspections_item_idx on public.return_inspections (order_item_id, created_at);
alter table public.inventory_movements add constraint inventory_movements_return_inspection_fk
  foreign key (return_inspection_id) references public.return_inspections(id) on delete restrict;
alter table public.return_inspections enable row level security;
revoke all on public.return_inspections from public, anon, authenticated;
grant select on public.return_inspections to authenticated;
create policy "staff can read return inspections"
  on public.return_inspections for select to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])));

grant select (discount_minor, payment_method, offer_name_snapshot, offer_discount_basis_points,
  payment_refunded_at) on public.orders to authenticated;
grant select (total_minor) on public.orders to authenticated;
grant select (set_count_snapshot) on public.order_items to authenticated;
grant select (order_id, order_item_id, return_inspection_id)
  on public.inventory_movements to authenticated;

create or replace function public.set_order_item_size_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  select product.set_count::smallint, coalesce(nullif(variant.size_code, ''), 'Standard')
  into new.set_count_snapshot, new.variant_label
  from public.product_variants variant
  join public.products product on product.id = variant.product_id
  where variant.id = new.variant_id;
  if not found then
    raise exception 'The selected product size no longer exists' using errcode = 'P0002';
  end if;
  return new;
end;
$function$;
create trigger order_items_size_snapshot
  before insert on public.order_items for each row execute function public.set_order_item_size_snapshot();
revoke all on function public.set_order_item_size_snapshot() from public, anon, authenticated;

create or replace function public.transition_order(
  p_order_id uuid,
  p_next_status text,
  p_reason text
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_order public.orders%rowtype;
  reservation record;
  available integer;
  normalized_reason text := trim(coalesce(p_reason, ''));
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;
  if length(normalized_reason) not between 1 and 500 then
    raise exception 'A transition reason between 1 and 500 characters is required' using errcode = '22023';
  end if;
  if p_next_status not in ('confirmed', 'processing', 'packed', 'dispatched', 'delivered', 'cancelled') then
    raise exception 'Unsupported order status' using errcode = '22023';
  end if;

  select * into current_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  if current_order.status = p_next_status then return current_order.status; end if;

  if p_next_status = 'confirmed' and current_order.status = 'pending_confirmation' then
    perform variant.id
    from public.order_items item
    join public.product_variants variant on variant.id = item.variant_id
    where item.order_id = p_order_id
    order by variant.id
    for update of variant;

    for reservation in
      select item.variant_id, item.quantity, item.id as order_item_id
      from public.order_items item
      where item.order_id = p_order_id
      order by item.variant_id
    loop
      select variant.stock_on_hand - variant.reserved_quantity
        into available
      from public.product_variants variant
      where variant.id = reservation.variant_id;
      if available < reservation.quantity then
        raise exception 'Insufficient available stock for one or more order items' using errcode = '23514';
      end if;
    end loop;

    for reservation in
      select item.variant_id, item.quantity, item.id as order_item_id
      from public.order_items item
      where item.order_id = p_order_id
      order by item.variant_id
    loop
      update public.product_variants
      set reserved_quantity = reserved_quantity + reservation.quantity
      where id = reservation.variant_id;
      insert into public.stock_reservations (order_id, variant_id, quantity, status)
      values (p_order_id, reservation.variant_id, reservation.quantity, 'reserved');
      insert into public.inventory_movements (
        variant_id, movement_type, on_hand_delta, reserved_delta, reason, actor_user_id,
        order_id, order_item_id
      ) values (
        reservation.variant_id, 'reserved', 0, reservation.quantity, normalized_reason,
        (select auth.uid()), p_order_id, reservation.order_item_id
      );
    end loop;
  elsif p_next_status = 'processing' and current_order.status = 'confirmed' then
    null;
  elsif p_next_status = 'packed' and current_order.status = 'processing' then
    null;
  elsif p_next_status = 'dispatched' and current_order.status = 'packed' then
    for reservation in
      select stock.id, stock.variant_id, stock.quantity, item.id as order_item_id
      from public.stock_reservations stock
      join public.order_items item
        on item.order_id = stock.order_id and item.variant_id = stock.variant_id
      where stock.order_id = p_order_id and stock.status = 'reserved'
      order by stock.variant_id
      for update of stock
    loop
      update public.product_variants
      set stock_on_hand = stock_on_hand - reservation.quantity,
          reserved_quantity = reserved_quantity - reservation.quantity
      where id = reservation.variant_id;
      update public.stock_reservations set status = 'consumed' where id = reservation.id;
      insert into public.inventory_movements (
        variant_id, movement_type, on_hand_delta, reserved_delta, reason, actor_user_id,
        order_id, order_item_id
      ) values (
        reservation.variant_id, 'dispatched', -reservation.quantity, -reservation.quantity,
        normalized_reason, (select auth.uid()), p_order_id, reservation.order_item_id
      );
    end loop;
    if not exists (
      select 1 from public.stock_reservations stock
      where stock.order_id = p_order_id and stock.status = 'consumed'
    ) then
      raise exception 'Order has no active stock reservation' using errcode = '23514';
    end if;
  elsif p_next_status = 'delivered' and current_order.status = 'dispatched' then
    null;
  elsif p_next_status = 'cancelled' and current_order.status in (
    'pending_confirmation', 'confirmed', 'processing', 'packed'
  ) then
    for reservation in
      select stock.id, stock.variant_id, stock.quantity, item.id as order_item_id
      from public.stock_reservations stock
      join public.order_items item
        on item.order_id = stock.order_id and item.variant_id = stock.variant_id
      where stock.order_id = p_order_id and stock.status = 'reserved'
      order by stock.variant_id
      for update of stock
    loop
      update public.product_variants
      set reserved_quantity = reserved_quantity - reservation.quantity
      where id = reservation.variant_id;
      update public.stock_reservations set status = 'released' where id = reservation.id;
      insert into public.inventory_movements (
        variant_id, movement_type, on_hand_delta, reserved_delta, reason, actor_user_id,
        order_id, order_item_id
      ) values (
        reservation.variant_id, 'released', 0, -reservation.quantity, normalized_reason,
        (select auth.uid()), p_order_id, reservation.order_item_id
      );
    end loop;
  else
    raise exception 'Invalid order status transition' using errcode = '22023';
  end if;

  update public.orders set status = p_next_status where id = p_order_id;
  insert into public.order_events (order_id, actor_user_id, event_type, from_status, to_status, reason)
  values (p_order_id, (select auth.uid()), 'status_changed', current_order.status, p_next_status, normalized_reason);
  return p_next_status;
end;
$function$;

create or replace function public.get_active_storefront_offers(p_limit integer default 8)
returns table (
  id uuid, name text, target_type text, target_name text, target_slug text,
  minimum_sets smallint, discount_basis_points integer, ends_at timestamptz
)
language sql stable security definer set search_path = ''
as $function$
  select offer.id, offer.name, offer.target_type, product.title, product.slug,
    offer.minimum_sets, offer.discount_basis_points, offer.ends_at
  from public.offers offer
  join public.products product on offer.target_type = 'product' and product.id = offer.target_product_id
  where offer.is_enabled and (offer.starts_at is null or offer.starts_at <= now())
    and (offer.ends_at is null or offer.ends_at > now()) and product.status = 'published'
    and not exists (
      select 1 from public.product_collections link
      join public.collections fixture on fixture.id = link.collection_id
      where link.product_id = product.id and fixture.slug = 'uat-fixtures-not-for-sale'
    )
  union all
  select offer.id, offer.name, offer.target_type, collection.name, collection.slug,
    offer.minimum_sets, offer.discount_basis_points, offer.ends_at
  from public.offers offer
  join public.collections collection
    on offer.target_type = 'collection' and collection.id = offer.target_collection_id
  where offer.is_enabled and (offer.starts_at is null or offer.starts_at <= now())
    and (offer.ends_at is null or offer.ends_at > now()) and collection.status = 'published'
    and collection.slug <> 'uat-fixtures-not-for-sale'
  order by ends_at asc nulls last, discount_basis_points desc, name asc, id asc
  limit least(greatest(coalesce(p_limit, 8), 1), 12);
$function$;

create or replace function public.save_commerce_settings(p_whatsapp_number text, p_cod_enabled boolean)
returns void
language plpgsql security definer set search_path = ''
as $function$
declare
  normalized_number text := nullif(regexp_replace(coalesce(p_whatsapp_number, ''), '[^0-9]', '', 'g'), '');
begin
  if not public.has_admin_role(array['owner']) then
    raise exception 'Owner permission required' using errcode = '42501';
  end if;
  if normalized_number is not null and normalized_number !~ '^[1-9][0-9]{7,14}$' then
    raise exception 'Enter a WhatsApp number with country code and digits only' using errcode = '22023';
  end if;
  if p_cod_enabled and normalized_number is null then
    raise exception 'Set the verified WhatsApp number before enabling COD' using errcode = '22023';
  end if;
  update public.store_settings
  set whatsapp_number = normalized_number, cod_enabled = p_cod_enabled where singleton;
  if not found then raise exception 'Commerce settings row is missing' using errcode = 'P0002'; end if;
end;
$function$;

create or replace function public.save_offer(
  p_offer_id uuid, p_name text, p_target_type text, p_target_id uuid,
  p_minimum_sets smallint, p_discount_basis_points integer,
  p_starts_at timestamptz, p_ends_at timestamptz, p_is_enabled boolean
)
returns uuid
language plpgsql security definer set search_path = ''
as $function$
declare
  normalized_name text := trim(coalesce(p_name, ''));
  saved_id uuid;
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;
  if length(normalized_name) not between 1 and 120
    or p_target_type is null or p_target_type not in ('product', 'collection')
    or p_target_id is null or p_minimum_sets is null or p_minimum_sets not between 1 and 1000
    or p_discount_basis_points is null or p_discount_basis_points not between 1 and 10000
    or p_is_enabled is null
    or (p_starts_at is not null and p_ends_at is not null and p_ends_at <= p_starts_at) then
    raise exception 'Offer settings are invalid' using errcode = '22023';
  end if;
  if p_target_type = 'product' and not exists (select 1 from public.products where id = p_target_id) then
    raise exception 'Offer product target not found' using errcode = 'P0002';
  end if;
  if p_target_type = 'collection' and not exists (select 1 from public.collections where id = p_target_id) then
    raise exception 'Offer collection target not found' using errcode = 'P0002';
  end if;
  if p_offer_id is null then
    insert into public.offers (name, target_type, target_product_id, target_collection_id,
      minimum_sets, discount_basis_points, starts_at, ends_at, is_enabled)
    values (normalized_name, p_target_type,
      case when p_target_type = 'product' then p_target_id end,
      case when p_target_type = 'collection' then p_target_id end,
      p_minimum_sets, p_discount_basis_points, p_starts_at, p_ends_at, p_is_enabled)
    returning id into saved_id;
  else
    update public.offers set name = normalized_name, target_type = p_target_type,
      target_product_id = case when p_target_type = 'product' then p_target_id end,
      target_collection_id = case when p_target_type = 'collection' then p_target_id end,
      minimum_sets = p_minimum_sets, discount_basis_points = p_discount_basis_points,
      starts_at = p_starts_at, ends_at = p_ends_at, is_enabled = p_is_enabled
    where id = p_offer_id returning id into saved_id;
    if not found then raise exception 'Offer not found' using errcode = 'P0002'; end if;
  end if;
  return saved_id;
end;
$function$;

create or replace function public.quote_cart(p_items jsonb)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $function$
declare
  requested_count integer;
  matched_count integer;
  v_subtotal bigint;
  v_discount bigint := 0;
  v_delivery bigint;
  v_stock_ok boolean;
  v_delivery_ready boolean;
  v_cod_allowed boolean := false;
  v_whatsapp text;
  v_offer_id uuid;
  v_offer_name text;
  v_offer_bps integer;
  v_offer_eligible_subtotal bigint;
  v_quote_hash text;
  v_items jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Cart must contain between 1 and 20 selected sizes' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'Cart must contain between 1 and 20 selected sizes' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as r(variant_id uuid, quantity integer)
    where r.variant_id is null or r.quantity is null or r.quantity not between 1 and 99
  ) or exists (
    select r.variant_id from jsonb_to_recordset(p_items) as r(variant_id uuid, quantity integer)
    group by r.variant_id having count(*) > 1
  ) then
    raise exception 'Cart sizes or set quantities are invalid or repeated' using errcode = '22023';
  end if;
  select count(*) into requested_count
  from jsonb_to_recordset(p_items) as r(variant_id uuid, quantity integer);
  select count(*) into matched_count
  from jsonb_to_recordset(p_items) as r(variant_id uuid, quantity integer)
  join public.product_variants variant on variant.id = r.variant_id
  join public.products product on product.id = variant.product_id
  where variant.is_active and product.status = 'published';
  if matched_count <> requested_count then
    raise exception 'A selected size is no longer published' using errcode = 'P0002';
  end if;

  with requested as (
    select r.variant_id, r.quantity
    from jsonb_to_recordset(p_items) as r(variant_id uuid, quantity integer)
  )
  select sum(variant.price_minor::bigint * r.quantity), max(product.delivery_fee_minor::bigint),
    bool_and(variant.stock_on_hand - variant.reserved_quantity >= r.quantity),
    bool_and(product.delivery_fee_minor is not null),
    jsonb_agg(jsonb_build_object(
      'variant_id', variant.id, 'product_id', product.id, 'product_title', product.title,
      'variant_label', coalesce(nullif(variant.size_code, ''), 'Standard'), 'sku', variant.sku,
      'set_count', product.set_count, 'unit_price_minor', variant.price_minor, 'quantity', r.quantity,
      'line_total_minor', variant.price_minor::bigint * r.quantity,
      'quantity_available', variant.stock_on_hand - variant.reserved_quantity >= r.quantity
    ) order by product.title, variant.size_code, variant.sku)
  into v_subtotal, v_delivery, v_stock_ok, v_delivery_ready, v_items
  from requested r
  join public.product_variants variant on variant.id = r.variant_id
  join public.products product on product.id = variant.product_id;

  select settings.whatsapp_number, settings.cod_enabled and coalesce(bool_and(product.cod_enabled), false)
  into v_whatsapp, v_cod_allowed
  from public.store_settings settings
  cross join jsonb_to_recordset(p_items) as r(variant_id uuid, quantity integer)
  join public.product_variants variant on variant.id = r.variant_id
  join public.products product on product.id = variant.product_id
  where settings.singleton
  group by settings.whatsapp_number, settings.cod_enabled;

  select offer.id, offer.name, offer.discount_basis_points, eligible.subtotal_minor
  into v_offer_id, v_offer_name, v_offer_bps, v_offer_eligible_subtotal
  from public.offers offer
  cross join lateral (
    select sum(variant.price_minor::bigint * r.quantity) as subtotal_minor,
      sum(r.quantity)::integer as set_quantity
    from jsonb_to_recordset(p_items) as r(variant_id uuid, quantity integer)
    join public.product_variants variant on variant.id = r.variant_id
    join public.products product on product.id = variant.product_id
    where (offer.target_type = 'product' and product.id = offer.target_product_id)
      or (offer.target_type = 'collection' and exists (
        select 1 from public.product_collections link
        join public.collections collection on collection.id = link.collection_id
        where link.product_id = product.id and link.collection_id = offer.target_collection_id
          and collection.status = 'published'
      ))
  ) eligible
  where offer.is_enabled and (offer.starts_at is null or offer.starts_at <= now())
    and (offer.ends_at is null or offer.ends_at > now())
    and eligible.set_quantity >= offer.minimum_sets
  order by (eligible.subtotal_minor * offer.discount_basis_points) / 10000 desc,
    offer.created_at asc, offer.id asc
  limit 1;
  if v_offer_id is not null then
    v_discount := (v_offer_eligible_subtotal * v_offer_bps) / 10000;
  end if;

  v_quote_hash := md5(jsonb_build_object(
    'items', coalesce(v_items, '[]'::jsonb), 'subtotal_minor', coalesce(v_subtotal, 0),
    'discount_minor', v_discount, 'delivery_fee_minor', coalesce(v_delivery, 0),
    'delivery_fee_configured', coalesce(v_delivery_ready, false),
    'offer_id', v_offer_id, 'offer_name', v_offer_name, 'offer_bps', v_offer_bps,
    'cod_allowed', coalesce(v_cod_allowed, false)
  )::text);
  return jsonb_build_object(
    'items', coalesce(v_items, '[]'::jsonb), 'subtotal_minor', coalesce(v_subtotal, 0),
    'discount_minor', v_discount, 'delivery_fee_minor', coalesce(v_delivery, 0),
    'total_minor', coalesce(v_subtotal, 0) - v_discount + coalesce(v_delivery, 0),
    'offer_id', v_offer_id, 'offer_name', v_offer_name,
    'offer_discount_basis_points', v_offer_bps,
    'all_available', coalesce(v_stock_ok, false), 'stock_available', coalesce(v_stock_ok, false),
    'delivery_fee_configured', coalesce(v_delivery_ready, false),
    'cod_available', coalesce(v_cod_allowed, false), 'whatsapp_configured', v_whatsapp is not null,
    'online_payment_available', false, 'quote_hash', v_quote_hash
  );
end;
$function$;

drop function public.create_order_with_quote(jsonb, uuid, text, text, text, text, text, text, text, bigint, text, text);
create or replace function public.create_order_with_quote(
  p_items jsonb, p_idempotency_key uuid, p_customer_name text, p_customer_email text,
  p_customer_phone text, p_delivery_address text, p_delivery_city text,
  p_delivery_postal_code text, p_delivery_note text, p_confirmed_subtotal_minor bigint,
  p_confirmed_quote_hash text, p_guest_access_hash text default null,
  p_payment_method text default 'manual'
)
returns jsonb
language plpgsql security definer set search_path = ''
as $function$
declare
  quote jsonb;
  order_result jsonb;
  current_order public.orders%rowtype;
  order_id uuid;
begin
  if p_idempotency_key is null or p_payment_method is null
    or p_payment_method not in ('manual', 'cod') then
    raise exception 'Checkout key or payment choice is invalid' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 0));
  select * into current_order from public.orders where idempotency_key = p_idempotency_key for update;
  if found then
    order_result := public.create_order(p_items, p_idempotency_key, p_customer_name, p_customer_email,
      p_customer_phone, p_delivery_address, p_delivery_city, p_delivery_postal_code,
      p_delivery_note, p_confirmed_subtotal_minor, p_guest_access_hash);
    if current_order.payment_method <> p_payment_method or current_order.quote_hash is distinct from p_confirmed_quote_hash then
      raise exception 'Checkout key was already used with a different quote' using errcode = '23505';
    end if;
    return order_result || jsonb_build_object('total_minor', current_order.total_minor,
      'discount_minor', current_order.discount_minor, 'delivery_fee_minor', current_order.delivery_fee_minor);
  end if;

  perform variant.id
  from public.product_variants variant
  join public.products product on product.id = variant.product_id
  join jsonb_to_recordset(p_items) as r(variant_id uuid, quantity integer) on r.variant_id = variant.id
  where variant.is_active and product.status = 'published'
  order by variant.id for update of variant, product;
  perform 1 from public.offers where is_enabled order by id for share;
  perform 1 from public.store_settings where singleton for share;
  quote := public.quote_cart(p_items);
  if quote->>'quote_hash' is distinct from p_confirmed_quote_hash
    or (quote->>'subtotal_minor')::bigint is distinct from p_confirmed_subtotal_minor then
    raise exception 'The visible order quote changed; review the updated totals' using errcode = 'P0001';
  end if;
  if not (quote->>'all_available')::boolean then
    raise exception 'One or more sizes are no longer available' using errcode = '23514';
  end if;
  if not (quote->>'delivery_fee_configured')::boolean then
    raise exception 'Set a delivery fee for every product before checkout' using errcode = '22023';
  end if;
  if p_payment_method = 'cod' and not (quote->>'cod_available')::boolean then
    raise exception 'Cash on delivery is not available for all items in this order' using errcode = '22023';
  end if;

  order_result := public.create_order(p_items, p_idempotency_key, p_customer_name, p_customer_email,
    p_customer_phone, p_delivery_address, p_delivery_city, p_delivery_postal_code,
    p_delivery_note, p_confirmed_subtotal_minor, p_guest_access_hash);
  order_id := (order_result->>'id')::uuid;
  update public.orders set
    delivery_fee_minor = (quote->>'delivery_fee_minor')::bigint,
    discount_minor = (quote->>'discount_minor')::bigint,
    quote_hash = p_confirmed_quote_hash,
    payment_method = p_payment_method,
    offer_id = nullif(quote->>'offer_id', '')::uuid,
    offer_name_snapshot = nullif(quote->>'offer_name', ''),
    offer_discount_basis_points = nullif(quote->>'offer_discount_basis_points', '')::integer
  where id = order_id;
  return order_result || jsonb_build_object(
    'delivery_fee_minor', (quote->>'delivery_fee_minor')::bigint,
    'discount_minor', (quote->>'discount_minor')::bigint,
    'total_minor', (quote->>'total_minor')::bigint,
    'payment_method', p_payment_method
  );
end;
$function$;

create or replace function public.publish_product(p_product_id uuid)
returns void language plpgsql security definer set search_path = ''
as $function$
declare target_product public.products%rowtype;
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;
  select * into target_product from public.products where id = p_product_id for update;
  if not found then raise exception 'Product not found' using errcode = 'P0002'; end if;
  if target_product.delivery_fee_minor is null then
    raise exception 'Set a delivery fee or explicitly choose free delivery before publishing' using errcode = '22023';
  end if;
  if target_product.set_count < 2 then raise exception 'A product must sell a complete set' using errcode = '22023'; end if;
  if length(trim(target_product.title)) = 0 or length(trim(target_product.care_instructions)) = 0 then
    raise exception 'Product title and care instructions are required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.product_variants where product_id = p_product_id and is_active) then
    raise exception 'At least one active size is required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.product_media where product_id = p_product_id
    and media_type = 'image' and status in ('draft', 'published')) then
    raise exception 'At least one image is required' using errcode = '22023';
  end if;
  update public.product_media set status = 'published'
    where product_id = p_product_id and media_type = 'image' and status = 'draft';
  update public.products set status = 'published' where id = p_product_id;
end;
$function$;

create or replace function public.mark_order_delivery_failed(p_order_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = ''
as $function$
declare current_order public.orders%rowtype; normalized_reason text := trim(coalesce(p_reason, ''));
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;
  if length(normalized_reason) not between 1 and 500 then
    raise exception 'A delivery failure reason is required' using errcode = '22023';
  end if;
  select * into current_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  if current_order.status <> 'dispatched' then
    raise exception 'Only dispatched orders can be marked delivery failed' using errcode = '22023';
  end if;
  update public.orders set status = 'delivery_failed' where id = p_order_id;
  insert into public.order_events(order_id, actor_user_id, event_type, from_status, to_status, reason)
    values (p_order_id, (select auth.uid()), 'delivery_failed', current_order.status,
      'delivery_failed', normalized_reason);
end;
$function$;

create or replace function public.guard_paid_order_cancellation()
returns trigger language plpgsql set search_path = ''
as $function$
begin
  if new.status = 'cancelled' and old.payment_status = 'paid' and new.payment_status <> 'refunded' then
    raise exception 'Record the full refund before cancelling this paid order' using errcode = '23514';
  end if;
  return new;
end;
$function$;
create trigger orders_require_refund_before_cancel
  before update of status on public.orders
  for each row execute function public.guard_paid_order_cancellation();

create or replace function public.record_order_payment(p_order_id uuid, p_amount_minor bigint, p_reference text)
returns void language plpgsql security definer set search_path = ''
as $function$
declare current_order public.orders%rowtype; ref text := trim(coalesce(p_reference, ''));
begin
  if not public.has_admin_role(array['owner', 'staff']) then raise exception 'Insufficient privilege' using errcode = '42501'; end if;
  if length(ref) not between 1 and 200 then raise exception 'Enter a payment note or reference' using errcode = '22023'; end if;
  select * into current_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  if current_order.total_minor is null or p_amount_minor is distinct from current_order.total_minor then
    raise exception 'The recorded amount must match the confirmed order total' using errcode = '23514';
  end if;
  if current_order.payment_status = 'paid' then return; end if;
  if current_order.payment_status = 'refunded' or current_order.status in ('cancelled', 'pending_confirmation') then
    raise exception 'This order cannot accept a payment record' using errcode = '22023';
  end if;
  update public.orders set payment_status = 'paid' where id = p_order_id;
  insert into public.order_events(order_id, actor_user_id, event_type, reason)
    values (p_order_id, (select auth.uid()), 'payment_recorded', ref);
end;
$function$;

create or replace function public.record_order_refund(p_order_id uuid, p_amount_minor bigint, p_note text)
returns void language plpgsql security definer set search_path = ''
as $function$
declare current_order public.orders%rowtype; normalized_note text := trim(coalesce(p_note, ''));
begin
  if not public.has_admin_role(array['owner']) then raise exception 'Owner permission required' using errcode = '42501'; end if;
  if length(normalized_note) not between 1 and 500 then raise exception 'Record the refund reason and reference' using errcode = '22023'; end if;
  select * into current_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  if current_order.payment_status = 'refunded' then
    if current_order.payment_refunded_at is not null
      and p_amount_minor is not distinct from current_order.total_minor then
      return;
    end if;
    raise exception 'The repeat refund request does not match the recorded full refund' using errcode = '23514';
  end if;
  if current_order.payment_status <> 'paid' or current_order.total_minor is null
    or p_amount_minor is distinct from current_order.total_minor then
    raise exception 'Only the full recorded payment can be refunded' using errcode = '23514';
  end if;
  update public.orders set payment_status = 'refunded', payment_refunded_at = now(),
    payment_refund_note = normalized_note where id = p_order_id;
  insert into public.order_events(order_id, actor_user_id, event_type, reason)
    values (p_order_id, (select auth.uid()), 'payment_refunded', normalized_note);
end;
$function$;

create or replace function public.record_return_inspection(
  p_order_item_id uuid, p_idempotency_key uuid, p_sellable_quantity integer,
  p_damaged_quantity integer, p_missing_quantity integer, p_reason text
)
returns void language plpgsql security definer set search_path = ''
as $function$
declare
  item_row public.order_items%rowtype;
  order_row public.orders%rowtype;
  recorded public.return_inspections%rowtype;
  already_inspected integer;
  new_inspection_id uuid;
  normalized_reason text := trim(coalesce(p_reason, ''));
begin
  if not public.has_admin_role(array['owner', 'staff']) then raise exception 'Insufficient privilege' using errcode = '42501'; end if;
  if p_idempotency_key is null or p_sellable_quantity is null or p_sellable_quantity < 0
    or p_damaged_quantity is null or p_damaged_quantity < 0
    or p_missing_quantity is null or p_missing_quantity < 0
    or p_sellable_quantity + p_damaged_quantity + p_missing_quantity = 0
    or length(normalized_reason) not between 1 and 500 then
    raise exception 'Return inspection details are invalid' using errcode = '22023';
  end if;
  select * into item_row from public.order_items where id = p_order_item_id for update;
  if not found then raise exception 'Order line not found' using errcode = 'P0002'; end if;
  select * into order_row from public.orders where id = item_row.order_id for update;
  if order_row.status not in ('delivery_failed', 'delivered') then
    raise exception 'Inspect stock only after delivery failure or delivery' using errcode = '22023';
  end if;
  select * into recorded from public.return_inspections
    where order_item_id = p_order_item_id and idempotency_key = p_idempotency_key;
  if found then
    if recorded.sellable_quantity <> p_sellable_quantity or recorded.damaged_quantity <> p_damaged_quantity
      or recorded.missing_quantity <> p_missing_quantity or recorded.reason <> normalized_reason then
      raise exception 'Inspection key was used with different quantities' using errcode = '23505';
    end if;
    return;
  end if;
  if p_sellable_quantity::bigint + p_damaged_quantity::bigint + p_missing_quantity::bigint <> item_row.quantity then
    raise exception 'Classify every dispatched set as sellable, damaged or missing' using errcode = '23514';
  end if;
  select coalesce(sum(sellable_quantity + damaged_quantity + missing_quantity), 0)
    into already_inspected from public.return_inspections where order_item_id = p_order_item_id;
  if already_inspected > 0 then
    raise exception 'This order line has already been inspected' using errcode = '23514';
  end if;
  insert into public.return_inspections(order_item_id, idempotency_key, sellable_quantity,
    damaged_quantity, missing_quantity, reason, actor_user_id)
  values (p_order_item_id, p_idempotency_key, p_sellable_quantity, p_damaged_quantity,
    p_missing_quantity, normalized_reason, (select auth.uid())) returning id into new_inspection_id;
  if p_sellable_quantity > 0 then
    update public.product_variants set stock_on_hand = stock_on_hand + p_sellable_quantity
      where id = item_row.variant_id;
    insert into public.inventory_movements(variant_id, movement_type, on_hand_delta, reserved_delta,
      reason, actor_user_id, order_id, order_item_id, return_inspection_id)
    values (item_row.variant_id, 'restocked', p_sellable_quantity, 0, normalized_reason,
      (select auth.uid()), item_row.order_id, item_row.id, new_inspection_id);
  end if;
  insert into public.order_events(order_id, actor_user_id, event_type, reason)
    values (item_row.order_id, (select auth.uid()), 'return_inspected', normalized_reason);
end;
$function$;

create or replace function public.get_guest_order(p_reference text, p_access_hash text)
returns jsonb language sql stable security definer set search_path = ''
as $function$
  select jsonb_build_object(
    'order', to_jsonb(order_row) - 'guest_access_hash' - 'idempotency_key'
      - 'idempotency_fingerprint' - 'payment_refund_note',
    'items', coalesce((select jsonb_agg(to_jsonb(item_row) - 'order_id' order by item_row.id)
      from public.order_items item_row where item_row.order_id = order_row.id), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object('event_type', event_row.event_type,
      'from_status', event_row.from_status, 'to_status', event_row.to_status,
      'created_at', event_row.created_at) order by event_row.created_at, event_row.id)
      from public.order_events event_row where event_row.order_id = order_row.id), '[]'::jsonb)
  )
  from public.orders order_row
  where (select auth.uid()) is null and order_row.customer_id is null
    and order_row.reference = p_reference and order_row.guest_access_hash = p_access_hash
    and order_row.guest_access_expires_at > now();
$function$;

revoke all on function public.get_active_storefront_offers(integer) from public;
revoke all on function public.save_commerce_settings(text, boolean) from public, anon;
revoke all on function public.save_offer(uuid, text, text, uuid, smallint, integer, timestamptz, timestamptz, boolean) from public, anon;
revoke all on function public.quote_cart(jsonb) from public;
revoke all on function public.create_order(jsonb, uuid, text, text, text, text, text, text, text, bigint, text) from public, anon, authenticated;
revoke all on function public.create_order_with_quote(jsonb, uuid, text, text, text, text, text, text, text, bigint, text, text, text) from public;
revoke all on function public.mark_order_delivery_failed(uuid, text) from public, anon;
revoke all on function public.record_order_payment(uuid, bigint, text) from public, anon;
revoke all on function public.record_order_refund(uuid, bigint, text) from public, anon;
revoke all on function public.record_return_inspection(uuid, uuid, integer, integer, integer, text) from public, anon;
revoke all on function public.get_guest_order(text, text) from public, authenticated;
grant execute on function public.get_active_storefront_offers(integer) to anon, authenticated;
grant execute on function public.save_commerce_settings(text, boolean) to authenticated;
grant execute on function public.save_offer(uuid, text, text, uuid, smallint, integer, timestamptz, timestamptz, boolean) to authenticated;
grant execute on function public.quote_cart(jsonb) to anon, authenticated;
grant execute on function public.create_order_with_quote(jsonb, uuid, text, text, text, text, text, text, text, bigint, text, text, text) to anon, authenticated;
grant execute on function public.mark_order_delivery_failed(uuid, text) to authenticated;
grant execute on function public.record_order_payment(uuid, bigint, text) to authenticated;
grant execute on function public.record_order_refund(uuid, bigint, text) to authenticated;
grant execute on function public.record_return_inspection(uuid, uuid, integer, integer, integer, text) to authenticated;
grant execute on function public.get_guest_order(text, text) to anon;
