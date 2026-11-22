import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { CatalogueNotice } from "@/features/products/components/catalogue-notice";
import { CataloguePagination } from "@/features/products/components/catalogue-pagination";
import { ProductGrid } from "@/features/products/components/product-card";
import {
  buildCataloguePageHref,
  normalizeCatalogueFilters,
  type CatalogueSearchParams,
} from "@/features/products/domain/catalogue";
import { getPublicShopPage } from "@/features/products/server/public-catalogue";

export const metadata: Metadata = {
  title: "Shop | Lakh Ki Chudhiya",
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

  return (
    <main className="page-shell" id="main-content">
      <p className="eyebrow">The catalogue</p>
      <h1 className="page-heading">Shop bangles</h1>
      <p className="page-intro">
        Explore published designs with available sizes and current details. Product photography will
        appear only after verified images are supplied.
      </p>

      {result.status === "ready" ? (
        <>
          <form action="/shop" className="catalogue-filters" method="get">
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
              <label htmlFor="catalogue-colour">Colour</label>
              <select defaultValue={filters.colourName} id="catalogue-colour" name="colour">
                <option value="">All colours</option>
                {result.data.filterOptions.colourNames.map((colourName) => (
                  <option key={colourName} value={colourName}>
                    {colourName}
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
              Apply filters
            </button>
          </form>

          <p aria-live="polite" className="catalogue-result-count" role="status">
            {result.data.totalCount} {result.data.totalCount === 1 ? "design" : "designs"}
          </p>

          {result.data.products.length > 0 ? (
            <ProductGrid products={result.data.products} />
          ) : (
            <EmptyState title="No published designs match those filters">
              Clear the search or choose another collection. You can also read the{" "}
              <Link href="/size-guide">size guide</Link> while the catalogue is being prepared.
            </EmptyState>
          )}

          <CataloguePagination filters={filters} totalPages={result.data.totalPages} />
        </>
      ) : (
        <CatalogueNotice state={result.status} />
      )}
    </main>
  );
}
