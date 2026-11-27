"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Sparkles, Tag } from "lucide-react";
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
          <span aria-hidden="true" className={styles.imageWash} />
          <span className={styles.imageBadge}>
            <Tag aria-hidden="true" size={15} strokeWidth={1.9} />
            Current offer
          </span>
        </Link>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>
            <Sparkles aria-hidden="true" size={15} strokeWidth={1.8} />A little something for you
          </p>
          <p className={styles.discount}>
            <span>{formatDiscountPercent(offer.discountBasisPoints)}%</span>
            <span>off</span>
          </p>
          <h2>{offer.name}</h2>
          <p className={styles.terms}>{describeOfferTerms(offer)}</p>
          <Link className={styles.cta} href={targetHref}>
            Shop this offer <ArrowUpRight aria-hidden="true" size={17} strokeWidth={2} />
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
        <div aria-label="Offer slides" className={styles.controls} role="group">
          <button
            aria-label="Previous offer"
            className={styles.arrow}
            onClick={() => step(-1)}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={17} strokeWidth={1.8} />
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
            <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
          </button>
        </div>
      ) : null}
    </section>
  );
}
