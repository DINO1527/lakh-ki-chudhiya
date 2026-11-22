-- UAT ONLY: synthetic, non-saleable catalogue fixtures.
-- Never apply this file to live or configure it as the default seed.sql.
-- Confirm the linked Supabase project reference is the owner's UAT project first.
-- Contains no real customer data, real products, photography, reviews, or credentials.

insert into public.collections (id, slug, name, description, status, sort_order)
values (
  'a1000000-0000-4000-8000-000000000001',
  'uat-fixtures-not-for-sale',
  'UAT Fixtures — NOT FOR SALE',
  'Synthetic catalogue entries used only for UAT verification.',
  'published',
  9000
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.products (
  id, slug, title, description, material,
  care_instructions, set_count, status, sort_order
)
values (
  'a2000000-0000-4000-8000-000000000001',
  'uat-sample-bangle-not-for-sale',
  'UAT Sample Bangle — NOT FOR SALE',
  'Synthetic UAT fixture for cart and order workflow tests only. It is not a real product or live sale.',
  'Synthetic test data',
  'No care guidance; this is a test fixture.',
  1,
  'published',
  9000
)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  material = excluded.material,
  care_instructions = excluded.care_instructions,
  set_count = excluded.set_count,
  status = excluded.status,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.product_collections (product_id, collection_id)
select p.id, c.id
from public.products p
join public.collections c on c.slug = 'uat-fixtures-not-for-sale'
where p.slug = 'uat-sample-bangle-not-for-sale'
on conflict (product_id, collection_id) do nothing;

insert into public.product_variants (
  id, product_id, sku, size_code, inner_diameter_mm, colour_name,
  price_minor, stock_on_hand, is_active
)
select v.id, p.id, v.sku, v.size_code, v.inner_diameter_mm, v.colour_name,
  v.price_minor, v.stock_on_hand, v.is_active
from public.products p
cross join (values
  ('a3000000-0000-4000-8000-000000000001'::uuid, 'UAT-SAMPLE-S', 'UAT-S', 50.00::numeric, 'Synthetic Ruby', 125000, 5, true),
  ('a3000000-0000-4000-8000-000000000002'::uuid, 'UAT-SAMPLE-M', 'UAT-M', 55.00::numeric, 'Synthetic Ruby', 145000, 0, true),
  ('a3000000-0000-4000-8000-000000000003'::uuid, 'UAT-SAMPLE-INACTIVE', 'UAT-X', 60.00::numeric, 'Synthetic Gold', 165000, 3, false)
) as v(id, sku, size_code, inner_diameter_mm, colour_name, price_minor, stock_on_hand, is_active)
where p.slug = 'uat-sample-bangle-not-for-sale'
on conflict (sku) do update set
  product_id = excluded.product_id,
  size_code = excluded.size_code,
  inner_diameter_mm = excluded.inner_diameter_mm,
  colour_name = excluded.colour_name,
  price_minor = excluded.price_minor,
  stock_on_hand = excluded.stock_on_hand,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.products (
  id, slug, title, description, material,
  care_instructions, set_count, status, sort_order
)
values (
  'a2000000-0000-4000-8000-000000000002',
  'uat-draft-fixture-hidden',
  'UAT Draft Fixture — Hidden',
  'Synthetic draft row used to confirm public RLS filtering.',
  'Synthetic test data',
  'Not applicable.',
  1,
  'draft',
  9001
)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  material = excluded.material,
  care_instructions = excluded.care_instructions,
  set_count = excluded.set_count,
  status = excluded.status,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.product_collections (product_id, collection_id)
select p.id, c.id
from public.products p
join public.collections c on c.slug = 'uat-fixtures-not-for-sale'
where p.slug = 'uat-draft-fixture-hidden'
on conflict (product_id, collection_id) do nothing;
