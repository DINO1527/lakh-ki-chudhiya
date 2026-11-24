import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import type {
  PublicCollection,
  PublicProduct,
  PublicStorefrontOffer,
} from "@/features/products/domain/catalogue";
import { CollectionFeatureCarousel } from "./collection-feature-carousel";
import { OfferFeatureCarousel } from "./offer-feature-carousel";
import { ProductGrid } from "@/features/products/components/product-card";
import styles from "./homepage-sections.module.css";

const introductionValues = [
  {
    number: "01",
    title: "Handmade lac",
    description: "Lac shaped and finished by hand, with a polished character all its own.",
    image: "/brand/lacora-home-burgundy-story.webp",
    alt: "A ruby and ivory lac bangle set worn with a burgundy outfit.",
    position: "58% center",
  },
  {
    number: "02",
    title: "Colour with character",
    description: "Rich tones, soft pastels, and fine details give each design its own mood.",
    image: "/brand/lacora-colour-rose.webp",
    alt: "A blush pink and ivory bangle set worn against a rose-coloured background.",
    position: "62% center",
  },
  {
    number: "03",
    title: "A circle of your own",
    description: "Explore colours and sizes to find a style that feels naturally yours.",
    image: "/brand/lacora-colour-teal.webp",
    alt: "A teal, cream, and gold bangle set shown on the wrist.",
    position: "30% center",
  },
] as const;

