import { HomeHero } from "@/features/content/components/home-hero";
import {
  HomeCraftStory,
  HomeDiscovery,
  HomePublishedDesigns,
  HomeShoppingIntroduction,
  HomeValuesIntroduction,
} from "@/features/content/components/homepage-sections";
import { getPublishedHomepageHero } from "@/features/content/server/homepage";
import { isUatFixtureSlug } from "@/features/products/domain/catalogue";
import { getPublicShopPage } from "@/features/products/server/public-catalogue";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [catalogue, hero] = await Promise.all([
    getPublicShopPage({
      search: "",
      collectionSlug: "",
      sizeCode: "",
      sort: "featured",
      page: 1,
    }),
    getPublishedHomepageHero(),
  ]);

  const collections =
    catalogue.status === "ready"
      ? catalogue.data.collections
          .filter((collection) => !isUatFixtureSlug(collection.slug))
          .slice(0, 8)
      : [];
  const products =
    catalogue.status === "ready"
      ? catalogue.data.products.filter((product) => !product.isUatFixture).slice(0, 4)
      : [];

  return (
    <main className="home-page" id="main-content">
      <HomeHero
        body={hero.body}
        ctaHref={hero.ctaHref}
        ctaLabel={hero.ctaLabel}
        eyebrow={hero.eyebrow}
        title={hero.title}
      />

      <HomeValuesIntroduction />
      <HomeDiscovery
        collections={collections}
        collectionStatus={catalogue.status}
        offerStatus={catalogue.status}
        offers={catalogue.status === "ready" ? catalogue.data.offers : []}
      />
      <HomeCraftStory />
      <HomePublishedDesigns products={products} status={catalogue.status} />
      <HomeShoppingIntroduction />
    </main>
  );
}
