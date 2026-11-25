begin;

do $test$
declare
  product_id uuid;
  first_published_at timestamptz;
begin
  insert into public.products (slug, title, status)
  values ('homepage-publication-' || gen_random_uuid()::text, 'Publication timestamp check', 'draft')
  returning id into product_id;

  if (select published_at from public.products where id = product_id) is not null then
    raise exception 'Draft products must not have a publication timestamp';
  end if;

  update public.products set status = 'published' where id = product_id
  returning published_at into first_published_at;
  if first_published_at is null then
    raise exception 'Publishing a product must record a publication timestamp';
  end if;

  update public.products set title = 'Updated title' where id = product_id;
  if (select published_at from public.products where id = product_id) is distinct from first_published_at then
    raise exception 'Editing a published product must not change its publication timestamp';
  end if;

  update public.products set status = 'archived' where id = product_id;
  if (select published_at from public.products where id = product_id) is not null then
    raise exception 'Archiving a product must clear its publication timestamp';
  end if;

  update public.products set status = 'published' where id = product_id;
  if (select published_at from public.products where id = product_id) is null then
    raise exception 'Republishing a product must record a publication timestamp';
  end if;
end;
$test$;

rollback;
