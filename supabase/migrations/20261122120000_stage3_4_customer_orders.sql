-- Stage 3/4: customer profiles, persistent carts, checkout intents and stock transitions.

create table public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (length(full_name) <= 120),
  phone text not null default '' check (length(phone) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 99),
  updated_at timestamptz not null default now(),
  primary key (user_id, variant_id)
);

create index cart_items_variant_idx on public.cart_items (variant_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_id uuid references auth.users(id) on delete restrict,
  guest_access_hash text check (
    guest_access_hash is null or guest_access_hash ~ '^[0-9a-f]{64}$'
  ),
  guest_access_expires_at timestamptz,
  idempotency_key uuid not null unique,
  idempotency_fingerprint text not null check (idempotency_fingerprint ~ '^[0-9a-f]{32}$'),
  customer_name text not null check (length(trim(customer_name)) between 1 and 120),
  customer_email text not null default '' check (length(customer_email) <= 254),
  customer_phone text not null check (length(trim(customer_phone)) between 5 and 40),
  delivery_address text not null check (length(trim(delivery_address)) between 1 and 300),
  delivery_city text not null check (length(trim(delivery_city)) between 1 and 100),
  delivery_postal_code text not null default '' check (length(delivery_postal_code) <= 24),
  delivery_note text not null default '' check (length(delivery_note) <= 500),
  currency text not null default 'LKR' check (currency = 'LKR'),
  subtotal_minor bigint not null check (subtotal_minor > 0),
  delivery_fee_minor bigint check (delivery_fee_minor is null or delivery_fee_minor >= 0),
  total_minor bigint generated always as (
    case when delivery_fee_minor is null then null else subtotal_minor + delivery_fee_minor end
  ) stored,
  status text not null default 'pending_confirmation' check (
    status in ('pending_confirmation', 'confirmed', 'processing', 'packed', 'dispatched', 'delivered', 'cancelled')
  ),
  payment_status text not null default 'unpaid' check (
    payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded')
  ),
  channel text not null default 'whatsapp' check (channel = 'whatsapp'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (customer_id is null and guest_access_hash is not null and guest_access_expires_at is not null)
    or (customer_id is not null and guest_access_hash is null and guest_access_expires_at is null)
  )
);

create index orders_customer_created_idx on public.orders (customer_id, created_at desc, id desc)
  where customer_id is not null;
create index orders_status_created_idx on public.orders (status, created_at, id);
create index orders_guest_access_idx on public.orders (reference, guest_access_hash)
  where customer_id is null;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  product_title text not null,
  sku text not null,
  variant_label text not null,
  unit_price_minor integer not null check (unit_price_minor > 0),
  quantity integer not null check (quantity between 1 and 99),
  line_total_minor bigint generated always as (unit_price_minor::bigint * quantity::bigint) stored,
  created_at timestamptz not null default now(),
  unique (order_id, variant_id)
);

create index order_items_order_idx on public.order_items (order_id, id);
create index order_items_variant_idx on public.order_items (variant_id);

