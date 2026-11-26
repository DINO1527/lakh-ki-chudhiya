import "server-only";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import {
  PRODUCTS_PER_PAGE,
  type CatalogueFilterOptions,
  type CatalogueFilters,
  type PublicCollection,
  type PublicHomeCatalogue,
  type PublicImage,
  type PublicProduct,
  type PublicStorefrontOffer,
} from "../domain/catalogue";
import type { ProductVariant } from "../domain/product-variant";
import { buildHomeCollectionShelves, prioritizeHomeProducts } from "../domain/merchandising";

type ProductRow = Pick<
  Database["public"]["Tables"]["products"]["Row"],
  | "id"
  | "slug"
  | "title"
  | "description"
  | "material"
  | "care_instructions"
  | "set_count"
  | "delivery_fee_minor"
  | "sort_order"
> & { published_at?: string | null };

type CollectionRow = Pick<
  Database["public"]["Tables"]["collections"]["Row"],
  "id" | "slug" | "name" | "description" | "sort_order"
>;

type ProductCollectionRow = Pick<
  Database["public"]["Tables"]["product_collections"]["Row"],
  "product_id" | "collection_id"
>;

type ProductVariantRow = Pick<
  Database["public"]["Tables"]["product_variants"]["Row"],
  "id" | "product_id" | "size_code" | "inner_diameter_mm" | "price_minor" | "is_available"
>;

type PublicMediaRow = {
  id: string;
  product_id?: string;
  collection_id?: string;
  offer_id?: string;
  storage_path: string;
  alt_text: string;
  sort_order: number;
};

type PublicReviewRow = { product_id: string; rating: number };
type LowStockRow = {
  product_id: string;
  variant_id: string;
  size_code: string | null;
  available_quantity: number;
};

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
  offers: readonly PublicStorefrontOffer[];
};

type ActiveOfferRow =
  Database["public"]["Functions"]["get_active_storefront_offers"]["Returns"][number];
type ActiveOffersResult =
  | { status: "ready"; data: readonly PublicStorefrontOffer[] }
  | { status: "error" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COLLECTION_QUERY_LIMIT = 1_000;
const MAX_PRODUCTS_PER_COLLECTION = 5_000;
const MAX_VARIANT_FILTER_ROWS = 1_000;
const MAX_AVAILABLE_VARIANT_ROWS = 5_000;
const FILTER_OPTION_QUERY_LIMIT = 1_000;
const PUBLIC_MEDIA_QUERY_LIMIT = 5_000;
const PRODUCT_IMAGES_PER_PRODUCT = 20;
const COLLECTION_IMAGES_PER_COLLECTION = 20;
const PRODUCT_SELECT =
  "id, slug, title, description, material, care_instructions, set_count, delivery_fee_minor, sort_order";
const LATEST_PRODUCTS_LIMIT = 12;
const LATEST_PRODUCT_SCAN_LIMIT = 48;
const HOME_COLLECTION_LIMIT = 12;
const HOME_PRODUCT_SCAN_LIMIT = 48;
const HOME_PRODUCTS_PER_COLLECTION = 4;
const COLLECTION_SELECT = "id, slug, name, description, sort_order";
const VARIANT_SELECT = "id, product_id, size_code, inner_diameter_mm, price_minor, is_available";

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

  const rows = data ?? [];
  const mediaResult = await loadCollectionImages(
    supabase,
    rows.map((row) => row.id),
    1,
  );
  if (mediaResult.status === "error") return { status: "error" };
  const imagesByCollectionId = mediaResult.data;

  const collections = rows.map((row) => ({
    ...toPublicCollection(row),
    images: imagesByCollectionId.get(row.id) ?? [],
  }));

  return { status: "ready", data: collections };
}

export async function getPublicHomeCatalogue(): Promise<PublicQueryResult<PublicHomeCatalogue>> {
  if (!isSupabaseServerConfigured()) return { status: "unconfigured" };

  const supabase = await createSupabaseServerClient();
  const [collectionsResult, productsResult, offersResult] = await Promise.all([
    supabase
      .from("collections")
      .select(COLLECTION_SELECT)
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .limit(HOME_COLLECTION_LIMIT),
    supabase
      .from("products")
      .select(`${PRODUCT_SELECT}, published_at`)
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true })
      .limit(HOME_PRODUCT_SCAN_LIMIT),
    loadActiveStorefrontOffers(supabase, 12),
  ]);

  if (collectionsResult.error || productsResult.error || offersResult.status !== "ready") {
    return { status: "error" };
  }

  const loadedProducts = await loadPublicProducts(
    supabase,
    (productsResult.data ?? []) as ProductRow[],
    offersResult.data,
    1,
  );
  if (loadedProducts.status === "error") return { status: "error" };

  const collections = (collectionsResult.data ?? []).map((row) =>
    toPublicCollection(row as CollectionRow),
  );

  return {
    status: "ready",
    data: {
      offers: offersResult.data,
      shelves: buildHomeCollectionShelves(
        collections,
        loadedProducts.data,
        HOME_PRODUCTS_PER_COLLECTION,
      ),
    },
  };
}

