"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  describeOfferTerms,
  type PublicStorefrontOffer,
} from "@/features/products/domain/catalogue";
import { formatDiscountPercent } from "@/features/products/domain/merchandising";
import styles from "./offer-carousel.module.css";

export function OfferCarousel({ offers }: { offers: readonly PublicStorefrontOffer[] }) {
  const slides = offers.filter((offer) => offer.bannerImage !== null);
  const [activeIndex, setActiveIndex] = useState(0);

  if (slides.length === 0) return null;

  const offer = slides[Math.min(activeIndex, slides.length - 1)];
  if (!offer?.bannerImage) return null;
  const image = offer.bannerImage;

  const targetHref =
    offer.targetType === "product"
      ? `/products/${offer.targetSlug}`
      : `/shop?collection=${encodeURIComponent(offer.targetSlug)}`;
  const step = (direction: -1 | 1) => {
    setActiveIndex((current) => (current + direction + slides.length) % slides.length);
  };

  return (
    <section aria-label="Current offers" className={styles.carousel}>
      <div aria-atomic="true" aria-live="polite" className={styles.slide} key={offer.id}>
        <Link
          aria-label={`Shop the ${offer.name} offer for ${offer.targetName}`}
          className={styles.imageLink}
          href={targetHref}
        >
          <Image
            alt={image.altText}
            className={styles.image}
            fill
            preload={activeIndex === 0}
            sizes="(max-width: 48rem) 100vw, min(80rem, calc(100vw - 3rem))"
            src={image.url}
            unoptimized
          />
        </Link>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>A little something for you</p>
          <p className={styles.discount}>{formatDiscountPercent(offer.discountBasisPoints)}% off</p>
          <h2>{offer.name}</h2>
          <p className={styles.terms}>{describeOfferTerms(offer)}</p>
          <Link className={styles.cta} href={targetHref}>
            Shop this offer <span aria-hidden="true">↗</span>
          </Link>
          {offer.endsAt ? (
            <p className={styles.expiry}>
              Ends{" "}
              <time dateTime={offer.endsAt}>
                {new Intl.DateTimeFormat("en-LK", {
                  dateStyle: "medium",
                  timeZone: "Asia/Colombo",
                }).format(new Date(offer.endsAt))}
              </time>
            </p>
          ) : null}
        </div>
      </div>

      {slides.length > 1 ? (
        <div aria-label="Offer slides" className={styles.controls}>
          <button
            aria-label="Previous offer"
            className={styles.arrow}
            onClick={() => step(-1)}
            type="button"
          >
            <Arrow direction="previous" />
          </button>
          <div className={styles.dots}>
            {slides.map((slide, index) => (
              <button
                aria-current={index === activeIndex ? "true" : undefined}
                aria-label={`Show offer ${index + 1}: ${slide.name}`}
                className={styles.dot}
                key={slide.id}
                onClick={() => setActiveIndex(index)}
                type="button"
              />
            ))}
          </div>
          <button
            aria-label="Next offer"
            className={styles.arrow}
            onClick={() => step(1)}
            type="button"
          >
            <Arrow direction="next" />
          </button>
        </div>
      ) : null}
    </section>
  );
}

function Arrow({ direction }: { direction: "previous" | "next" }) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      {direction === "previous" ? <path d="m14.5 5-7 7 7 7" /> : <path d="m9.5 5 7 7-7 7" />}
    </svg>
  );
}