create table public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  status text not null check (status in ('reserved', 'released', 'consumed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, variant_id)
);

create index stock_reservations_variant_status_idx
  on public.stock_reservations (variant_id, status, order_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('created', 'status_changed', 'delivery_fee_set')),
  from_status text,
  to_status text,
  reason text not null check (length(trim(reason)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index order_events_order_created_idx on public.order_events (order_id, created_at, id);

create sequence public.order_reference_seq;
revoke all on sequence public.order_reference_seq from public, anon, authenticated;

create or replace function public.touch_customer_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.customer_profiles (user_id, full_name)
  values (
    new.id,
    left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$function$;

revoke all on function public.touch_customer_profile() from public, anon, authenticated;
create trigger auth_user_customer_profile
  after insert on auth.users
  for each row execute function public.touch_customer_profile();

insert into public.customer_profiles (user_id, full_name)
select auth_user.id, left(trim(coalesce(auth_user.raw_user_meta_data ->> 'full_name', '')), 120)
from auth.users as auth_user
on conflict (user_id) do nothing;

create or replace function public.set_customer_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

create trigger customer_profiles_set_updated_at
  before update on public.customer_profiles
  for each row execute function public.set_customer_profile_updated_at();

create trigger cart_items_set_updated_at
  before update on public.cart_items
  for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create trigger stock_reservations_set_updated_at
  before update on public.stock_reservations
  for each row execute function public.set_updated_at();

create or replace function public.quote_cart(p_items jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  item_count integer;
  matched_count integer;
  quote_items jsonb;
  subtotal bigint;
  all_available boolean;
begin
  if coalesce(jsonb_typeof(p_items), '') <> 'array' then
    raise exception 'Cart must be a JSON array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'Cart must contain between 1 and 20 variants' using errcode = '22023';
  end if;

  select count(*) into item_count
  from jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer);

  if item_count <> jsonb_array_length(p_items)
    or exists (
      select 1
      from jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer)
      where requested.variant_id is null or requested.quantity is null
        or requested.quantity not between 1 and 99
    )
    or (select count(distinct requested.variant_id)
        from jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer)) <> item_count then
    raise exception 'Cart contains invalid or duplicate variants' using errcode = '22023';
  end if;

  select
    count(*),
    coalesce(sum(variant.price_minor::bigint * requested.quantity::bigint), 0),
    coalesce(bool_and(variant.stock_on_hand - variant.reserved_quantity >= requested.quantity), false),
    coalesce(jsonb_agg(jsonb_build_object(
      'variant_id', variant.id,
      'product_title', product.title,
      'variant_label', concat_ws(' · ', nullif(variant.size_code, ''), variant.colour_name),
      'unit_price_minor', variant.price_minor,
      'quantity', requested.quantity,
      'line_total_minor', variant.price_minor::bigint * requested.quantity::bigint,
      'quantity_available', variant.stock_on_hand - variant.reserved_quantity >= requested.quantity
    ) order by variant.id), '[]'::jsonb)
  into matched_count, subtotal, all_available, quote_items
  from jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer)
  join public.product_variants as variant on variant.id = requested.variant_id
  join public.products as product on product.id = variant.product_id
  where variant.is_active and product.status = 'published';

  if matched_count <> item_count then
    raise exception 'One or more cart variants are unavailable' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'items', quote_items,
    'subtotal_minor', subtotal,
    'all_available', all_available
  );
end;
$function$;

create or replace function public.replace_customer_cart(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
  item_count integer;
begin
  if current_user_id is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if coalesce(jsonb_typeof(p_items), '') <> 'array' then
    raise exception 'Cart must be a JSON array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 20 then
    raise exception 'Cart must contain no more than 20 variants' using errcode = '22023';
  end if;

  select count(*) into item_count
  from jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer);
  if item_count <> jsonb_array_length(p_items)
    or exists (
      select 1
      from jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer)
      where requested.variant_id is null or requested.quantity is null
        or requested.quantity not between 1 and 99
    )
    or (select count(distinct requested.variant_id)
        from jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer)) <> item_count then
    raise exception 'Cart contains invalid or duplicate variants' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer)
    left join public.product_variants as variant on variant.id = requested.variant_id
    left join public.products as product on product.id = variant.product_id
    where variant.id is null or not variant.is_active or product.status <> 'published'
  ) then
    raise exception 'Cart contains an unavailable variant' using errcode = 'P0002';
  end if;

  delete from public.cart_items where user_id = current_user_id;
  insert into public.cart_items (user_id, variant_id, quantity)
  select current_user_id, requested.variant_id, requested.quantity
  from jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer);

  return coalesce((
    select jsonb_agg(jsonb_build_object('variant_id', item.variant_id, 'quantity', item.quantity)
      order by item.variant_id)
    from public.cart_items as item
    where item.user_id = current_user_id
  ), '[]'::jsonb);
end;
$function$;

