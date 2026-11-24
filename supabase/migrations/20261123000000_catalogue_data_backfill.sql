-- Data-only compatibility migration, committed before the schema constraints.
-- It preserves each variant ID, SKU and stock count while moving old colour
-- groups into their own products. It does not copy unlinked media between
-- colours. Ambiguous multi-colour galleries are archived and products are
-- drafted for staff review. Existing order snapshots remain unchanged.

-- The current composite image foreign key cannot move a variant-linked image
-- without rebuilding its constraint. Stop safely if one needs manual mapping.
do $migration$
begin
  if exists (
    select 1
    from public.product_media media
    join public.product_variants variant
      on variant.id = media.variant_id and variant.product_id = media.product_id
    where exists (
      select 1 from public.product_variants sibling
      where sibling.product_id = variant.product_id
      group by sibling.product_id
      having count(distinct sibling.colour_name) > 1
    )
  ) then
    raise exception 'A multi-colour product has variant-linked media. Map those images to reviewed colour products before applying the catalogue migration.'
      using errcode = '23514';
  end if;
end;
$migration$;

-- This is a synthetic, non-saleable UAT fixture; its known test set contains
-- five bangles. Real catalogue set counts are never inferred by this migration.
update public.products
set set_count = 5
where slug in ('uat-sample-bangle-not-for-sale', 'uat-draft-fixture-hidden')
  and set_count < 2;

do $migration$
declare
  product_row public.products%rowtype;
  colour_row record;
  base_colour text;
  active_colour_count integer;
  colour_slug text;
  candidate_slug text;
  colour_title text;
  new_product_id uuid;
  split_product_ids uuid[];
begin
  for product_row in
    select product.*
    from public.products product
    where exists (
      select 1 from public.product_variants variant
      where variant.product_id = product.id
      group by variant.product_id
      having count(distinct variant.colour_name) > 1
    )
    order by product.id
    for update
  loop
    select variant.colour_name
    into base_colour
    from public.product_variants variant
    where variant.product_id = product_row.id
    group by variant.colour_name
    order by count(*) filter (where variant.is_active) desc, variant.colour_name
    limit 1;

    select (count(distinct variant.colour_name) filter (where variant.is_active))::integer
    into active_colour_count
    from public.product_variants variant
    where variant.product_id = product_row.id;

    split_product_ids := array[product_row.id];
    update public.products
    set title = case
          when strpos(lower(title), lower(base_colour)) > 0 then title
          else title || ' — ' || base_colour
        end,
        status = case when coalesce(active_colour_count, 0) <> 1 then 'draft' else status end,
        updated_at = now()
    where id = product_row.id;

    for colour_row in
      select distinct variant.colour_name
      from public.product_variants variant
      where variant.product_id = product_row.id
      order by variant.colour_name
    loop
      if colour_row.colour_name = base_colour then
        continue;
      end if;

      colour_slug := trim(both '-' from regexp_replace(lower(colour_row.colour_name), '[^a-z0-9]+', '-', 'g'));
      if colour_slug = '' then
        colour_slug := 'colour-' || substr(md5(colour_row.colour_name), 1, 8);
      end if;
      candidate_slug := product_row.slug || '-' || colour_slug;
      if exists (select 1 from public.products where slug = candidate_slug) then
        candidate_slug := product_row.slug || '-' || colour_slug || '-' || substr(md5(colour_row.colour_name), 1, 8);
      end if;
      colour_title := case
        when strpos(lower(product_row.title), lower(colour_row.colour_name)) > 0 then product_row.title
        else product_row.title || ' — ' || colour_row.colour_name
      end;

      insert into public.products (slug, title, description, material, care_instructions,
        set_count, status, sort_order, created_at, updated_at)
      values (candidate_slug, colour_title, product_row.description, product_row.material,
        product_row.care_instructions, product_row.set_count, 'draft', product_row.sort_order,
        product_row.created_at, now())
      returning id into new_product_id;
      split_product_ids := array_append(split_product_ids, new_product_id);

      insert into public.product_collections (product_id, collection_id)
      select new_product_id, link.collection_id
      from public.product_collections link
      where link.product_id = product_row.id
      on conflict (product_id, collection_id) do nothing;

      update public.product_variants
      set product_id = new_product_id
      where product_id = product_row.id and colour_name = colour_row.colour_name;
    end loop;

    if active_colour_count > 1 then
      update public.product_media
      set status = 'archived'
      where product_id = any(split_product_ids) and variant_id is null;
    end if;
  end loop;

  update public.products product
  set title = case
        when strpos(lower(product.title), lower(colours.colour_name)) > 0 then product.title
        else product.title || ' — ' || colours.colour_name
      end,
      status = case when product.status = 'published' and product.set_count < 2 then 'draft' else product.status end,
      updated_at = now()
  from (
    select variant.product_id, min(variant.colour_name) as colour_name
    from public.product_variants variant
    group by variant.product_id
    having count(distinct variant.colour_name) = 1
  ) colours
  where product.id = colours.product_id;
end;
$migration$;

-- Collections had no media table before this release, so old published
-- collections must be held in draft until staff upload a real cover/gallery.
update public.collections
set status = 'draft', updated_at = now()
where status = 'published';

-- Hide products that fail the new set, size, or verified-media requirements.
-- Keep only the explicitly synthetic UAT checkout fixture queryable for tests.
update public.products product
set status = 'draft', updated_at = now()
where product.status = 'published'
  and product.slug <> 'uat-sample-bangle-not-for-sale'
  and (
    product.set_count < 2
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
