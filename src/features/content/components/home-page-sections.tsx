import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Sparkles, ShoppingBag, Ruler, Layers } from "lucide-react";
import { ProductGrid } from "@/features/products/components/product-card";
import type { PublicProduct, PublicHomeCatalogue } from "@/features/products/domain/catalogue";
import type { PublicQueryResult } from "@/features/products/server/public-catalogue";
import { CatalogueNotice } from "@/features/products/components/catalogue-notice";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { HomeRail } from "./home-rail";
import { HomeMotion } from "./home-motion";
import { HomeOffers } from "./home-offers";
import styles from "./home-page-sections.module.css";

export function HomePageSections({
  catalogueResult,
  arrivals,
}: {
  arrivals: PublicQueryResult<readonly PublicProduct[]>;
  catalogueResult: PublicQueryResult<PublicHomeCatalogue>;
}) {
  const catalogue = catalogueResult.status === "ready" ? catalogueResult.data : null;
  const benefits = [
    {
      icon: Sparkles,
      title: "Handcrafted designs",
      href: "#craftsmanship",
    },
    {
      icon: ShoppingBag,
      title: "Shop online",
      href: "/shop",
    },
    {
      icon: Ruler,
      title: "Find your size",
      href: "/size-guide",
    },
    {
      icon: Layers,
      title: "Browse collections",
      href: "/collections",
    },
  ];
  return (
    <HomeMotion>
      <section
        className={styles.collections}
        data-home-tone="light"
        id="home-catalogue"
        aria-labelledby="collections-title"
      >
        <ScrollReveal>
          <p className={styles.eyebrow}>FIND YOUR COLOUR</p>
          <h2 id="collections-title">Our collections.</h2>
        </ScrollReveal>
        {catalogueResult.status !== "ready" ? (
          <CatalogueNotice state={catalogueResult.status} />
        ) : catalogue?.collections.length ? (
          <HomeRail label="collections">
            {catalogue.collections.map((collection, index) => (
              <ScrollReveal delayMs={Math.min(index, 3) * 70} key={collection.id}>
                <Link
                  className={styles.collectionCard}
                  href={`/collections/${encodeURIComponent(collection.slug)}`}
                >
                  <div className={styles.collectionImage}>
                    {collection.images[0] ? (
                      <Image
                        src={collection.images[0].url}
                        alt={collection.images[0].altText}
                        fill
                        unoptimized
                        sizes="(max-width: 600px) 85vw, 33vw"
                      />
                    ) : (
                      <span className={styles.monogram} aria-hidden="true">
                        L
                      </span>
                    )}
                  </div>
                  <h3>
                    {collection.name}
                    <ArrowUpRight aria-hidden="true" size={20} />
                  </h3>
                </Link>
              </ScrollReveal>
            ))}
          </HomeRail>
        ) : (
          <p className={styles.empty}>
            New collections will appear here when published.{" "}
            <Link href="/shop">
              Explore the shop <ArrowUpRight size={16} />
            </Link>
          </p>
        )}
      </section>
      <section className={styles.arrivals} data-home-tone="light" aria-labelledby="arrivals-title">
        <ScrollReveal>
          <h2 id="arrivals-title">Latest arrivals.</h2>
        </ScrollReveal>
        {arrivals.status !== "ready" ? (
          <CatalogueNotice state={arrivals.status} />
        ) : arrivals.data.length ? (
          <ScrollReveal>
            <ProductGrid products={arrivals.data} ariaLabel="Latest arrivals" />
          </ScrollReveal>
        ) : (
          <p className={styles.empty}>New designs will appear here when published.</p>
        )}
      </section>
      {catalogue && <HomeOffers offers={catalogue.offers} />}
      <section
        className={styles.story}
        data-home-tone="dark"
        id="craftsmanship"
        aria-labelledby="craftsmanship-title"
      >
        <ScrollReveal className={styles.storyImages}>
          <div className={styles.storyLarge}>
            <Image
              src="/images/home/handcrafted-lac-bangle-workshop.webp"
              alt="Illustration of traditional lac bangle craftsmanship at a workbench."
              fill
              unoptimized
              sizes="(max-width: 768px) 90vw, 50vw"
            />
          </div>
          <div className={styles.storyDetail}>
            <Image src="/brand/lacora-colour-teal.webp" alt="" fill unoptimized sizes="35vw" />
          </div>
          <div className={styles.storySwatch}>
            <Image src="/brand/lacora-colour-rose.webp" fill sizes="25vw" alt="" />
          </div>
        </ScrollReveal>
        <ScrollReveal className={styles.storyCopy}>
          <p className={styles.eyebrow}>COLOUR. CRAFT. CHARACTER.</p>
          <h2 id="craftsmanship-title">
            Made with
            <br />
            <em>intention.</em>
          </h2>
          <p>
            From shaping coloured lac to finishing intricate details, discover the artistry behind
            traditional lac bangles. A celebration of colour, texture and the beauty in small
            things.
          </p>
          <Link href="/shop">
            Find your own story <ArrowUpRight size={19} />
          </Link>
          <small>
            Craft imagery is illustrative and does not depict a verified Lacora supplier.
          </small>
        </ScrollReveal>
      </section>
      <section className={styles.closing} data-home-tone="light">
        <ScrollReveal>
          <p className={styles.eyebrow}>A ROMANCE IN THE CIRCLES</p>
          <h2>
            A little colour.
            <br />
            <em>A little more you.</em>
          </h2>
          <Link className="button" href="/shop">
            Explore the collection <ArrowUpRight aria-hidden="true" size={18} />
          </Link>
        </ScrollReveal>
        <span aria-hidden="true" className={styles.closingCircle} />
      </section>
      <section className={styles.features} data-home-tone="light" aria-label="The Lacora way">
        <div className={styles.featureGrid}>
          {benefits.map(({ icon: Icon, title, href }, index) => (
            <ScrollReveal key={title} delayMs={index * 80}>
              <Link href={href} className={styles.featureCard}>
                <Icon aria-hidden="true" size={28} strokeWidth={1.2} />
                <h3>{title}</h3>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </HomeMotion>
  );
}
