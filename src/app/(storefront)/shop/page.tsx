import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { CatalogueNotice } from "@/features/products/components/catalogue-notice";
import { CataloguePagination } from "@/features/products/components/catalogue-pagination";
import { ProductGrid } from "@/features/products/components/product-card";
import { StorefrontOfferList } from "@/features/products/components/storefront-offers";
import {
  buildCataloguePageHref,
  normalizeCatalogueFilters,
  type CatalogueSearchParams,
} from "@/features/products/domain/catalogue";
import { getPublicShopPage } from "@/features/products/server/public-catalogue";

export const metadata: Metadata = {
  title: "Shop | Lacora",
  description: "Browse published handcrafted lac bangle designs and their available sizes.",
};

export const dynamic = "force-dynamic";

type ShopPageProps = {
  searchParams: Promise<CatalogueSearchParams>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const filters = normalizeCatalogueFilters(await searchParams);
  const result = await getPublicShopPage(filters);
  if (result.status === "ready" && filters.page > result.data.totalPages) {
    const lastPageFilters = { ...filters, page: result.data.totalPages };
    redirect(buildCataloguePageHref(lastPageFilters, result.data.totalPages));
  }
  const selectedCollection = result.status === "ready" ? result.data.selectedCollection : null;
  const featuredImage =
    selectedCollection?.images[0] ??
    (result.status === "ready" ? result.data.products[0]?.images[0] : undefined);

  return (
    <main className="page-shell shop-page" id="main-content">
      <section aria-labelledby="shop-title" className="shop-intro">
        <div className="shop-intro__copy">
          <p className="eyebrow">Find your Lacora</p>
          <h1 className="page-heading" id="shop-title">
            {selectedCollection ? selectedCollection.name : "A set for your story"}
          </h1>
          <p className="page-intro">
            Browse the designs currently published by Lacora. Each listing is a complete bangle set;
            choose its size before adding it to your bag.
          </p>
          <div className="shop-intro__links">
            <Link className="button button--primary" href="#published-designs">
              Explore designs <span aria-hidden="true">↓</span>
            </Link>
            <Link className="button button--quiet" href="/size-guide">
              Find your size
            </Link>
          </div>
        </div>
        <div className="shop-intro__visual">
          {featuredImage ? (
            <Image
              alt={featuredImage.altText}
              className="shop-intro__image"
              height={700}
              src={featuredImage.url}
              unoptimized
              width={900}
            />
          ) : (
            <span className="shop-intro__ornament" aria-hidden="true">
              L
            </span>
          )}
          <span className="shop-intro__caption">
            {selectedCollection?.name ?? "Handcrafted lac bangles"}
          </span>
        </div>
      </section>

      {result.status === "ready" ? (
        <>
          {result.data.collections.length > 0 && (
            <nav aria-label="Shop by collection" className="shop-collection-nav">
              <Link
                aria-current={!filters.collectionSlug ? "page" : undefined}
                className="shop-collection-nav__link"
                href={buildCataloguePageHref({ ...filters, collectionSlug: "" }, 1)}
              >
                All designs
              </Link>
              {result.data.collections.map((collection) => (
                <Link
                  aria-current={filters.collectionSlug === collection.slug ? "page" : undefined}
                  className="shop-collection-nav__link"
                  href={buildCataloguePageHref({ ...filters, collectionSlug: collection.slug }, 1)}
                  key={collection.id}
                >
                  {collection.name}
                </Link>
              ))}
            </nav>
          )}

          {result.data.offers.length > 0 && (
            <section aria-labelledby="current-offers-heading" className="shop-offers">
              <div className="shop-offers__heading">
                <p className="eyebrow">For this season</p>
                <h2 id="current-offers-heading">Current offers</h2>
                <p>Discounts are confirmed against eligible sets in your bag.</p>
              </div>
              <StorefrontOfferList offers={result.data.offers} />
            </section>
          )}

          <form action="/shop" className="catalogue-filters shop-filters" method="get">
            <div className="shop-filters__heading">
              <div>
                <p className="eyebrow">Your way to browse</p>
                <h2>Find a design</h2>
              </div>
              {(filters.search ||
                filters.collectionSlug ||
                filters.sizeCode ||
                filters.sort !== "featured") && (
                <Link className="text-link" href="/shop">
                  Clear filters
                </Link>
              )}
            </div>
            <div className="shop-filters__fields">
              <div className="catalogue-filters__field">
                <label htmlFor="catalogue-search">Search designs</label>
                <input
                  autoComplete="off"
                  defaultValue={filters.search}
                  id="catalogue-search"
                  maxLength={80}
                  name="q"
                  type="search"
                />
              </div>
              <div className="catalogue-filters__field">
                <label htmlFor="catalogue-collection">Collection</label>
                <select
                  defaultValue={filters.collectionSlug}
                  id="catalogue-collection"
                  name="collection"
                >
                  <option value="">All collections</option>
                  {result.data.collections.map((collection) => (
                    <option key={collection.id} value={collection.slug}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="catalogue-filters__field">
                <label htmlFor="catalogue-size">Size</label>
                <select defaultValue={filters.sizeCode} id="catalogue-size" name="size">
                  <option value="">All sizes</option>
                  {result.data.filterOptions.sizeCodes.map((sizeCode) => (
                    <option key={sizeCode} value={sizeCode}>
                      {sizeCode}
                    </option>
                  ))}
                </select>
              </div>
              <div className="catalogue-filters__field">
                <label htmlFor="catalogue-sort">Sort by</label>
                <select defaultValue={filters.sort} id="catalogue-sort" name="sort">
                  <option value="featured">Featured</option>
                  <option value="name">Name</option>
                </select>
              </div>
              <button className="button button--primary catalogue-filters__submit" type="submit">
                Show designs
              </button>
            </div>
          </form>

          <section
            aria-labelledby="published-designs-heading"
            className="shop-results"
            id="published-designs"
          >
            <div className="shop-results__heading">
              <div>
                <p className="eyebrow">Lacora catalogue</p>
                <h2 id="published-designs-heading">
                  {result.data.selectedCollection ? "In this collection" : "Published designs"}
                </h2>
              </div>
              <p aria-live="polite" className="catalogue-result-count" role="status">
                {result.data.totalCount} {result.data.totalCount === 1 ? "design" : "designs"}
              </p>
            </div>

            {result.data.products.length > 0 ? (
              <ProductGrid products={result.data.products} />
            ) : (
              <EmptyState title="No published designs match those filters">
                Clear the search or choose another collection. You can also read the{" "}
                <Link href="/size-guide">size guide</Link> while the catalogue is being prepared.
              </EmptyState>
            )}

            <CataloguePagination filters={filters} totalPages={result.data.totalPages} />
          </section>
        </>
      ) : (
        <CatalogueNotice state={result.status} />
      )}
    </main>
  );
}
