import Image from "next/image";
import { HomeRail } from "./home-rail";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import Link from "next/link";

import { ArrowUpRight } from "lucide-react";
import {
  describeOfferTerms,
  type PublicStorefrontOffer,
} from "@/features/products/domain/catalogue";
import styles from "./home-page-sections.module.css";
export function HomeOffers({ offers }: { offers: readonly PublicStorefrontOffer[] }) {
  if (!offers.length) return null;
  return (
    <section className={styles.offers} data-home-tone="dark">
      <ScrollReveal>
        <p className={styles.eyebrow}>CURRENT OFFERS</p>
        <h2>The offer edit.</h2>
      </ScrollReveal>
      <HomeRail label="offers">
        {offers.map((offer) => (
          <Link
            className={styles.offerCard}
            key={offer.id}
            href={
              offer.targetType === "product"
                ? `/products/${offer.targetSlug}`
                : `/shop?collection=${encodeURIComponent(offer.targetSlug)}`
            }
          >
            <div className={styles.offerImage}>
              <Image
                fill
                unoptimized
                sizes="(max-width: 650px) 78vw, 31vw"
                src={offer.bannerImage?.url ?? "/brand/lacora-home-burgundy-story.webp"}
                alt={offer.bannerImage?.altText ?? ""}
              />
            </div>
            <div className={styles.offerInfo}>
              <strong>{offer.discountBasisPoints / 100}% off</strong>
              <h3>{offer.name}</h3>
              <p>{describeOfferTerms(offer)}</p>
              {offer.endsAt && (
                <small>
                  Ends{" "}
                  {new Intl.DateTimeFormat("en-LK", {
                    dateStyle: "medium",
                    timeZone: "Asia/Colombo",
                  }).format(new Date(offer.endsAt))}
                </small>
              )}
              <span>
                Explore offer <ArrowUpRight size={18} />
              </span>
            </div>
          </Link>
        ))}
      </HomeRail>
    </section>
  );
}
