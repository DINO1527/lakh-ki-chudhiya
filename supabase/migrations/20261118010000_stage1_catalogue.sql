create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  description text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  material text not null default '',
  care_instructions text not null default '',
  set_count smallint not null default 1 check (set_count > 0),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_collections (
  product_id uuid not null references public.products(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, collection_id)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique check (length(trim(sku)) > 0),
  size_code text check (size_code is null or length(trim(size_code)) > 0),
  inner_diameter_mm numeric(6, 2)
    check (inner_diameter_mm is null or inner_diameter_mm > 0),
  colour_name text not null check (length(trim(colour_name)) > 0),
  price_minor integer not null check (price_minor > 0),
  compare_at_price_minor integer
    check (compare_at_price_minor is null or compare_at_price_minor > price_minor),
  stock_on_hand integer not null default 0 check (stock_on_hand >= 0),
  is_active boolean not null default true,
  is_available boolean generated always as (is_active and stock_on_hand > 0) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (product_id, size_code, colour_name),
  unique (id, product_id)
);

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid,
  storage_path text not null unique check (length(trim(storage_path)) > 0),
  alt_text text not null check (length(trim(alt_text)) > 0),
  media_type text not null default 'image'
    check (media_type in ('image', 'video', 'model')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (variant_id, product_id)
    references public.product_variants(id, product_id) on delete cascade
);

create index collections_published_order_idx
  on public.collections (sort_order, name)
  where status = 'published';
create index products_published_order_idx
  on public.products (sort_order, title)
  where status = 'published';
create index product_collections_collection_product_idx
  on public.product_collections (collection_id, product_id);
create index product_variants_available_size_colour_idx
  on public.product_variants (size_code, colour_name, product_id)
  where is_available;
create index product_variants_available_colour_idx
  on public.product_variants (colour_name, product_id)
  where is_available;
create index product_media_product_id_idx on public.product_media (product_id);
create index product_media_variant_product_idx
  on public.product_media (variant_id, product_id)
  where variant_id is not null;
create index product_media_published_order_idx
  on public.product_media (product_id, sort_order)
  where status = 'published';

alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_collections enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_media enable row level security;

revoke all on public.collections, public.products, public.product_collections,
  public.product_variants, public.product_media from public, anon, authenticated;

grant select (id, slug, name, description, status, sort_order)
  on public.collections to anon, authenticated;
grant select (id, slug, title, description, material, status,
  care_instructions, set_count, sort_order)
  on public.products to anon, authenticated;
grant select (product_id, collection_id)
  on public.product_collections to anon, authenticated;
grant select (id, product_id, size_code, inner_diameter_mm, colour_name,
  price_minor, compare_at_price_minor, is_available)
  on public.product_variants to anon, authenticated;
grant select (id, product_id, variant_id, storage_path, alt_text, media_type,
  status, sort_order)
  on public.product_media to anon, authenticated;

create policy "published collections are readable"
  on public.collections for select to anon, authenticated
  using (status = 'published');

create policy "published products are readable"
  on public.products for select to anon, authenticated
  using (status = 'published');

create policy "published product collection links are readable"
  on public.product_collections for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'published'
    )
    and exists (
      select 1 from public.collections c
      where c.id = collection_id and c.status = 'published'
    )
  );

create policy "active variants of published products are readable"
  on public.product_variants for select to anon, authenticated
  using (
    is_active
    and exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'published'
    )
  );

create policy "published media of published products is readable"
  on public.product_media for select to anon, authenticated
  using (
    status = 'published'
    and exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'published'
    )
  );

create policy "admins can read all product media metadata"
  on public.product_media for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
