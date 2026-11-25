alter table public.products
  add column published_at timestamptz;

create or replace function public.set_product_published_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' then
    if new.status = 'published' then
      new.published_at := pg_catalog.now();
    else
      new.published_at := null;
    end if;
  elsif new.status = 'published' and old.status is distinct from 'published' then
    new.published_at := pg_catalog.now();
  elsif new.status <> 'published' then
    new.published_at := null;
  end if;

  return new;
end;
$function$;

create trigger products_set_published_at
before insert or update of status on public.products
for each row execute function public.set_product_published_at();

create index products_published_at_sort_idx
  on public.products (published_at desc nulls last, id)
  where status = 'published';

grant select (published_at) on public.products to anon, authenticated;
