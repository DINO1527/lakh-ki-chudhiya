import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { CatalogueNotice, UatFixtureNotice } from "@/features/products/components/catalogue-notice";
import { CataloguePagination } from "@/features/products/components/catalogue-pagination";
import { ProductGrid } from "@/features/products/components/product-card";
import {
  buildCataloguePageHref,
  normalizeCatalogueFilters,
  type CatalogueSearchParams,
  type PublicCollection,
} from "@/features/products/domain/catalogue";
import {
  getPublicShopPage,
  type PublicQueryResult,
  type PublicShopPage,
} from "@/features/products/server/public-catalogue";

type CollectionPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<CatalogueSearchParams>;
};

type CollectionPageData = Omit<PublicShopPage, "selectedCollection"> & {
  selectedCollection: PublicCollection;
};

type CollectionPageResult = PublicQueryResult<CollectionPageData | null>;

export const dynamic = "force-dynamic";

async function loadPageData(props: CollectionPageProps): Promise<CollectionPageResult> {
  const [{ slug }, searchParams] = await Promise.all([props.params, props.searchParams]);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { status: "ready", data: null };

  const filters = normalizeCatalogueFilters({ ...searchParams, collection: slug });
  const result = await getPublicShopPage(filters);
  if (result.status !== "ready") return { status: result.status };
  if (!result.data.selectedCollection) return { status: "ready", data: null };

  return {
    status: "ready",
    data: {
      ...result.data,
      selectedCollection: result.data.selectedCollection,
    },
  };
}

export async function generateMetadata(props: CollectionPageProps): Promise<Metadata> {
  const result = await loadPageData(props);
  if (result.status !== "ready" || !result.data) {
    return { title: "Collection | Lakh Ki Chudhiya" };
  }

  return {
    title: `${result.data.selectedCollection.name} | Lakh Ki Chudhiya`,
    description:
      result.data.selectedCollection.description ||
      `Explore published designs in ${result.data.selectedCollection.name}.`,
    robots: result.data.selectedCollection.isUatFixture
      ? { index: false, follow: false }
      : undefined,
  };
}

export default async function CollectionPage(props: CollectionPageProps) {
  const result = await loadPageData(props);
  if (result.status === "ready") {
    if (!result.data) notFound();
    const collection = result.data.selectedCollection;
    const page = result.data;
    const nextPageHref = buildCataloguePageHref(
      page.filters,
      page.totalPages,
      `/collections/${collection.slug}`,
    );
    if (page.filters.page > page.totalPages) redirect(nextPageHref);

    return (
      <main className="page-shell" id="main-content">
        <nav aria-label="Breadcrumb" className="breadcrumbs">
          <Link href="/collections">Collections</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{collection.name}</span>
        </nav>
        <p className="eyebrow">Collection</p>
        <h1 className="page-heading">{collection.name}</h1>
        {collection.description && <p className="page-intro">{collection.description}</p>}
        {collection.isUatFixture && <UatFixtureNotice />}
        <p aria-live="polite" className="catalogue-result-count" role="status">
          {page.totalCount} {page.totalCount === 1 ? "design" : "designs"}
        </p>
        {page.products.length > 0 ? (
          <ProductGrid products={page.products} />
        ) : (
          <EmptyState title="No published designs in this collection yet">
            Visit the <Link href="/shop">full catalogue</Link> or read the{" "}
            <Link href="/size-guide">size guide</Link>.
          </EmptyState>
        )}
        <CataloguePagination
          basePath={`/collections/${collection.slug}`}
          filters={page.filters}
          totalPages={page.totalPages}
        />
      </main>
    );
  }

  return (
    <main className="page-shell" id="main-content">
      <p className="eyebrow">Collection</p>
      <h1 className="page-heading">Collection unavailable</h1>
      <CatalogueNotice state={result.status} />
    </main>
  );
}
