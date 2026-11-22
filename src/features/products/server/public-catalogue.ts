import "server-only";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import {
  PRODUCTS_PER_PAGE,
  type CatalogueFilterOptions,
  type CatalogueFilters,
  type PublicCollection,
  type PublicProduct,
} from "../domain/catalogue";
import type { ProductVariant } from "../domain/product-variant";

type ProductRow = Pick<
  Database["public"]["Tables"]["products"]["Row"],
  | "id"
  | "slug"
  | "title"
  | "description"
  | "material"
  | "care_instructions"
  | "set_count"
  | "sort_order"
>;

type CollectionRow = Pick<
  Database["public"]["Tables"]["collections"]["Row"],
  "id" | "slug" | "name" | "description" | "sort_order"
>;

type ProductCollectionRow = Pick<
  Database["public"]["Tables"]["product_collections"]["Row"],
  "product_id" | "collection_id"
>;

type ProductMediaRow = Pick<
  Database["public"]["Tables"]["product_media"]["Row"],
  "product_id" | "storage_path" | "alt_text" | "sort_order"
>;

type ProductVariantRow = Pick<
  Database["public"]["Tables"]["product_variants"]["Row"],
  | "id"
  | "product_id"
  | "size_code"
  | "inner_diameter_mm"
  | "colour_name"
  | "price_minor"
  | "is_available"
>;

export type PublicQueryResult<T> =
  | { status: "ready"; data: T }
  | { status: "unconfigured" }
  | { status: "error" };

type PublicProductLoadResult =
  | { status: "ready"; data: readonly PublicProduct[] }
  | { status: "error" };

export type PublicShopPage = {
  products: readonly PublicProduct[];
  collections: readonly PublicCollection[];
  filterOptions: CatalogueFilterOptions;
  selectedCollection: PublicCollection | null;
  filters: CatalogueFilters;
  totalCount: number;
  totalPages: number;
};

const UAT_FIXTURE_COLLECTION = "uat-fixtures-not-for-sale";
const COLLECTION_QUERY_LIMIT = 1_000;
const MAX_PRODUCTS_PER_COLLECTION = 5_000;
const MAX_VARIANT_FILTER_ROWS = 1_000;
const FILTER_OPTION_QUERY_LIMIT = 1_000;
const PRODUCT_SELECT =
  "id, slug, title, description, material, care_instructions, set_count, sort_order";
const COLLECTION_SELECT = "id, slug, name, description, sort_order";
const VARIANT_SELECT =
  "id, product_id, size_code, inner_diameter_mm, colour_name, price_minor, is_available";

export async function getPublicCollections(): Promise<
  PublicQueryResult<readonly PublicCollection[]>
> {
  if (!isSupabaseServerConfigured()) return { status: "unconfigured" };

  const supabase = await createSupabaseServerClient();
  const { data, count, error } = await supabase
    .from("collections")
    .select(COLLECTION_SELECT, { count: "exact" })
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(COLLECTION_QUERY_LIMIT);

  if (error || (count ?? 0) > COLLECTION_QUERY_LIMIT) return { status: "error" };

  return { status: "ready", data: (data ?? []).map(toPublicCollection) };
}