export function HomeValuesIntroduction() {
  return (
    <ScrollReveal delayMs={50}>
      <section aria-labelledby="values-title" className={styles.valuesSection} id="our-story">
        <div className={styles.introductionHead}>
          <div className={styles.introCopy}>
            <p className={styles.eyebrow}>Lacora · handcrafted lac bangles</p>
            <h2 id="values-title">The art of wearing colour.</h2>
          </div>
          <div className={styles.introLead}>
            <p>
              A little colour, shaped by hand and chosen to feel like your own. Explore the details,
              stories, and designs behind every circle.
            </p>
            <Link className={styles.introLink} href="/craft">
              Discover the craft <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
        <ul aria-label="What makes Lacora" className={styles.valueGrid}>
          {introductionValues.map((value) => (
            <li className={styles.valueCard} key={value.number}>
              <figure className={styles.valueImageFrame}>
                <Image
                  alt={value.alt}
                  className={styles.valueImage}
                  fill
                  sizes="(max-width: 42rem) 92vw, (max-width: 58rem) 45vw, 28rem"
                  src={value.image}
                  style={{ objectPosition: value.position }}
                  unoptimized
                />
                <span aria-hidden="true" className={styles.valueNumber}>
                  {value.number}
                </span>
              </figure>
              <div className={styles.valueCopy}>
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </ScrollReveal>
  );
}

export function HomeDiscovery({
  collections,
  collectionStatus,
  offers,
  offerStatus,
}: {
  collections: readonly PublicCollection[];
  collectionStatus: "ready" | "unconfigured" | "error";
  offers: readonly PublicStorefrontOffer[];
  offerStatus: "ready" | "unconfigured" | "error";
}) {
  return (
    <section aria-labelledby="discover-title" className={styles.discovery}>
      <ScrollReveal>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>A considered beginning</p>
            <h2 id="discover-title">Discover Lacora</h2>
          </div>
          <p>Explore what is here today, and what is being shaped for tomorrow.</p>
        </div>
      </ScrollReveal>

      <div
        aria-label="Offers, collections, and custom designs"
        className={styles.featureRail}
        role="group"
        tabIndex={0}
      >
        <ScrollReveal className={styles.featureCell} delayMs={0}>
          <article className={`${styles.featureCard} ${styles.offerCard}`}>
            <OfferFeatureCarousel offers={offers} status={offerStatus} />
          </article>
        </ScrollReveal>

        <ScrollReveal className={styles.featureCell} delayMs={90}>
          <article className={`${styles.featureCard} ${styles.collectionCard}`}>
            <CollectionFeatureCarousel collections={collections} status={collectionStatus} />
          </article>
        </ScrollReveal>

        <ScrollReveal className={styles.featureCell} delayMs={180}>
          <article className={`${styles.featureCard} ${styles.customCard}`}>
            <div aria-hidden="true" className={styles.customArtwork}>
              <span>Lacora</span>
            </div>
            <div className={styles.cardCopy}>
              <p className={styles.cardKicker}>Custom designs</p>
              <h3>A colour story of your own.</h3>
              <p>
                Custom requests are not open yet. Browse the published styles while we shape that
                next step.
              </p>
              <Link className={styles.cardLinkLight} href="/collections">
                Browse collections <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <span className={styles.comingSoon}>Coming soon</span>
          </article>
        </ScrollReveal>
      </div>
    </section>
  );
}

export function HomePublishedDesigns({
  products,
  status,
}: {
  products: readonly PublicProduct[];
  status: "ready" | "unconfigured" | "error";
}) {
  const emptyCopy =
    status === "ready"
      ? {
          title: "No published designs just yet.",
          body: "New designs will appear here once their photos, sizes, and details are ready.",
        }
      : status === "unconfigured"
        ? {
            title: "The catalogue is not connected in this environment.",
            body: "Published designs will appear here when the store database is available.",
          }
        : {
            title: "The catalogue could not load.",
            body: "Please try again shortly, or browse the shop for current availability.",
          };

  return (
    <section aria-labelledby="published-designs-title" className={styles.publishedDesigns}>
      <ScrollReveal>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Made to be worn</p>
            <h2 id="published-designs-title">Published designs</h2>
          </div>
          <Link className={styles.designsMore} href="/shop">
            View all designs <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </ScrollReveal>

      {products.length > 0 ? (
        <ScrollReveal delayMs={80}>
          <ProductGrid ariaLabel="Published Lacora bangle designs" products={products} />
        </ScrollReveal>
      ) : (
        <ScrollReveal delayMs={80}>
          <div
            aria-live="polite"
            className={styles.designsEmpty}
            data-status={status}
            role="status"
          >
            <div aria-hidden="true" className={styles.designsEmptyMark}>
              Lacora
            </div>
            <div>
              <h3>{emptyCopy.title}</h3>
              <p>{emptyCopy.body}</p>
              <Link href="/shop">
                Explore the shop <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      )}
    </section>
  );
}

export function HomeCraftStory() {
  return (
    <ScrollReveal delayMs={60}>
      <section aria-labelledby="craft-title" className={styles.craft} id="craft-process">
        <div className={styles.craftCopy}>
          <p className={styles.eyebrow}>A craft with many stories</p>
          <h2 id="craft-title">Made of colour, detail, and a practiced hand.</h2>
          <p>
            Lac bangle-making has many regional expressions. The material can be shaped, coloured,
            and finished in distinctive ways; each pattern carries the mark of its maker.
          </p>
          <Link className={styles.craftLink} href="/craft">
            Explore lac bangle craft <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <figure className={styles.craftFigure}>
          <div className={styles.craftFrame}>
            <Image
              alt="A hand holding stacked ruby and ivory lac bangles with fine gold ornamentation."
              className={styles.craftImage}
              fill
              sizes="(max-width: 58rem) 82vw, 34vw"
              src="/brand/lacora-craft-reference.png"
              unoptimized
            />
          </div>
          <figcaption>A bangle reference with fine ruby, ivory, and gold detail.</figcaption>
        </figure>
      </section>
    </ScrollReveal>
  );
}

export function HomeShoppingIntroduction() {
  return (
    <ScrollReveal delayMs={60}>
      <section aria-labelledby="shopping-title" className={styles.shopping}>
        <div className={styles.shoppingCopy}>
          <p className={styles.eyebrow}>Find your Lacora</p>
          <h2 id="shopping-title">Take your time. Find the circle that feels right.</h2>
          <p>
            Browse published designs, explore colour stories, and check the size guide before you
            choose. Product details appear as each design is confirmed.
          </p>
          <div className={styles.shoppingActions}>
            <Link className={styles.shoppingPrimary} href="/shop">
              Shop all designs <span aria-hidden="true">↗</span>
            </Link>
            <Link className={styles.shoppingSecondary} href="/size-guide">
              Find your size
            </Link>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
