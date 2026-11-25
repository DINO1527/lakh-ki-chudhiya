import Image from "next/image";
import Link from "next/link";
import type { PublicCollection, PublicProduct } from "@/features/products/domain/catalogue";
import type { PublicQueryResult as PublicServiceResult } from "@/features/products/server/public-catalogue";
import { ProductCard } from "@/features/products/components/product-card";
import { CollectionCard } from "@/features/collections/components/collection-card";
import { StorefrontIcon } from "@/components/storefront/storefront-icon";
import { ResponsiveCarousel } from "@/components/shared/responsive-carousel";
import { SectionHeading } from "@/components/shared/section-heading";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { BangleFallback } from "./bangle-experience";
import styles from "./home-page-sections.module.css";

type CatalogueResult<T> = PublicServiceResult<readonly T[]>;

export function HomePageSections({
  collectionResult,
  latestProductsResult,
  whatsappNumber,
}: {
  collectionResult: CatalogueResult<PublicCollection>;
  latestProductsResult: CatalogueResult<PublicProduct>;
  whatsappNumber: string | null;
}) {
  const collections = collectionResult.status === "ready" ? collectionResult.data : [];
  const latestProducts = latestProductsResult.status === "ready" ? latestProductsResult.data : [];
  const whatsappLink = createWhatsAppLink(whatsappNumber);

  return (
    <>
      <ScrollReveal>
        <BenefitsStrip />
      </ScrollReveal>
      <ScrollReveal>
        <CollectionSection collections={collections} status={collectionResult.status} />
      </ScrollReveal>
      <ScrollReveal>
        <LatestArrivals products={latestProducts} status={latestProductsResult.status} />
      </ScrollReveal>
      <ScrollReveal>
        <CraftsmanshipSection />
      </ScrollReveal>
      <ScrollReveal>
        <SupportCards />
      </ScrollReveal>
      <ScrollReveal>
        <WhatsAppBanner href={whatsappLink} />
      </ScrollReveal>
    </>
  );
}

function BenefitsStrip() {
  return (
    <div aria-label="Shopping information" className={styles.benefits}>
      <ul className={styles.benefits__inner}>
        <li className={styles.benefit}>
          <StorefrontIcon name="gem" size={25} />
          <span>Handcrafted designs</span>
        </li>
        <li className={styles.benefit}>
          <StorefrontIcon name="ruler" size={25} />
          <Link href="/size-guide">Find your size</Link>
        </li>
        <li className={styles.benefit}>
          <StorefrontIcon name="gem" size={25} />
          <Link href="/collections">Browse collections</Link>
        </li>
        <li className={styles.benefit}>
          <StorefrontIcon name="message" size={25} />
          <Link href="#whatsapp-help">Order assistance</Link>
        </li>
      </ul>
    </div>
  );
}

function CollectionSection({
  collections,
  status,
}: {
  collections: readonly PublicCollection[];
  status: CatalogueResult<PublicCollection>["status"];
}) {
  return (
    <section
      aria-labelledby="home-collections-title"
      className={styles.section}
      id="home-collections"
    >
      <SectionHeading
        actionHref="/collections"
        actionLabel="View all collections"
        eyebrow="A considered edit"
        id="home-collections-title"
        title="Shop by collection"
      />
      {collections.length === 0 ? (
        <div className={styles.collectionEmpty}>
          <div aria-hidden="true" className={styles.collectionEmpty__visual}>
            <BangleFallback className={styles.collectionEmpty__model} />
          </div>
          <div className={styles.collectionEmpty__copy}>
            <p className={styles.collectionEmpty__eyebrow}>A considered edit</p>
            <h3>Find a design that feels like you.</h3>
            <p>{getCollectionEmptyMessage(status)}</p>
            <Link href="/collections">
              Browse collections <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      ) : collections.length <= 2 ? (
        <div
          className={`${styles.collectionFeature} ${collections.length === 1 ? styles.collectionFeatureSingle : ""}`}
        >
          <ul aria-label="Published collections" className={styles.collectionFeature__items}>
            {collections.map((collection) => (
              <CollectionCard collection={collection} key={collection.id} />
            ))}
          </ul>
          <CollectionEditorialCard single={collections.length === 1} />
        </div>
      ) : (
        <ResponsiveCarousel label="Collection">
          {collections.map((collection) => (
            <CollectionCard collection={collection} key={collection.id} />
          ))}
        </ResponsiveCarousel>
      )}
    </section>
  );
}