create or replace function public.create_order(
  p_items jsonb,
  p_idempotency_key uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_delivery_address text,
  p_delivery_city text,
  p_delivery_postal_code text,
  p_delivery_note text,
  p_confirmed_subtotal_minor bigint,
  p_guest_access_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
  normalized_name text := trim(coalesce(p_customer_name, ''));
  normalized_email text := lower(trim(coalesce(p_customer_email, '')));
  normalized_phone text := trim(coalesce(p_customer_phone, ''));
  normalized_address text := trim(coalesce(p_delivery_address, ''));
  normalized_city text := trim(coalesce(p_delivery_city, ''));
  normalized_postal text := trim(coalesce(p_delivery_postal_code, ''));
  normalized_note text := trim(coalesce(p_delivery_note, ''));
  canonical_items jsonb;
  current_fingerprint text;
  current_order public.orders%rowtype;
  quote jsonb;
  new_order_id uuid;
  new_reference text;
  row_count integer;
begin
  if p_idempotency_key is null then
    raise exception 'Checkout key is required' using errcode = '22023';
  end if;
  if length(normalized_name) not between 1 and 120
    or length(normalized_phone) not between 5 and 40
    or length(normalized_email) > 254
    or (normalized_email <> '' and normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
    or length(normalized_address) not between 1 and 300
    or length(normalized_city) not between 1 and 100
    or length(normalized_postal) > 24
    or length(normalized_note) > 500 then
    raise exception 'Contact or delivery details are invalid' using errcode = '22023';
  end if;
  if current_user_id is null then
    if coalesce(p_guest_access_hash, '') !~ '^[0-9a-f]{64}$' then
      raise exception 'Guest order access could not be established' using errcode = '22023';
    end if;
  elsif p_guest_access_hash is not null then
    raise exception 'Signed-in orders do not use guest access' using errcode = '22023';
  end if;
  if coalesce(jsonb_typeof(p_items), '') <> 'array' then
    raise exception 'Cart must be a JSON array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'Cart must contain between 1 and 20 variants' using errcode = '22023';
  end if;

  select jsonb_agg(jsonb_build_object('variant_id', requested.variant_id, 'quantity', requested.quantity)
      order by requested.variant_id), count(*)
  into canonical_items, row_count
  from jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer);
  if row_count <> jsonb_array_length(p_items)
    or exists (
      select 1
      from jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer)
      where requested.variant_id is null or requested.quantity is null
        or requested.quantity not between 1 and 99
    )
    or (select count(distinct requested.variant_id)
        from jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer)) <> row_count then
    raise exception 'Cart contains invalid or duplicate variants' using errcode = '22023';
  end if;

  current_fingerprint := md5(jsonb_build_object(
    'customer_id', current_user_id,
    'items', canonical_items,
    'customer_name', normalized_name,
    'customer_email', normalized_email,
    'customer_phone', normalized_phone,
    'delivery_address', normalized_address,
    'delivery_city', normalized_city,
    'delivery_postal_code', normalized_postal,
    'delivery_note', normalized_note
  )::text);

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 0));
  select * into current_order from public.orders where idempotency_key = p_idempotency_key for update;
  if found then
    if current_order.idempotency_fingerprint <> current_fingerprint then
      raise exception 'Checkout key was already used with different order details' using errcode = '23505';
    end if;
    return jsonb_build_object(
      'id', current_order.id,
      'reference', current_order.reference,
      'status', current_order.status,
      'payment_status', current_order.payment_status,
      'subtotal_minor', current_order.subtotal_minor,
      'delivery_fee_minor', current_order.delivery_fee_minor,
      'total_minor', current_order.total_minor,
      'replayed', true
    );
  end if;

  -- Lock every requested SKU in one consistent order, then recheck availability.
  perform variant.id
  from public.product_variants as variant
  join public.products as product on product.id = variant.product_id
  join jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer)
    on requested.variant_id = variant.id
  where variant.is_active and product.status = 'published'
  order by variant.id
  for update of variant;

  quote := public.quote_cart(p_items);
  if (quote ->> 'subtotal_minor')::bigint is distinct from p_confirmed_subtotal_minor then
    raise exception 'Price changed; review the updated cart before ordering' using errcode = 'P0001';
  end if;
  if not (quote ->> 'all_available')::boolean then
    raise exception 'One or more quantities are no longer available' using errcode = '23514';
  end if;

  new_order_id := gen_random_uuid();
  new_reference := 'LKC-' || to_char(now() at time zone 'UTC', 'YYMMDD') || '-' ||
    lpad(nextval('public.order_reference_seq')::text, 6, '0');

  insert into public.orders (
    id, reference, customer_id, guest_access_hash, guest_access_expires_at,
    idempotency_key, idempotency_fingerprint, customer_name, customer_email,
    customer_phone, delivery_address, delivery_city, delivery_postal_code,
    delivery_note, subtotal_minor, status, payment_status, channel
  ) values (
    new_order_id, new_reference, current_user_id, p_guest_access_hash,
    case when current_user_id is null then now() + interval '30 days' else null end,
    p_idempotency_key, current_fingerprint, normalized_name, normalized_email,
    normalized_phone, normalized_address, normalized_city, normalized_postal,
    normalized_note, (quote ->> 'subtotal_minor')::bigint,
    'pending_confirmation', 'unpaid', 'whatsapp'
  );

  insert into public.order_items (
    order_id, variant_id, product_title, sku, variant_label, unit_price_minor, quantity
  )
  select
    new_order_id,
    variant.id,
    product.title,
    variant.sku,
    concat_ws(' · ', nullif(variant.size_code, ''), variant.colour_name),
    variant.price_minor,
    requested.quantity
  from jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer)
  join public.product_variants as variant on variant.id = requested.variant_id
  join public.products as product on product.id = variant.product_id
  where variant.is_active and product.status = 'published';

  if current_user_id is not null then
    delete from public.cart_items as cart_item
    using jsonb_to_recordset(p_items) as requested(variant_id uuid, quantity integer)
    where cart_item.user_id = current_user_id
      and cart_item.variant_id = requested.variant_id
      and cart_item.quantity = requested.quantity;
  end if;

  insert into public.order_events (order_id, actor_user_id, event_type, to_status, reason)
  values (new_order_id, current_user_id, 'created', 'pending_confirmation', 'Checkout intent submitted');

  return jsonb_build_object(
    'id', new_order_id,
    'reference', new_reference,
    'status', 'pending_confirmation',
    'payment_status', 'unpaid',
    'subtotal_minor', (quote ->> 'subtotal_minor')::bigint,
    'delivery_fee_minor', null,
    'total_minor', null,
    'replayed', false
  );
