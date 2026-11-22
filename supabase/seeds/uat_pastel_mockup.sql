-- UAT ONLY: synthetic catalogue data based on the owner's six-colour mockup collage.
-- Never apply to live. No supplier sizes, diameters, real prices, or real stock are implied.

insert into public.products (
  id, slug, title, description, material, care_instructions, set_count, status, sort_order
)
values (
  'a2000000-0000-4000-8000-000000000003',
  'uat-pastel-candy-mockup-not-for-sale',
  'UAT sample mockup — pastel candy stripe bangle sets',
  'Synthetic UAT listing for catalogue, cart, order, and inventory testing only. The image is a six-colour mockup collage and does not represent a verified physical item, size, price, or availability.',
  'Synthetic UAT data',
  'UAT fixture only; this is not product care guidance.',
  1,
  'draft',
  9002
)
on conflict (slug) do nothing;

insert into public.product_collections (product_id, collection_id)
select product.id, collection.id
from public.products as product
join public.collections as collection on collection.slug = 'uat-fixtures-not-for-sale'
where product.slug = 'uat-pastel-candy-mockup-not-for-sale'
on conflict (product_id, collection_id) do nothing;

with colours (code, colour_name) as (
  values
    ('MINT-ROSE', 'Mint and rose'),
    ('LEMON', 'Lemon cream'),
    ('LAVENDER', 'Lavender and mint'),
    ('CORN-BLUE', 'Cornflower blue'),
    ('CORAL', 'Coral rose'),
    ('AQUA', 'Aqua and pink')
),
sizes (size_code) as (
  values ('2-4'), ('2-6'), ('2-8')
),
variants as (
  select
    row_number() over (order by colour.code, size.size_code) as row_number,
    'UAT-PASTEL-' || colour.code || '-' || replace(size.size_code, '-', '') as sku,
    size.size_code,
    colour.colour_name
  from colours as colour
  cross join sizes as size
)
insert into public.product_variants (
  id, product_id, sku, size_code, inner_diameter_mm, colour_name,
  price_minor, stock_on_hand, is_active
)
select
  ('a4000000-0000-4000-8000-' || lpad(variant.row_number::text, 12, '0'))::uuid,
  'a2000000-0000-4000-8000-000000000003'::uuid,
  variant.sku,
  variant.size_code,
  null,
  variant.colour_name,
  150000,
  2,
  true
from variants as variant
on conflict (sku) do nothing;
