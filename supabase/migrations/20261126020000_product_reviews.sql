-- Verified customer reviews with moderation and product-level controls.
begin;

alter table public.products
  add column reviews_enabled boolean not null default true;

grant select (reviews_enabled) on public.products to anon, authenticated;

grant select (reviews_enabled) on public.products to anon, authenticated;
grant update (reviews_enabled) on public.products to authenticated;

create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (length(trim(comment)) between 10 and 2_000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  moderated_by uuid references auth.users(id) on delete restrict,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_reviews_moderation_state_check check (
    (status = 'pending' and moderated_by is null and moderated_at is null)
    or (status in ('approved', 'rejected') and moderated_by is not null and moderated_at is not null)
  )
);

create unique index product_reviews_order_item_uidx on public.product_reviews (order_item_id);
create index product_reviews_public_order_idx
  on public.product_reviews (product_id, created_at desc, id desc)
  where status = 'approved';
create index product_reviews_owner_order_idx on public.product_reviews (user_id, created_at desc, id desc);
create index product_reviews_moderation_idx on public.product_reviews (status, created_at, id);

create trigger product_reviews_set_updated_at
  before update on public.product_reviews
  for each row execute function public.set_updated_at();
create trigger product_reviews_audit_moderation
  after update of status on public.product_reviews
  for each row execute function public.audit_admin_change('id', 'product_review');

alter table public.product_reviews enable row level security;
revoke all on public.product_reviews from public, anon, authenticated;
grant select (id, product_id, rating, comment, status, created_at) on public.product_reviews to anon;
grant select on public.product_reviews to authenticated;

create policy "approved reviews for enabled public products are readable"
  on public.product_reviews for select to anon, authenticated
  using (
    status = 'approved'
    and exists (
      select 1 from public.products product_row
      where product_row.id = product_reviews.product_id
        and product_row.status = 'published'
        and product_row.reviews_enabled
    )
  );

create policy "customers can read their own reviews"
  on public.product_reviews for select to authenticated
  using (user_id = (select auth.uid()));

create policy "staff can read all product reviews"
  on public.product_reviews for select to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])));

-- Customers can review only an item in their own delivered order. Editing a review
-- sends it back to moderation. The unique order item key prevents duplicate reviews.
create or replace function public.submit_product_review(
  p_order_item_id uuid,
  p_rating smallint,
  p_comment text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  target_order_id uuid;
  target_product_id uuid;
  normalized_comment text := trim(coalesce(p_comment, ''));
  saved_review_id uuid;
begin
  if actor_id is null then
    raise exception 'Sign in to review a delivered order' using errcode = '42501';
  end if;
  if p_order_item_id is null or p_rating is null or p_rating not between 1 and 5
    or length(normalized_comment) not between 10 and 2_000 then
    raise exception 'Enter a rating and a comment between 10 and 2,000 characters'
      using errcode = '22023';
  end if;

  select order_row.id, product_row.id
    into target_order_id, target_product_id
  from public.order_items item
  join public.orders order_row on order_row.id = item.order_id
  join public.product_variants variant on variant.id = item.variant_id
  join public.products product_row on product_row.id = variant.product_id
  where item.id = p_order_item_id
    and order_row.customer_id = actor_id
    and order_row.status = 'delivered'
    and product_row.status = 'published'
    and product_row.reviews_enabled
  for share of item, order_row, product_row;

  if target_order_id is null or target_product_id is null then
    raise exception 'Reviews are available for delivered items that accept reviews'
      using errcode = '42501';
  end if;

  insert into public.product_reviews (
    order_item_id, order_id, product_id, user_id, rating, comment, status
  ) values (
    p_order_item_id, target_order_id, target_product_id, actor_id, p_rating, normalized_comment, 'pending'
  )
  on conflict (order_item_id) do update set
    rating = excluded.rating,
    comment = excluded.comment,
    status = 'pending',
    moderated_by = null,
    moderated_at = null
  where public.product_reviews.user_id = actor_id
    and public.product_reviews.product_id = target_product_id
  returning id into saved_review_id;

  if saved_review_id is null then
    raise exception 'This order item cannot be reviewed by this account'
      using errcode = '42501';
  end if;
  return saved_review_id;
end;
$function$;

revoke all on function public.submit_product_review(uuid, smallint, text) from public, anon, authenticated;
grant execute on function public.submit_product_review(uuid, smallint, text) to authenticated;

create or replace function public.moderate_product_review(p_review_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;
  if p_review_id is null or p_status is null or p_status not in ('approved', 'rejected') then
    raise exception 'Choose whether to approve or decline this review' using errcode = '22023';
  end if;

  update public.product_reviews
  set status = p_status,
      moderated_by = (select auth.uid()),
      moderated_at = now()
  where id = p_review_id;

  if not found then
    raise exception 'Review not found' using errcode = 'P0002';
  end if;
end;
$function$;

revoke all on function public.moderate_product_review(uuid, text) from public, anon, authenticated;
grant execute on function public.moderate_product_review(uuid, text) to authenticated;

-- Public summary returns only aggregate information for a published product.
create or replace function public.get_product_review_summary(p_product_id uuid)
returns table (average_rating numeric, review_count bigint)
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(round(avg(review.rating)::numeric, 2), 0), count(*)
  from public.product_reviews review
  join public.products product_row on product_row.id = review.product_id
  where review.product_id = p_product_id
    and review.status = 'approved'
    and product_row.status = 'published'
    and product_row.reviews_enabled
$function$;

revoke all on function public.get_product_review_summary(uuid) from public, anon, authenticated;
grant execute on function public.get_product_review_summary(uuid) to anon, authenticated;

alter table public.admin_audit_logs drop constraint admin_audit_logs_resource_type_check;
alter table public.admin_audit_logs add constraint admin_audit_logs_resource_type_check
  check (resource_type in (
    'product', 'product_variant', 'collection', 'product_media', 'collection_media',
    'site_content', 'staff_member', 'store_settings', 'offer', 'offer_media', 'order',
    'product_review'
  ));

commit;
