import Image from "next/image";
import Link from "next/link";
import type { PublicCollection } from "@/features/products/domain/catalogue";

export function CollectionCard({ collection }: { collection: PublicCollection }) {
  return (
    <li className="collection-card">
      <Link
        className="collection-card__link"
        href={`/shop?collection=${encodeURIComponent(collection.slug)}`}
      >
        <span className="collection-card__media">
          {collection.images[0] ? (
            <Image
              alt={collection.images[0].altText}
              className="collection-card__image"
              fill
              sizes="(max-width: 48rem) 88vw, (max-width: 80rem) 42vw, 27rem"
              src={collection.images[0].url}
              unoptimized
            />
          ) : (
            <span aria-hidden="true" className="collection-card__image-placeholder">
              <span>L</span>
            </span>
          )}
        </span>
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
