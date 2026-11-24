"use client";

import Link from "next/link";
import { AutoSwipeCarousel } from "@/components/shared/auto-swipe-carousel";
import type { PublicStorefrontOffer } from "@/features/products/domain/catalogue";
import styles from "./homepage-sections.module.css";

type OfferFeatureCarouselProps = {
  offers: readonly PublicStorefrontOffer[];
  status: "ready" | "unconfigured" | "error";
};

export function OfferFeatureCarousel({ offers, status }: OfferFeatureCarouselProps) {
  const emptyCopy =
    status === "ready"
      ? {
          title: "No active offers just now.",
          body: "Confirmed offers will appear here while they are available.",
        }
      : status === "unconfigured"
        ? {
            title: "Offers are not connected in this environment.",
            body: "Current offers will appear here when the store database is available.",
          }
        : {
            title: "Offers are temporarily unavailable.",
            body: "We could not load current offer details. Browse the shop for published designs.",
          };

  return (
    <AutoSwipeCarousel
      ariaLabel="Current Lacora offers"
      getItemKey={(offer) => offer.id}
      items={offers}
      label="Offers"
      renderEmpty={() => (
        <div className={styles.offerEmpty}>
          <div aria-hidden="true" className={styles.offerEmptyArt}>
            <span>GOOD THINGS, WHEN THEY COME</span>
          </div>
          <div className={styles.offerEmptyCopy}>
            <h3>{emptyCopy.title}</h3>
            <p>{emptyCopy.body}</p>
            <Link className={styles.cardLink} href="/shop">
              Explore the shop <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      )}
      renderSlide={(offer) => {
        const discount = new Intl.NumberFormat("en-LK", { maximumFractionDigits: 2 }).format(
          offer.discountBasisPoints / 100,
        );
        const href =
          offer.targetType === "product"
            ? `/products/${offer.targetSlug}`
            : `/collections/${offer.targetSlug}`;

        return (
          <article className={styles.offerSlide}>
            <div aria-hidden="true" className={styles.offerArtwork}>
              <span className={styles.offerOrbit} />
              <span className={styles.offerOrbitInner} />
              <span className={styles.offerDiscount}>{discount}%</span>
              <span className={styles.offerOff}>off</span>
            </div>
            <div className={styles.offerSlideCopy}>
              <p className={styles.offerName}>{offer.name}</p>
              <h3>{offer.targetName}</h3>
              <p className={styles.offerTerms}>On eligible {offer.targetType} designs</p>
              <p className={styles.offerTerms}>With {offer.minimumSets} or more complete sets</p>
              <Link className={styles.cardLink} href={href}>
                Explore offer <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </article>
        );
      }}
    />
  );
}
