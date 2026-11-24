"use client";

import Image from "next/image";
import Link from "next/link";
import { AutoSwipeCarousel } from "@/components/shared/auto-swipe-carousel";
import type { PublicCollection } from "@/features/products/domain/catalogue";
import styles from "./homepage-sections.module.css";

type CollectionFeatureCarouselProps = {
  collections: readonly PublicCollection[];
  status: "ready" | "unconfigured" | "error";
};

export function CollectionFeatureCarousel({ collections, status }: CollectionFeatureCarouselProps) {
  const emptyCopy =
    status === "ready"
      ? {
          title: "No published collections just yet.",
          body: "Browse the shop to see designs currently available.",
        }
      : status === "unconfigured"
        ? {
            title: "Collections are not connected in this environment.",
            body: "Published collections will appear here when the store database is available.",
          }
        : {
            title: "Collections are temporarily unavailable.",
            body: "We could not load the published collection details. Please try again shortly.",
          };

  return (
    <AutoSwipeCarousel
      ariaLabel="Published bangle collections"
      getItemKey={(collection) => collection.id}
      items={collections}
      label="Collections"
      renderEmpty={() => (
        <div className={styles.collectionEmpty}>
          <div aria-hidden="true" className={styles.collectionEmptyArt}>
            <span>Curated colour stories</span>
          </div>
          <div className={styles.collectionEmptyCopy}>
            <h3>{emptyCopy.title}</h3>
            <p>{emptyCopy.body}</p>
            <Link className={styles.cardLink} href="/collections">
              Visit collections <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      )}
      renderSlide={(collection) => (
        <Link className={styles.collectionSlideLink} href={`/collections/${collection.slug}`}>
          <div className={styles.collectionSlideImage}>
            {collection.images[0] ? (
              <Image
                alt=""
                fill
                sizes="(max-width: 58rem) 82vw, 30vw"
                src={collection.images[0].url}
                unoptimized
              />
            ) : (
              <span aria-hidden="true" className={styles.collectionImageFallback} />
            )}
            <span className={styles.collectionSlideOverlay} />
            <span className={styles.collectionSlideText}>
              <strong>{collection.name}</strong>
              <span>{collection.description || "Explore the designs in this collection."}</span>
            </span>
          </div>
        </Link>
      )}
    />
  );
}
