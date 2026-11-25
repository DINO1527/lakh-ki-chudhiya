import { HomeHero } from "@/features/content/components/home-hero";
import { HomePageSections } from "@/features/content/components/home-page-sections";
import {
  getPublicStoreWhatsAppNumber,
  getPublishedHomepageHero,
} from "@/features/content/server/homepage";
import {
  getLatestPublicProducts,
  getPublicCollections,
} from "@/features/products/server/public-catalogue";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [collections, latestProducts, hero, whatsappNumber] = await Promise.all([
    getPublicCollections(),
    getLatestPublicProducts(12),
    getPublishedHomepageHero(),
    getPublicStoreWhatsAppNumber(),
  ]);

  return (
    <main className="home-page" id="main-content">
      <HomeHero
        body={hero.body}
        ctaHref={hero.ctaHref}
        ctaLabel={hero.ctaLabel}
        eyebrow={hero.eyebrow}
        title={hero.title}
      />
      <HomePageSections
        collectionResult={collections}
        latestProductsResult={latestProducts}
        whatsappNumber={whatsappNumber}
      />
    </main>
  );
}