export async function getLatestPublicProducts(
  limit = 8,
): Promise<PublicQueryResult<readonly PublicProduct[]>> {
  if (!isSupabaseServerConfigured()) return { status: "unconfigured" };
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > LATEST_PRODUCTS_LIMIT) {
    return { status: "error" };
  }

  const supabase = await createSupabaseServerClient();
  const [{ data, error }, offersResult] = await Promise.all([
    supabase
      .from("products")
      .select(`${PRODUCT_SELECT}, published_at`)
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true })
      .limit(Math.min(LATEST_PRODUCT_SCAN_LIMIT, limit * 4)),
    loadActiveStorefrontOffers(supabase, 12),
  ]);

  if (error || offersResult.status !== "ready") return { status: "error" };
  const offers = offersResult.data;
  const result = await loadPublicProducts(supabase, (data ?? []) as ProductRow[], offers, 1);
  if (result.status === "error") return result;

  return {
    status: "ready",
    data: prioritizeHomeProducts(result.data).slice(0, limit),
  };
}

export async function getPublicCollectionImages(
  collectionId: string,
): Promise<PublicQueryResult<readonly PublicImage[]>> {
  if (!isSupabaseServerConfigured()) return { status: "unconfigured" };
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(collectionId)
  ) {
    return { status: "ready", data: [] };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error, count } = await supabase
    .from("collection_media")
    .select("id, collection_id, storage_path, alt_text, sort_order", { count: "exact" })
    .eq("collection_id", collectionId)
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })
    .limit(COLLECTION_IMAGES_PER_COLLECTION);

  if (error || (count ?? 0) > COLLECTION_IMAGES_PER_COLLECTION) return { status: "error" };
  const images = await signPublicImages(supabase, (data ?? []) as PublicMediaRow[]);
  return images ? { status: "ready", data: images } : { status: "error" };
}

export async function getPublicShopPage(
  filters: CatalogueFilters,
): Promise<PublicQueryResult<PublicShopPage>> {
  if (!isSupabaseServerConfigured()) return { status: "unconfigured" };

  const supabase = await createSupabaseServerClient();
  const [collectionsResult, filterOptionsResult, offersResult] = await Promise.all([
    supabase
      .from("collections")
      .select(COLLECTION_SELECT, { count: "exact" })
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .limit(COLLECTION_QUERY_LIMIT),
    supabase
      .from("product_variants")
      .select("size_code, products!inner(status, slug)", { count: "exact" })
      .eq("is_available", true)
      .eq("products.status", "published")
      .order("size_code", { ascending: true, nullsFirst: true })
      .limit(FILTER_OPTION_QUERY_LIMIT),
    loadActiveStorefrontOffers(supabase, 12),
  ]);

  if (
    collectionsResult.error ||
    (collectionsResult.count ?? 0) > COLLECTION_QUERY_LIMIT ||
    filterOptionsResult.error ||
    (filterOptionsResult.count ?? 0) > FILTER_OPTION_QUERY_LIMIT ||
    offersResult.status !== "ready"
  ) {
    return { status: "error" };
  }

  const collectionRows = collectionsResult.data ?? [];
  const collectionMediaResult = await loadCollectionImages(
    supabase,
    collectionRows.map((row) => row.id),
    1,
  );
  if (collectionMediaResult.status === "error") return { status: "error" };
  const collections = collectionRows.map((row) => ({
    ...toPublicCollection(row),
    images: collectionMediaResult.data.get(row.id) ?? [],
  }));
  const filterOptions: CatalogueFilterOptions = {
    sizeCodes: uniqueSorted((filterOptionsResult.data ?? []).flatMap((row) => row.size_code ?? [])),
  };
  const offers = offersResult.data;
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
        offers,
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
          offers,
        },
      };
    }
  }

  if (filters.sizeCode) {
    const { data, count, error } = await supabase
      .from("product_variants")
      .select("product_id, products!inner(status, slug)", { count: "exact" })
      .eq("is_available", true)
      .eq("products.status", "published")
      .eq("size_code", filters.sizeCode)
      .limit(MAX_VARIANT_FILTER_ROWS);
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
          offers,
        },
      };
    }
  } else {
    const { data, count, error } = await supabase
      .from("product_variants")
      .select("product_id, products!inner(status, slug)", { count: "exact" })
      .eq("is_available", true)
      .eq("products.status", "published")
      .order("product_id", { ascending: true })
      .limit(MAX_AVAILABLE_VARIANT_ROWS);

    if (error || (count ?? 0) > MAX_AVAILABLE_VARIANT_ROWS) return { status: "error" };
    const availableProductIds = new Set((data ?? []).map((row) => row.product_id));
    linkedProductIds = linkedProductIds
      ? linkedProductIds.filter((productId) => availableProductIds.has(productId))
      : [...availableProductIds];

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
          offers,
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
  const productsResult = await loadPublicProducts(supabase, rows, offers, 1);
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
      offers,
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

  const offersResult = await loadActiveStorefrontOffers(supabase, 12);
  if (offersResult.status !== "ready") return { status: "error" };

  const offers = offersResult.data;
  const productsResult = await loadPublicProducts(supabase, [data as ProductRow], offers);
  if (productsResult.status === "error") return productsResult;

  return { status: "ready", data: productsResult.data[0] ?? null };
}

