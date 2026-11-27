-- Store one private default delivery address for each customer account.
begin;

create table public.customer_default_addresses (
  user_id uuid primary key references auth.users(id) on delete cascade,
  address text not null check (length(trim(address)) between 1 and 300),
  city text not null check (length(trim(city)) between 1 and 100),
  postal_code text not null default '' check (length(postal_code) <= 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger customer_default_addresses_set_updated_at
  before update on public.customer_default_addresses
  for each row execute function public.set_updated_at();

alter table public.customer_default_addresses enable row level security;
revoke all on public.customer_default_addresses from public, anon, authenticated;
grant select on public.customer_default_addresses to authenticated;
grant insert (user_id, address, city, postal_code), update (address, city, postal_code), delete
  on public.customer_default_addresses to authenticated;

create policy "customers manage their own default delivery address"
  on public.customer_default_addresses for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Save account details and the optional default address in one transaction.
create or replace function public.save_customer_account_details(
  p_full_name text,
  p_phone text,
  p_delivery_address text,
  p_delivery_city text,
  p_delivery_postal_code text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  normalized_name text := pg_catalog.trim(coalesce(p_full_name, ''));
  normalized_phone text := pg_catalog.trim(coalesce(p_phone, ''));
  normalized_address text := pg_catalog.trim(coalesce(p_delivery_address, ''));
  normalized_city text := pg_catalog.trim(coalesce(p_delivery_city, ''));
  normalized_postal_code text := pg_catalog.trim(coalesce(p_delivery_postal_code, ''));
begin
  if actor_id is null then
    raise exception 'Sign in to update account details' using errcode = '42501';
  end if;
  if pg_catalog.length(normalized_name) not between 1 and 120
    or pg_catalog.length(normalized_phone) > 40
    or pg_catalog.length(normalized_postal_code) > 24
    or ((normalized_address = '') <> (normalized_city = ''))
    or (normalized_address <> '' and pg_catalog.length(normalized_address) > 300)
    or (normalized_city <> '' and pg_catalog.length(normalized_city) > 100) then
    raise exception 'Account details or delivery address are invalid' using errcode = '22023';
  end if;

  update public.customer_profiles
  set full_name = normalized_name, phone = normalized_phone
  where user_id = actor_id;
  if not found then
    raise exception 'Customer profile is not available' using errcode = 'P0002';
  end if;

  if normalized_address = '' then
    delete from public.customer_default_addresses where user_id = actor_id;
  else
    insert into public.customer_default_addresses (user_id, address, city, postal_code)
    values (actor_id, normalized_address, normalized_city, normalized_postal_code)
    on conflict (user_id) do update
      set address = excluded.address,
          city = excluded.city,
          postal_code = excluded.postal_code;
  end if;
end;
$function$;

revoke all on function public.save_customer_account_details(text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.save_customer_account_details(text, text, text, text, text)
  to authenticated;

commit;
