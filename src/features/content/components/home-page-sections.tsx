import Image from "next/image";
import Link from "next/link";
import type { PublicHomeCatalogue } from "@/features/products/domain/catalogue";
import type { PublicQueryResult as PublicServiceResult } from "@/features/products/server/public-catalogue";
import { CatalogueNotice } from "@/features/products/components/catalogue-notice";
import { ProductGrid } from "@/features/products/components/product-card";
import { OfferCarousel } from "@/features/promotions/components/offer-carousel";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { BangleFallback } from "./bangle-experience";
import styles from "./home-page-sections.module.css";

export function HomePageSections({
  catalogueResult,
}: {
  catalogueResult: PublicServiceResult<PublicHomeCatalogue>;
}) {
  const catalogue = catalogueResult.status === "ready" ? catalogueResult.data : null;

  return (
    <>
      {catalogue ? <OfferCarousel offers={catalogue.offers} /> : null}
      <BenefitsStrip />
      <CollectionProductShelves result={catalogueResult} />
      <ScrollReveal>
        <CraftsmanshipSection />
      </ScrollReveal>
    </>
  );
}

function BenefitsStrip() {
  return (
    <div aria-label="Shopping information" className={styles.benefits}>
      <ul className={styles.benefits__inner}>
        <li className={styles.benefit}>
          <span className={styles.benefitIconBadge}>
            <BenefitIcon kind="sparkle" />
          </span>
          <span>Handcrafted designs</span>
        </li>
        <li className={styles.benefit}>
          <span className={styles.benefitIconBadge}>
            <BenefitIcon kind="ruler" />
          </span>
          <Link href="/size-guide">Find your size</Link>
        </li>
        <li className={styles.benefit}>
          <span className={styles.benefitIconBadge}>
            <BenefitIcon kind="grid" />
          </span>
          <Link href="/shop#catalogue-collection">Browse by collection</Link>
        </li>
      </ul>
    </div>
  );
}

function BenefitIcon({ kind }: { kind: "sparkle" | "ruler" | "grid" }) {
  const common = {
    "aria-hidden": true as const,
    className: styles.benefitIcon,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.6,
    viewBox: "0 0 24 24",
  };

  if (kind === "sparkle") {
    return (
      <svg {...common}>
        <path d="M12 3.5 14 9.8l6.5 2.2-6.5 2.1-2 6.4-2.1-6.4L3.5 12l6.4-2.2L12 3.5Z" />
        <path d="m19.4 3.5.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1Z" />
      </svg>
    );
  }

  if (kind === "ruler") {
    return (
      <svg {...common}>
        <path d="m4.2 15.8 11.6-11.6a1.8 1.8 0 0 1 2.5 0l1.5 1.5a1.8 1.8 0 0 1 0 2.5L8.2 19.8a1.8 1.8 0 0 1-2.5 0l-1.5-1.5a1.8 1.8 0 0 1 0-2.5Z" />
        <path d="m14.2 7.3 2.5 2.5m-5.2 0 1.7 1.7m-4.4.8 2.5 2.5m-5.2 0 1.7 1.7" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect height="7" rx="1.2" width="7" x="3.5" y="3.5" />
      <rect height="7" rx="1.2" width="7" x="13.5" y="3.5" />
      <rect height="7" rx="1.2" width="7" x="3.5" y="13.5" />
      <rect height="7" rx="1.2" width="7" x="13.5" y="13.5" />
    </svg>
  );
}

function CollectionProductShelves({
  result,
}: {
  result: PublicServiceResult<PublicHomeCatalogue>;
}) {
  if (result.status !== "ready") {
    return (
      <section
        aria-labelledby="home-catalogue-title"
        className={styles.shelves}
        id="home-catalogue"
      >
        <h2 className={styles.visuallyHidden} id="home-catalogue-title">
          Shop by collection
        </h2>
        <CatalogueNotice state={result.status} />
      </section>
    );
  }

  const shelves = result.data.shelves;
  if (shelves.length === 0) {
    return (
      <section
        aria-labelledby="home-catalogue-title"
        className={styles.shelves}
        id="home-catalogue"
      >
        <div className={styles.catalogueEmpty}>
          <span aria-hidden="true" className={styles.emptyMark}>
            <BangleFallback />
          </span>
          <div>
            <p className={styles.shelfEyebrow}>The Lacora catalogue</p>
            <h2 id="home-catalogue-title">A collection for every little moment.</h2>
            <p>Browse the shop for published designs and their available sizes.</p>
            <Link href="/shop">
              Explore all designs <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div aria-label="Shop by collection" className={styles.shelves} id="home-catalogue">
      {shelves.map(({ collection, products }) => (
        <section className={styles.collectionShelf} key={collection.id}>
          <div className={styles.shelfHeading}>
            <div>
              <p className={styles.shelfEyebrow}>Shop by collection</p>
              <h2>{collection.name}</h2>
            </div>
            <Link href={`/shop?collection=${encodeURIComponent(collection.slug)}`}>
              View collection <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <ProductGrid ariaLabel={`${collection.name} products`} products={products} />
        </section>
      ))}
    </div>
  );
}

function CraftsmanshipSection() {
  return (
    <section aria-labelledby="craftsmanship-title" className={styles.craft} id="craftsmanship">
      <div className={styles.craft__image}>
        <picture>
          <source
            media="(max-width: 767px)"
            srcSet="/images/home/handcrafted-lac-bangle-workshop-mobile.webp"
            type="image/webp"
          />
          <Image
            alt="Hands working coloured lac bangles around a wooden shaping tool on an artisan workbench."
            className={styles.craft__photo}
            height={810}
            priority={false}
            sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 640px"
            src="/images/home/handcrafted-lac-bangle-workshop.webp"
            unoptimized
            width={1440}
          />
        </picture>
      </div>
      <div className={styles.craft__copy}>
        <p className={styles.craft__eyebrow}>Our craftsmanship</p>
        <h2 id="craftsmanship-title">Made with intention.</h2>
        <p>
          From shaping coloured lac to finishing intricate details, discover the artistry behind
          traditional lac bangles.
        </p>
        <p className={styles.craft__caption}>
          This image is an illustration and does not depict a verified Lacora supplier.
        </p>
      </div>
    </section>
  );
}