export async function getPublicShopPage(
  filters: CatalogueFilters,
): Promise<PublicQueryResult<PublicShopPage>> {
  if (!isSupabaseServerConfigured()) return { status: "unconfigured" };

  const supabase = await createSupabaseServerClient();
  const [collectionsResult, filterOptionsResult] = await Promise.all([
    supabase
      .from("collections")
      .select(COLLECTION_SELECT, { count: "exact" })
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .limit(COLLECTION_QUERY_LIMIT),
    supabase
      .from("product_variants")
      .select("size_code, colour_name", { count: "exact" })
      .eq("is_available", true)
      .order("size_code", { ascending: true, nullsFirst: true })
      .order("colour_name", { ascending: true })
      .limit(FILTER_OPTION_QUERY_LIMIT),
  ]);

  if (
    collectionsResult.error ||
    (collectionsResult.count ?? 0) > COLLECTION_QUERY_LIMIT ||
    filterOptionsResult.error ||
    (filterOptionsResult.count ?? 0) > FILTER_OPTION_QUERY_LIMIT
  ) {
    return { status: "error" };
  }

  const collections = (collectionsResult.data ?? []).map(toPublicCollection);
  const filterOptions: CatalogueFilterOptions = {
    sizeCodes: uniqueSorted((filterOptionsResult.data ?? []).flatMap((row) => row.size_code ?? [])),
    colourNames: uniqueSorted((filterOptionsResult.data ?? []).map((row) => row.colour_name)),
  };
  const selectedCollection = filters.collectionSlug
    ? (collections.find((collection) => collection.slug === filters.collectionSlug) ?? null)
    : null;

  if (filters.collectionSlug && !selectedCollection) {
    return {
      status: "ready",
      data: {
        products: [],
        collections,
        filterOptions,
        selectedCollection: null,
        filters,
        totalCount: 0,
        totalPages: 1,
      },
    };
  }

  let linkedProductIds: string[] | null = null;
  if (selectedCollection) {
    const { data, count, error } = await supabase
      .from("product_collections")
      .select("product_id", { count: "exact" })
      .eq("collection_id", selectedCollection.id)
      .order("product_id", { ascending: true })
      .limit(MAX_PRODUCTS_PER_COLLECTION);

    if (error || (count ?? 0) > MAX_PRODUCTS_PER_COLLECTION) return { status: "error" };
    linkedProductIds = [...new Set((data ?? []).map((row) => row.product_id))];
    if (linkedProductIds.length === 0) {
      return {
        status: "ready",
        data: {
          products: [],
          collections,
          filterOptions,
          selectedCollection,
          filters,
          totalCount: 0,
          totalPages: 1,
        },
      };
    }
  }

  if (filters.sizeCode || filters.colourName) {
    let variantQuery = supabase
      .from("product_variants")
      .select("product_id", { count: "exact" })
      .eq("is_available", true);

    if (filters.sizeCode) variantQuery = variantQuery.eq("size_code", filters.sizeCode);
    if (filters.colourName) variantQuery = variantQuery.eq("colour_name", filters.colourName);

    const { data, count, error } = await variantQuery.limit(MAX_VARIANT_FILTER_ROWS);
    if (error || (count ?? 0) > MAX_VARIANT_FILTER_ROWS) return { status: "error" };

    const matchingIds = new Set((data ?? []).map((row) => row.product_id));
    linkedProductIds = linkedProductIds
      ? linkedProductIds.filter((productId) => matchingIds.has(productId))
      : [...matchingIds];

    if (linkedProductIds.length === 0) {
      return {
        status: "ready",
        data: {
          products: [],
          collections,
          filterOptions,
          selectedCollection,
          filters,
          totalCount: 0,
          totalPages: 1,
        },
      };
    }
  }

  const from = (filters.page - 1) * PRODUCTS_PER_PAGE;
  const to = from + PRODUCTS_PER_PAGE - 1;
  let productQuery = supabase
    .from("products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .eq("status", "published");

  if (linkedProductIds) productQuery = productQuery.in("id", linkedProductIds);
  if (filters.search) productQuery = productQuery.ilike("title", `%${filters.search}%`);

  productQuery =
    filters.sort === "name"
      ? productQuery.order("title", { ascending: true })
      : productQuery.order("sort_order", { ascending: true }).order("title", { ascending: true });

  const { data: productData, count, error } = await productQuery.range(from, to);
  if (error) return { status: "error" };

  const rows = (productData ?? []) as ProductRow[];
  const productsResult = await loadPublicProducts(supabase, rows);
  if (productsResult.status === "error") return productsResult;

  const totalCount = count ?? 0;
  return {
    status: "ready",
    data: {
      products: productsResult.data,
      collections,
      filterOptions,
      selectedCollection,
      filters,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / PRODUCTS_PER_PAGE)),
    },
  };
}

export async function getPublicProductBySlug(
  slug: string,
): Promise<PublicQueryResult<PublicProduct | null>> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { status: "ready", data: null };
  }
  if (!isSupabaseServerConfigured()) return { status: "unconfigured" };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) return { status: "error" };
  if (!data) return { status: "ready", data: null };

  const productsResult = await loadPublicProducts(supabase, [data as ProductRow]);
  if (productsResult.status === "error") return productsResult;

  return { status: "ready", data: productsResult.data[0] ?? null };
}

