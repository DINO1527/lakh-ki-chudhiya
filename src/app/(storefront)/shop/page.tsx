import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { CatalogueNotice } from "@/features/products/components/catalogue-notice";
import { CataloguePagination } from "@/features/products/components/catalogue-pagination";
import { ProductGrid } from "@/features/products/components/product-card";
import { OfferCarousel } from "@/features/promotions/components/offer-carousel";
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

  return (
    <main className="page-shell shop-page" id="main-content">
      <section aria-labelledby="shop-title" className="shop-intro shop-intro--compact">
        <div className="shop-intro__copy">
          <p className="eyebrow">Find your Lacora</p>
          <h1 className="page-heading" id="shop-title">
            {selectedCollection ? selectedCollection.name : "A set for your story"}
          </h1>
          <p className="page-intro">
            Browse handcrafted designs by collection, size, or name. Every listing includes clear
            set details and current availability.
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
      </section>

      {result.status === "ready" ? (
        <>
          <OfferCarousel offers={result.data.offers} />

          {result.data.collections.length > 0 && (
            <nav
              aria-label="Shop by collection"
              className="shop-collection-nav"
              id="catalogue-collection"
            >
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

          <form action="/shop" className="catalogue-filters shop-filters" method="get">
            <div className="shop-filters__heading">
              <div className="shop-filters__title">
                <span aria-hidden="true" className="shop-filters__title-icon">
                  <SlidersHorizontal size={19} strokeWidth={1.8} />
                </span>
                <span>
                  <p className="eyebrow">Your way to browse</p>
                  <h2>Find a design</h2>
                </span>
              </div>
              {(filters.search ||
                filters.collectionSlug ||
                filters.sizeCode ||
                filters.sort !== "featured") && (
                <Link className="shop-filters__clear" href="/shop">
                  <X aria-hidden="true" size={16} strokeWidth={1.8} />
                  Clear filters
                </Link>
              )}
            </div>
            <div className="shop-filters__fields">
              {filters.collectionSlug ? (
                <input name="collection" type="hidden" value={filters.collectionSlug} />
              ) : null}
              <div className="catalogue-filters__field shop-search-field">
                <label htmlFor="catalogue-search">Search designs</label>
                <div className="shop-search-field__control">
                  <Search aria-hidden="true" size={18} strokeWidth={1.8} />
                  <input
                    autoComplete="off"
                    defaultValue={filters.search}
                    id="catalogue-search"
                    maxLength={80}
                    name="q"
                    placeholder="Colour, style, or name"
                    type="search"
                  />
                </div>
              </div>
              <div className="catalogue-filters__field">
                <label htmlFor="catalogue-size">Available size</label>
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
                <Search aria-hidden="true" size={17} strokeWidth={1.9} />
                Apply filters
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
              <ProductGrid priorityFirstImage products={result.data.products} />
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
