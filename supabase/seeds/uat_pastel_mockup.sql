-- UAT ONLY: synthetic catalogue rows based on the owner's six-colour mockup.
-- Each colour is a separate draft product with size-only SKUs. No image,
-- supplier sizing, real price, or saleable stock is implied by these fixtures.

with colour_products (slug, title, code, sort_order) as (
  values
    ('uat-pastel-candy-mockup-not-for-sale', 'UAT pastel bangle mockup — Aqua and pink — NOT FOR SALE', 'AQUA', 9002),
    ('uat-pastel-candy-mockup-not-for-sale-coral-rose', 'UAT pastel bangle mockup — Coral rose — NOT FOR SALE', 'CORAL', 9003),
    ('uat-pastel-candy-mockup-not-for-sale-cornflower-blue', 'UAT pastel bangle mockup — Cornflower blue — NOT FOR SALE', 'CORN-BLUE', 9004),
    ('uat-pastel-candy-mockup-not-for-sale-lavender-and-mint', 'UAT pastel bangle mockup — Lavender and mint — NOT FOR SALE', 'LAVENDER', 9005),
    ('uat-pastel-candy-mockup-not-for-sale-lemon-cream', 'UAT pastel bangle mockup — Lemon cream — NOT FOR SALE', 'LEMON', 9006),
    ('uat-pastel-candy-mockup-not-for-sale-mint-and-rose', 'UAT pastel bangle mockup — Mint and rose — NOT FOR SALE', 'MINT-ROSE', 9007)
)
insert into public.products (
  slug, title, description, material, care_instructions, set_count, status, sort_order
)
select slug, title,
  'Synthetic UAT draft for catalogue and size-option checks only. Upload verified colour-specific product photos and set contents before publishing.',
  'Synthetic UAT data',
  'UAT fixture only; this is not product care guidance.',
  1, 'draft', sort_order
from colour_products
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
select product.id, collection.id
from public.products product
join public.collections collection on collection.slug = 'uat-fixtures-not-for-sale'
where product.slug in (
  'uat-pastel-candy-mockup-not-for-sale',
  'uat-pastel-candy-mockup-not-for-sale-coral-rose',
  'uat-pastel-candy-mockup-not-for-sale-cornflower-blue',
  'uat-pastel-candy-mockup-not-for-sale-lavender-and-mint',
  'uat-pastel-candy-mockup-not-for-sale-lemon-cream',
  'uat-pastel-candy-mockup-not-for-sale-mint-and-rose'
)
on conflict (product_id, collection_id) do nothing;

with colour_products (slug, code) as (
  values
    ('uat-pastel-candy-mockup-not-for-sale', 'AQUA'),
    ('uat-pastel-candy-mockup-not-for-sale-coral-rose', 'CORAL'),
    ('uat-pastel-candy-mockup-not-for-sale-cornflower-blue', 'CORN-BLUE'),
    ('uat-pastel-candy-mockup-not-for-sale-lavender-and-mint', 'LAVENDER'),
    ('uat-pastel-candy-mockup-not-for-sale-lemon-cream', 'LEMON'),
    ('uat-pastel-candy-mockup-not-for-sale-mint-and-rose', 'MINT-ROSE')
),
sizes (size_code) as (
  values ('2-4'), ('2-6'), ('2-8')
),
variants as (
  select
    row_number() over (order by colour.code, size.size_code) as row_number,
    colour.slug as product_slug,
    'UAT-PASTEL-' || colour.code || '-' || replace(size.size_code, '-', '') as sku,
    size.size_code
  from colour_products colour
  cross join sizes size
)
insert into public.product_variants (
  id, product_id, sku, size_code, price_minor, stock_on_hand, is_active
)
select
  ('a4000000-0000-4000-8000-' || lpad(variant.row_number::text, 12, '0'))::uuid,
  product.id,
  variant.sku,
  variant.size_code,
  150000,
  2,
  true
from variants variant
join public.products product on product.slug = variant.product_slug
on conflict (sku) do update set
  product_id = excluded.product_id,
  size_code = excluded.size_code,
  price_minor = excluded.price_minor,
  stock_on_hand = excluded.stock_on_hand,
  is_active = excluded.is_active,
  updated_at = now();