export async function getPublicProductsByIds(
  productIds: readonly string[],
): Promise<PublicQueryResult<readonly PublicProduct[]>> {
  if (!isSupabaseServerConfigured()) return { status: "unconfigured" };
  const ids = [...new Set(productIds.filter((id) => UUID_PATTERN.test(id)))].slice(0, 20);
  if (ids.length === 0) return { status: "ready", data: [] };

  const supabase = await createSupabaseServerClient();
  const { data, error, count } = await supabase
    .from("products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .in("id", ids)
    .eq("status", "published")
    .limit(ids.length);

  if (error || (count ?? 0) > ids.length) return { status: "error" };
  const productsResult = await loadPublicProducts(supabase, (data ?? []) as ProductRow[], [], 1);
  return productsResult.status === "ready" ? productsResult : { status: "error" };
}

async function loadPublicProducts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  rows: readonly ProductRow[],
  offers: readonly PublicStorefrontOffer[] = [],
  imagesPerProduct = PRODUCT_IMAGES_PER_PRODUCT,
): Promise<PublicProductLoadResult> {
  if (rows.length === 0) return { status: "ready", data: [] };

  const productIds = rows.map((row) => row.id);
  const mediaLimit = Math.min(
    PUBLIC_MEDIA_QUERY_LIMIT,
    productIds.length * PRODUCT_IMAGES_PER_PRODUCT,
  );
  const [variantsResult, linksResult, mediaResult] = await Promise.all([
    supabase
      .from("product_variants")
      .select(VARIANT_SELECT, { count: "exact" })
      .in("product_id", productIds)
      .order("size_code", { ascending: true, nullsFirst: true })
      .limit(1_000),
    supabase
      .from("product_collections")
      .select("product_id, collection_id", { count: "exact" })
      .in("product_id", productIds)
      .limit(1_000),
    supabase
      .from("product_media")
      .select("id, product_id, storage_path, alt_text, sort_order", { count: "exact" })
      .in("product_id", productIds)
      .eq("media_type", "image")
      .eq("status", "published")
      .order("product_id", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true })
      .limit(mediaLimit),
  ]);

  if (
    variantsResult.error ||
    linksResult.error ||
    mediaResult.error ||
    (variantsResult.count ?? 0) > 1_000 ||
    (linksResult.count ?? 0) > 1_000 ||
    (mediaResult.count ?? 0) > mediaLimit
  ) {
    return { status: "error" };
  }

  const mediaRows = takeMediaPerOwner(
    (mediaResult.data ?? []) as PublicMediaRow[],
    (row) => row.product_id,
    imagesPerProduct,
  );
  const signedImages = await signPublicImages(supabase, mediaRows);
  if (!signedImages) return { status: "error" };
  const mediaById = new Map(mediaRows.map((row) => [row.id, row]));
  const imagesByProductId = new Map<string, PublicImage[]>();
  for (const image of signedImages) {
    const productId = mediaById.get(image.id)?.product_id;
    if (!productId) continue;
    const images = imagesByProductId.get(productId) ?? [];
    images.push(image);
    imagesByProductId.set(productId, images);
  }

  const links = (linksResult.data ?? []) as ProductCollectionRow[];
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

  const [reviewSettingsResult, lowStockResult] = await Promise.all([
    supabase.from("products").select("id, reviews_enabled").in("id", productIds),
    supabase.rpc("get_public_low_stock_variants", { p_product_ids: productIds }),
  ]);
  const reviewSettings =
    reviewSettingsResult.error &&
    !["PGRST204", "42703", "42501"].includes(reviewSettingsResult.error.code ?? "")
      ? new Map<string, boolean>()
      : new Map(
          (reviewSettingsResult.data ?? []).map((product) => [product.id, product.reviews_enabled]),
        );
  if (
    reviewSettingsResult.error &&
    !["PGRST204", "42703", "42501"].includes(reviewSettingsResult.error.code ?? "")
  ) {
    return { status: "error" };
  }

  const reviewProductIds = rows
    .filter((product) => reviewSettings.get(product.id) !== false)
    .map((product) => product.id);
  const reviewSummaryResult = reviewProductIds.length
    ? await supabase
        .from("product_reviews")
        .select("product_id, rating", { count: "exact" })
        .in("product_id", reviewProductIds)
        .eq("status", "approved")
        .limit(5_000)
    : { data: [], count: 0, error: null };
  const reviewRows =
    reviewSummaryResult.error || (reviewSummaryResult.count ?? 0) > 5_000
      ? []
      : ((reviewSummaryResult.data ?? []) as PublicReviewRow[]);
  const reviewSummary = summarizeProductReviews(reviewRows);

  const lowStockByProductId = new Map<string, LowStockRow[]>();
  if (!lowStockResult.error) {
    for (const row of (lowStockResult.data ?? []) as LowStockRow[]) {
      const current = lowStockByProductId.get(row.product_id) ?? [];
      current.push(row);
      lowStockByProductId.set(row.product_id, current);
    }
  }

  const variantsByProductId = new Map<string, ProductVariant[]>();
  for (const row of (variantsResult.data ?? []) as ProductVariantRow[]) {
    const variants = variantsByProductId.get(row.product_id) ?? [];
    variants.push({
      id: row.id,
      sizeCode: row.size_code,
      innerDiameterMm: row.inner_diameter_mm,
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
      const images = imagesByProductId.get(row.id) ?? [];
      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        material: row.material,
        careInstructions: row.care_instructions,
        setCount: row.set_count,
        deliveryFeeMinor: row.delivery_fee_minor,
        reviewsEnabled: reviewSettings.get(row.id) ?? true,
        averageRating: reviewSummary.get(row.id)?.averageRating ?? 0,
        reviewCount: reviewSummary.get(row.id)?.reviewCount ?? 0,
        lowStockVariants: (lowStockByProductId.get(row.id) ?? []).map((variant) => ({
          variantId: variant.variant_id,
          sizeCode: variant.size_code,
          availableSets: variant.available_quantity,
        })),
        sortOrder: row.sort_order,
        images,
        offers: offers.filter(
          (offer) =>
            (offer.targetType === "product" && offer.targetSlug === row.slug) ||
            (offer.targetType === "collection" &&
              productCollections.some((collection) => collection.slug === offer.targetSlug)),
        ),
        collections: productCollections,
        variants: variantsByProductId.get(row.id) ?? [],
      };
    }),
  };
}