end;
$function$;

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
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if current_order.status = p_next_status then
    return current_order.status;
  end if;

  if p_next_status = 'confirmed' and current_order.status = 'pending_confirmation' then
    perform variant.id
    from public.order_items as item
    join public.product_variants as variant on variant.id = item.variant_id
    where item.order_id = p_order_id
    order by variant.id
    for update of variant;

    for reservation in
      select item.variant_id, item.quantity
      from public.order_items as item
      where item.order_id = p_order_id
      order by item.variant_id
    loop
      select variant.stock_on_hand - variant.reserved_quantity
        into available
      from public.product_variants as variant
      where variant.id = reservation.variant_id;
      if available < reservation.quantity then
        raise exception 'Insufficient available stock for one or more order items' using errcode = '23514';
      end if;
    end loop;

    for reservation in
      select item.variant_id, item.quantity
      from public.order_items as item
      where item.order_id = p_order_id
      order by item.variant_id
    loop
      update public.product_variants
      set reserved_quantity = reserved_quantity + reservation.quantity
      where id = reservation.variant_id;
      insert into public.stock_reservations (order_id, variant_id, quantity, status)
      values (p_order_id, reservation.variant_id, reservation.quantity, 'reserved');
      insert into public.inventory_movements (
        variant_id, movement_type, on_hand_delta, reserved_delta, reason, actor_user_id
      ) values (
        reservation.variant_id, 'reserved', 0, reservation.quantity, normalized_reason, (select auth.uid())
      );
    end loop;
  elsif p_next_status = 'processing' and current_order.status = 'confirmed' then
    null;
  elsif p_next_status = 'packed' and current_order.status = 'processing' then
    null;
  elsif p_next_status = 'dispatched' and current_order.status = 'packed' then
    for reservation in
      select stock.id, stock.variant_id, stock.quantity
      from public.stock_reservations as stock
      where stock.order_id = p_order_id and stock.status = 'reserved'
      order by stock.variant_id
      for update
    loop
      update public.product_variants
      set stock_on_hand = stock_on_hand - reservation.quantity,
          reserved_quantity = reserved_quantity - reservation.quantity
      where id = reservation.variant_id;
      update public.stock_reservations
      set status = 'consumed'
      where id = reservation.id;
      insert into public.inventory_movements (
        variant_id, movement_type, on_hand_delta, reserved_delta, reason, actor_user_id
      ) values (
        reservation.variant_id, 'dispatched', -reservation.quantity, -reservation.quantity,
        normalized_reason, (select auth.uid())
      );
    end loop;
    if not exists (
      select 1 from public.stock_reservations as stock
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
      select stock.id, stock.variant_id, stock.quantity
      from public.stock_reservations as stock
      where stock.order_id = p_order_id and stock.status = 'reserved'
      order by stock.variant_id
      for update
    loop
      update public.product_variants
      set reserved_quantity = reserved_quantity - reservation.quantity
      where id = reservation.variant_id;
      update public.stock_reservations set status = 'released' where id = reservation.id;
      insert into public.inventory_movements (
        variant_id, movement_type, on_hand_delta, reserved_delta, reason, actor_user_id
      ) values (
        reservation.variant_id, 'released', 0, -reservation.quantity, normalized_reason, (select auth.uid())
      );
    end loop;
  else
    raise exception 'Invalid order status transition' using errcode = '22023';
  end if;

  update public.orders set status = p_next_status where id = p_order_id;
  insert into public.order_events (
    order_id, actor_user_id, event_type, from_status, to_status, reason
  ) values (
    p_order_id, (select auth.uid()), 'status_changed', current_order.status, p_next_status, normalized_reason
  );
  return p_next_status;
end;
$function$;

create or replace function public.set_order_delivery_fee(
  p_order_id uuid,
  p_delivery_fee_minor bigint,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_order public.orders%rowtype;
  normalized_reason text := trim(coalesce(p_reason, ''));
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;
  if p_delivery_fee_minor is null or p_delivery_fee_minor < 0
    or length(normalized_reason) not between 1 and 500 then
    raise exception 'A non-negative delivery fee and reason are required' using errcode = '22023';
  end if;

  select * into current_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if current_order.status in ('dispatched', 'delivered', 'cancelled') then
    raise exception 'Delivery fee cannot be changed after fulfilment or cancellation' using errcode = '22023';
  end if;

  update public.orders set delivery_fee_minor = p_delivery_fee_minor where id = p_order_id;
  insert into public.order_events (order_id, actor_user_id, event_type, reason)
  values (p_order_id, (select auth.uid()), 'delivery_fee_set', normalized_reason);
end;
$function$;

create or replace function public.get_guest_order(p_reference text, p_access_hash text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'order', to_jsonb(order_row) - 'guest_access_hash' - 'idempotency_key' - 'idempotency_fingerprint',
    'items', coalesce((
      select jsonb_agg(to_jsonb(item_row) - 'order_id' order by item_row.id)
      from public.order_items as item_row
      where item_row.order_id = order_row.id
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'event_type', event_row.event_type,
        'from_status', event_row.from_status,
        'to_status', event_row.to_status,
        'created_at', event_row.created_at
      ) order by event_row.created_at, event_row.id)
      from public.order_events as event_row
      where event_row.order_id = order_row.id
    ), '[]'::jsonb)
  )
  from public.orders as order_row
  where (select auth.uid()) is null
    and order_row.customer_id is null
    and order_row.reference = p_reference
    and order_row.guest_access_hash = p_access_hash
    and order_row.guest_access_expires_at > now();