function CollectionEditorialCard({ single }: { single: boolean }) {
  return (
    <article className={`${styles.editorialCard} ${single ? styles.editorialCardSingle : ""}`}>
      <p className={styles.editorialCard__eyebrow}>
        {single ? "THE LACERA EDIT" : "YOUR STYLE, YOUR STORY"}
      </p>
      <h3>{single ? "A little colour goes a long way." : "Find something that feels like you."}</h3>
      <p>
        {single
          ? "Find a handcrafted detail to make your everyday style your own."
          : "Explore our designs for everyday moments and special occasions."}
      </p>
      <Link href={single ? "/shop" : "/size-guide"}>
        {single ? "Explore the shop" : "Find your size"} <span aria-hidden="true">↗</span>
      </Link>
      <span aria-hidden="true" className={styles.editorialCard__ornament} />
    </article>
  );
}

function LatestArrivals({
  products,
  status,
}: {
  products: readonly PublicProduct[];
  status: CatalogueResult<PublicProduct>["status"];
}) {
  return (
    <section
      aria-labelledby="latest-arrivals-title"
      className={`${styles.section} ${styles.latest}`}
      id="latest-arrivals"
    >
      <SectionHeading
        layout="split"
        actionHref="/shop"
        actionLabel="View all designs"
        description="The newest published designs, with their confirmed details and current availability."
        eyebrow="Just published"
        id="latest-arrivals-title"
        title="Latest arrivals"
      />
      {products.length > 0 ? (
        <ResponsiveCarousel className={styles.productTrack} label="Latest arrivals">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ResponsiveCarousel>
      ) : (
        <div className={styles.latestEmpty}>
          <StorefrontIcon name="gem" size={30} />
          <p>{getLatestEmptyMessage(status)}</p>
          <Link href="/shop">Browse the shop</Link>
        </div>
      )}
    </section>
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

function SupportCards() {
  return (
    <section aria-labelledby="home-support-title" className={`${styles.section} ${styles.support}`}>
      <SectionHeading
        eyebrow="Here to help"
        id="home-support-title"
        title="A little help, when you need it."
      />
      <ul className={styles.support__grid}>
        <li>
          <Link className={styles.supportCard} href="/size-guide">
            <StorefrontIcon name="ruler" size={25} />
            <span>
              <strong>Bangle size guide</strong>
              <small>Find the right fit with verified measurements.</small>
            </span>
            <span aria-hidden="true" className={styles.supportCard__arrow}>
              ↗
            </span>
          </Link>
        </li>
        <li>
          <Link className={styles.supportCard} href="/shop">
            <StorefrontIcon name="gem" size={25} />
            <span>
              <strong>Explore current designs</strong>
              <small>See published pieces and their confirmed details.</small>
            </span>
            <span aria-hidden="true" className={styles.supportCard__arrow}>
              ↗
            </span>
          </Link>
        </li>
      </ul>
    </section>
  );
}

function getCollectionEmptyMessage(status: CatalogueResult<PublicCollection>["status"]): string {
  if (status === "ready") return "Browse the published collections and available designs.";
  return "Explore the shop for current designs and their details.";
}

function getLatestEmptyMessage(status: CatalogueResult<PublicProduct>["status"]): string {
  if (status === "ready")
    return "Browse the shop to see published designs and current availability.";
  return "Visit the shop for current designs, details and availability.";
}

function WhatsAppBanner({ href }: { href: string | null }) {
  return (
    <section aria-labelledby="whatsapp-help-title" className={styles.whatsapp} id="whatsapp-help">
      <div className={styles.whatsapp__inner}>
        <div>
          <p className={styles.whatsapp__eyebrow}>Personal assistance</p>
          <h2 id="whatsapp-help-title">Need help choosing?</h2>
        </div>
        {href ? (
          <a href={href} rel="noopener noreferrer" target="_blank">
            <StorefrontIcon name="message" size={22} /> Message us on WhatsApp
          </a>
        ) : (
          <Link href="/shop">
            Explore the shop <span aria-hidden="true">↗</span>
          </Link>
        )}
      </div>
    </section>
  );
}

function createWhatsAppLink(number: string | null): string | null {
  const digits = number?.replace(/\D/g, "") ?? "";
  if (!/^[1-9][0-9]{7,14}$/.test(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent("Hello Lacora, I would like help choosing a bangle.")}`;
}
