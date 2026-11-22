import type { Metadata } from "next";
import { EmptyState } from "@/components/shared/empty-state";
import { CollectionCard } from "@/features/collections/components/collection-card";
import { CatalogueNotice } from "@/features/products/components/catalogue-notice";
import { getPublicCollections } from "@/features/products/server/public-catalogue";

export const metadata: Metadata = {
  title: "Collections | Lakh Ki Chudhiya",
  description: "Explore published collections of handcrafted lac bangles.",
};

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const result = await getPublicCollections();

  return (
    <main className="page-shell" id="main-content">
      <p className="eyebrow">Made to discover</p>
      <h1 className="page-heading">Collections</h1>
      <p className="page-intro">
        Each collection brings together published designs with confirmed details.
      </p>

      {result.status === "ready" ? (
        result.data.length > 0 ? (
          <ul aria-label="Published collections" className="collection-grid">
            {result.data.map((collection) => (
              <CollectionCard collection={collection} key={collection.id} />
            ))}
          </ul>
        ) : (
          <EmptyState title="Our collections are taking shape">
            The first collection will appear here once its pieces and details have been confirmed.
          </EmptyState>
        )
      ) : (
        <CatalogueNotice state={result.status} />
      )}
    </main>
  );
}