$function$;

alter table public.customer_profiles enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stock_reservations enable row level security;
alter table public.order_events enable row level security;

create policy "customers read own profile and staff read customer profiles"
  on public.customer_profiles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_admin_role(array['owner', 'staff'])));
create policy "customers update own profile"
  on public.customer_profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "customers read own cart"
  on public.cart_items for select to authenticated
  using (user_id = (select auth.uid()));
create policy "customers manage own published-variant cart"
  on public.cart_items for all to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.product_variants as variant
      join public.products as product on product.id = variant.product_id
      where variant.id = cart_items.variant_id and variant.is_active and product.status = 'published'
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.product_variants as variant
      join public.products as product on product.id = variant.product_id
      where variant.id = cart_items.variant_id and variant.is_active and product.status = 'published'
    )
  );

create policy "customers and staff read authorized orders"
  on public.orders for select to authenticated
  using (
    customer_id = (select auth.uid())
    or (select public.has_admin_role(array['owner', 'staff']))
  );
create policy "customers and staff read authorized order items"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.orders as order_row
      where order_row.id = order_items.order_id
        and (order_row.customer_id = (select auth.uid())
          or (select public.has_admin_role(array['owner', 'staff'])))
    )
  );
create policy "staff read stock reservations"
  on public.stock_reservations for select to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])));