function summarizeProductReviews(
  reviews: readonly PublicReviewRow[],
): Map<string, { averageRating: number; reviewCount: number }> {
  const totals = new Map<string, { ratingTotal: number; reviewCount: number }>();
  for (const review of reviews) {
    const current = totals.get(review.product_id) ?? { ratingTotal: 0, reviewCount: 0 };
    current.ratingTotal += review.rating;
    current.reviewCount += 1;
    totals.set(review.product_id, current);
  }
  return new Map(
    [...totals].map(([productId, value]) => [
      productId,
      {
        averageRating: Math.round((value.ratingTotal / value.reviewCount) * 10) / 10,
        reviewCount: value.reviewCount,
      },
    ]),
  );
}

async function loadActiveStorefrontOffers(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  limit: number,
): Promise<ActiveOffersResult> {
  const { data, error } = await supabase.rpc("get_active_storefront_offers", { p_limit: limit });
  if (error) return { status: "error" };

  const offers = (data ?? []).map(toPublicStorefrontOffer);
  if (offers.length === 0) return { status: "ready", data: offers };

  const {
    data: mediaData,
    error: mediaError,
    count,
  } = await supabase
    .from("offer_media")
    .select("id, offer_id, storage_path, alt_text, sort_order", { count: "exact" })
    .in(
      "offer_id",
      offers.map((offer) => offer.id),
    )
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })
    .limit(offers.length);
  if (mediaError || (count ?? 0) > offers.length) return { status: "error" };

  const mediaRows = (mediaData ?? []) as PublicMediaRow[];
  const signedImages = await signPublicImages(supabase, mediaRows);
  if (!signedImages) return { status: "error" };
  const imageByOfferId = new Map(
    mediaRows.map((row, index) => [row.offer_id, signedImages[index] ?? null]),
  );

  return {
    status: "ready",
    data: offers.map((offer) => ({ ...offer, bannerImage: imageByOfferId.get(offer.id) ?? null })),
  };
}

