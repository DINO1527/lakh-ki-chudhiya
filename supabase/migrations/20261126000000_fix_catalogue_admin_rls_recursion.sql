-- Keep publication completeness checks out of recursive row policies.
-- These SECURITY DEFINER helpers read only the related media and variant
-- existence needed by the policy, and require the signed-in staff role.
begin;

create schema if not exists private;
alter schema private owner to postgres;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.product_is_publishable(
  p_product_id uuid,
  p_delivery_fee_minor integer,
  p_set_count smallint,
  p_title text,
  p_care_instructions text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select (select auth.uid()) is not null
    and public.has_admin_role(array['owner', 'staff'])
    and p_delivery_fee_minor is not null
    and p_set_count >= 2
    and length(trim(coalesce(p_title, ''))) > 0
    and length(trim(coalesce(p_care_instructions, ''))) > 0
    and exists (
      select 1 from public.product_variants variant
      where variant.product_id = p_product_id and variant.is_active
    )
    and exists (
      select 1 from public.product_media media
      where media.product_id = p_product_id
        and media.media_type = 'image'
        and media.status in ('draft', 'published')
    );
$function$;

create or replace function private.collection_is_publishable(p_collection_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select (select auth.uid()) is not null
    and public.has_admin_role(array['owner', 'staff'])
    and exists (
      select 1 from public.collection_media media
      where media.collection_id = p_collection_id
        and media.status in ('draft', 'published')
    );
$function$;

revoke all on function private.product_is_publishable(uuid, integer, smallint, text, text)
  from public, anon, authenticated;
revoke all on function private.collection_is_publishable(uuid)
  from public, anon, authenticated;
grant execute on function private.product_is_publishable(uuid, integer, smallint, text, text)
  to authenticated;
grant execute on function private.collection_is_publishable(uuid)
  to authenticated;

drop policy "staff can manage products" on public.products;
create policy "staff can manage products"
  on public.products for all to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])))
  with check (
    (select public.has_admin_role(array['owner', 'staff']))
    and (
      status <> 'published'
      or (select private.product_is_publishable(
        id, delivery_fee_minor, set_count, title, care_instructions
      ))
    )
  );

drop policy "staff can manage collections" on public.collections;
create policy "staff can manage collections"
  on public.collections for all to authenticated
  using ((select public.has_admin_role(array['owner', 'staff'])))
  with check (
    (select public.has_admin_role(array['owner', 'staff']))
    and (
      status <> 'published'
      or (select private.collection_is_publishable(id))
    )
  );

commit;