async function loadPublicProducts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  rows: readonly ProductRow[],
): Promise<PublicProductLoadResult> {
  if (rows.length === 0) return { status: "ready", data: [] };

  const productIds = rows.map((row) => row.id);
  const [variantsResult, linksResult, mediaResult] = await Promise.all([
    supabase
      .from("product_variants")
      .select(VARIANT_SELECT, { count: "exact" })
      .in("product_id", productIds)
      .order("size_code", { ascending: true, nullsFirst: true })
      .order("colour_name", { ascending: true })
      .limit(1_000),
    supabase
      .from("product_collections")
      .select("product_id, collection_id", { count: "exact" })
      .in("product_id", productIds)
      .limit(1_000),
    supabase
      .from("product_media")
      .select("product_id, storage_path, alt_text, sort_order", { count: "exact" })
      .in("product_id", productIds)
      .eq("media_type", "image")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .limit(200),
  ]);

  if (
    variantsResult.error ||
    linksResult.error ||
    mediaResult.error ||
    (variantsResult.count ?? 0) > 1_000 ||
    (linksResult.count ?? 0) > 1_000 ||
    (mediaResult.count ?? 0) > 200
  ) {
    return { status: "error" };
  }

  const links = (linksResult.data ?? []) as ProductCollectionRow[];
  const mediaRows = (mediaResult.data ?? []) as ProductMediaRow[];
  const signedMedia =
    mediaRows.length > 0
      ? await supabase.storage.from("product-media").createSignedUrls(
          mediaRows.map((media) => media.storage_path),
          3_600,
        )
      : null;
  const mediaByProductId = new Map<string, { url: string; altText: string }[]>();
  if (!signedMedia?.error) {
    for (const [index, media] of mediaRows.entries()) {
      const signedUrl = signedMedia?.data?.[index]?.signedUrl;
      if (!signedUrl) continue;
      const productMedia = mediaByProductId.get(media.product_id) ?? [];
      productMedia.push({ url: signedUrl, altText: media.alt_text });
      mediaByProductId.set(media.product_id, productMedia);
    }
  }
  const collectionIds = [...new Set(links.map((link) => link.collection_id))];
  const collectionsResult =
    collectionIds.length > 0
      ? await supabase
          .from("collections")
          .select(COLLECTION_SELECT, { count: "exact" })
          .in("id", collectionIds)
          .eq("status", "published")
          .order("sort_order", { ascending: true })
          .limit(COLLECTION_QUERY_LIMIT)
      : null;

  if (collectionsResult?.error || (collectionsResult?.count ?? 0) > COLLECTION_QUERY_LIMIT) {
    return { status: "error" };
  }

  const variantsByProductId = new Map<string, ProductVariant[]>();
  for (const row of (variantsResult.data ?? []) as ProductVariantRow[]) {
    const variants = variantsByProductId.get(row.product_id) ?? [];
    variants.push({
      id: row.id,
      sizeCode: row.size_code,
      innerDiameterMm: row.inner_diameter_mm,
      colourName: row.colour_name,
      priceMinor: row.price_minor,
      isAvailable: row.is_available,
    });
    variantsByProductId.set(row.product_id, variants);
  }

  const collectionById = new Map(
    (collectionsResult?.data ?? []).map((row) => [
      row.id,
      toPublicCollection(row as CollectionRow),
    ]),
  );
  const collectionsByProductId = new Map<string, PublicCollection[]>();
  for (const link of links) {
    const collection = collectionById.get(link.collection_id);
    if (!collection) continue;
    const productCollections = collectionsByProductId.get(link.product_id) ?? [];
    productCollections.push(collection);
    collectionsByProductId.set(link.product_id, productCollections);
  }

  return {
    status: "ready",
    data: rows.map((row) => {
      const productCollections = collectionsByProductId.get(row.id) ?? [];
      const isUatFixture = productCollections.some(
        (collection) => collection.slug === UAT_FIXTURE_COLLECTION,
      );

      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        material: row.material,
        careInstructions: row.care_instructions,
        setCount: row.set_count,
        sortOrder: row.sort_order,
        collections: productCollections,
        variants: variantsByProductId.get(row.id) ?? [],
        images: mediaByProductId.get(row.id) ?? [],
        isUatFixture,
      };
    }),
  };
}

function toPublicCollection(row: CollectionRow): PublicCollection {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    isUatFixture: row.slug === UAT_FIXTURE_COLLECTION,
  };
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