function toPublicStorefrontOffer(row: ActiveOfferRow): PublicStorefrontOffer {
  return {
    id: row.id,
    name: row.name,
    targetType: row.target_type === "collection" ? "collection" : "product",
    targetName: row.target_name,
    targetSlug: row.target_slug,
    minimumSets: row.minimum_sets,
    discountBasisPoints: row.discount_basis_points,
    endsAt: row.ends_at,
    bannerImage: null,
  };
}

function toPublicCollection(row: CollectionRow): PublicCollection {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    images: [],
  };
}

async function loadCollectionImages(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  collectionIds: readonly string[],
  imagesPerCollection = COLLECTION_IMAGES_PER_COLLECTION,
): Promise<{ status: "ready"; data: Map<string, PublicImage[]> } | { status: "error" }> {
  if (collectionIds.length === 0) return { status: "ready", data: new Map() };
  const mediaLimit = Math.min(
    PUBLIC_MEDIA_QUERY_LIMIT,
    collectionIds.length * COLLECTION_IMAGES_PER_COLLECTION,
  );
  const { data, error, count } = await supabase
    .from("collection_media")
    .select("id, collection_id, storage_path, alt_text, sort_order", { count: "exact" })
    .in("collection_id", [...collectionIds])
    .eq("status", "published")
    .order("collection_id", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })
    .limit(mediaLimit);
  if (error || (count ?? 0) > mediaLimit) return { status: "error" };

  const rows = takeMediaPerOwner(
    (data ?? []) as PublicMediaRow[],
    (row) => row.collection_id,
    imagesPerCollection,
  );
  const images = await signPublicImages(supabase, rows);
  if (!images) return { status: "error" };
  const imagesById = new Map(images.map((image) => [image.id, image]));
  const grouped = new Map<string, PublicImage[]>();
  for (const row of rows) {
    if (!row.collection_id) continue;
    const image = imagesById.get(row.id);
    if (!image) continue;
    const current = grouped.get(row.collection_id) ?? [];
    current.push(image);
    grouped.set(row.collection_id, current);
  }
  return { status: "ready", data: grouped };
}

function takeMediaPerOwner(
  rows: readonly PublicMediaRow[],
  getOwnerId: (row: PublicMediaRow) => string | undefined,
  limitPerOwner: number,
): PublicMediaRow[] {
  const counts = new Map<string, number>();

  return rows.filter((row) => {
    const ownerId = getOwnerId(row);
    if (!ownerId) return false;
    const count = counts.get(ownerId) ?? 0;
    if (count >= limitPerOwner) return false;
    counts.set(ownerId, count + 1);
    return true;
  });
}

async function signPublicImages(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  rows: readonly PublicMediaRow[],
): Promise<PublicImage[] | null> {
  if (rows.length === 0) return [];
  const { data, error } = await supabase.storage.from("product-media").createSignedUrls(
    rows.map((row) => row.storage_path),
    3_600,
  );
  if (error || !data) return null;

  const images: PublicImage[] = [];
  for (const [index, row] of rows.entries()) {
    const signedUrl = data[index]?.signedUrl;
    if (!signedUrl || data[index]?.error) return null;
    images.push({ id: row.id, url: signedUrl, altText: row.alt_text, sortOrder: row.sort_order });
  }
  return images;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