create policy "customers and staff read authorized order events"
  on public.order_events for select to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])));

revoke all on public.customer_profiles, public.cart_items, public.orders,
  public.order_items, public.stock_reservations, public.order_events
  from public, anon, authenticated;

grant select (user_id, full_name, phone, created_at, updated_at)
  on public.customer_profiles to authenticated;
grant update (full_name, phone) on public.customer_profiles to authenticated;
grant select (user_id, variant_id, quantity, updated_at) on public.cart_items to authenticated;
grant insert (user_id, variant_id, quantity), update (quantity), delete
  on public.cart_items to authenticated;
grant select (
  id, reference, customer_id, customer_name, customer_email, customer_phone,
  delivery_address, delivery_city, delivery_postal_code, delivery_note, currency,
  subtotal_minor, delivery_fee_minor, total_minor, status, payment_status, channel,
  created_at, updated_at
) on public.orders to authenticated;
grant select (
  id, order_id, variant_id, product_title, sku, variant_label,
  unit_price_minor, quantity, line_total_minor, created_at
) on public.order_items to authenticated;
grant select (id, order_id, actor_user_id, event_type, from_status, to_status, reason, created_at)
  on public.order_events to authenticated;
grant select (id, order_id, variant_id, quantity, status, created_at, updated_at)
  on public.stock_reservations to authenticated;

revoke all on function public.quote_cart(jsonb) from public;
revoke all on function public.replace_customer_cart(jsonb) from public, anon;
revoke all on function public.create_order(jsonb, uuid, text, text, text, text, text, text, text, bigint, text) from public;
revoke all on function public.transition_order(uuid, text, text) from public, anon;
revoke all on function public.set_order_delivery_fee(uuid, bigint, text) from public, anon;
revoke all on function public.get_guest_order(text, text) from public, authenticated;
grant execute on function public.quote_cart(jsonb) to anon, authenticated;
grant execute on function public.replace_customer_cart(jsonb) to authenticated;
grant execute on function public.create_order(jsonb, uuid, text, text, text, text, text, text, text, bigint, text) to anon, authenticated;
grant execute on function public.transition_order(uuid, text, text) to authenticated;
grant execute on function public.set_order_delivery_fee(uuid, bigint, text) to authenticated;
grant execute on function public.get_guest_order(text, text) to anon;
