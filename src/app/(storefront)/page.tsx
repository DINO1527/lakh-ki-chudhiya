import Link from "next/link";
import { ProductGrid } from "@/features/products/components/product-card";
import { getPublicShopPage } from "@/features/products/server/public-catalogue";
import { getPublishedHomepageHero } from "@/features/content/server/homepage";
import { BangleExperience } from "@/features/content/components/bangle-experience";
import { CollectionCard } from "@/features/collections/components/collection-card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const catalogue = await getPublicShopPage({
    search: "",
    collectionSlug: "",
    sizeCode: "",
    colourName: "",
    sort: "featured",
    page: 1,
  });
  const hero = await getPublishedHomepageHero();
  const products =
    catalogue.status === "ready"
      ? catalogue.data.products.filter((product) => !product.isUatFixture).slice(0, 3)
      : [];
  const collections =
    catalogue.status === "ready"
      ? catalogue.data.collections.filter((collection) => !collection.isUatFixture).slice(0, 3)
      : [];

  return (
    <main className="home-page" id="main-content">
      <section aria-labelledby="home-title" className="home-hero">
        <div className="home-hero__copy">
          <p className="home-hero__eyebrow">
            <span aria-hidden="true" className="home-hero__eyebrow-line" />
            {hero.eyebrow}
          </p>
          <h1 className="home-hero__title" id="home-title">
            {hero.title}
          </h1>
          <p className="home-hero__description">{hero.body}</p>
          <div className="home-hero__actions">
            <Link className="button home-hero__button" href={hero.ctaHref}>
              {hero.ctaLabel}
              <span aria-hidden="true">↗</span>
            </Link>
            <Link className="home-hero__story-link" href="#our-story">
              The Lacora story <span aria-hidden="true">↓</span>
            </Link>
          </div>
          <div className="home-hero__footnote">
            <span aria-hidden="true" className="home-hero__footnote-rule" />
            Made by hand. Made to feel like you.
          </div>
        </div>

        <div className="home-hero__art">
          <BangleExperience />
        </div>
      </section>

      <section aria-label="The Lacora approach" className="home-values">
        <p className="home-values__intro">The art of wearing colour</p>
        <ul className="home-values__list">
          <li>
            <span>01</span>Handmade lac
          </li>
          <li>
            <span>02</span>Colour with character
          </li>
          <li>
            <span>03</span>A circle of your own
          </li>
        </ul>
      </section>

      {products.length > 0 && (
        <section aria-labelledby="featured-title" className="home-section home-featured">
          <div className="home-section__heading">
            <div>
              <p className="eyebrow">A closer look</p>
              <h2 className="section-title" id="featured-title">
                The Lacora edit
              </h2>
            </div>
            <Link className="text-link" href="/shop">
              Explore all designs <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ProductGrid products={products} />
        </section>
      )}

      {collections.length > 0 && (
        <section aria-labelledby="collections-title" className="home-section home-collections">
          <div className="home-section__heading">
            <div>
              <p className="eyebrow">Find your colour story</p>
              <h2 className="section-title" id="collections-title">
                Made for your moments
              </h2>
            </div>
            <Link className="text-link" href="/collections">
              All collections <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ul aria-label="Bangle collections" className="collection-grid">
            {collections.map((collection) => (
              <CollectionCard collection={collection} key={collection.id} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="story-title" className="home-story" id="our-story">
        <div aria-hidden="true" className="home-story__emblem">
          <span className="home-story__emblem-ring home-story__emblem-ring--outer" />
          <span className="home-story__emblem-ring home-story__emblem-ring--middle" />
          <span className="home-story__emblem-ring home-story__emblem-ring--inner" />
          <span className="home-story__emblem-mark">L</span>
          <span className="home-story__emblem-caption">A romance in the circles</span>
        </div>
        <div className="home-story__copy">
          <p className="eyebrow">A romance in the circles</p>
          <h2 className="section-title" id="story-title">
            An old favourite, seen in a new light.
          </h2>
          <p className="body-copy">
            Lacora is a love letter to the lac bangle: its colour, its character, and the way a
            handmade detail can make an everyday moment feel entirely your own.
          </p>
          <Link className="text-link" href="/collections">
            Explore the colour stories <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {products.length === 0 && (
        <section aria-labelledby="welcome-title" className="home-welcome">
          <div>
            <p className="eyebrow">Coming into view</p>
            <h2 id="welcome-title">The first Lacora collection is taking shape.</h2>
            <p>We’ll share the designs here with their real sizes and prices when they’re ready.</p>
          </div>
          <Link className="home-welcome__link" href="/size-guide">
            Find your bangle size <span aria-hidden="true">↗</span>
          </Link>
        </section>
      )}
    </main>
  );
}
