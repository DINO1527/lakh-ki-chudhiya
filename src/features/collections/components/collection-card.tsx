import Image from "next/image";
import Link from "next/link";
import type { PublicCollection } from "@/features/products/domain/catalogue";

export function CollectionCard({ collection }: { collection: PublicCollection }) {
  return (
    <li className="collection-card">
      <Link className="collection-card__link" href={`/collections/${collection.slug}`}>
        {collection.images[0] ? (
          <Image
            alt={collection.images[0].altText}
            className="collection-card__image"
            height={600}
            src={collection.images[0].url}
            unoptimized
            width={900}
          />
        ) : null}
        {collection.isUatFixture && (
          <span className="fixture-badge">UAT example · not for sale</span>
        )}
        <span className="collection-card__title">{collection.name}</span>
        <span className="collection-card__description">
          {collection.description || "Explore the pieces in this collection."}
        </span>
        <span aria-hidden="true" className="text-link">
          Explore collection <span>→</span>
        </span>
      </Link>
    </li>
  );
}
