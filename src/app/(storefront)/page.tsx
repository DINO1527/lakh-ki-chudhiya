import { HomeHero } from "@/features/content/components/home-hero";
import { HomePageSections } from "@/features/content/components/home-page-sections";
import { getPublishedHomepageHero } from "@/features/content/server/homepage";
import { getPublicHomeCatalogue } from "@/features/products/server/public-catalogue";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [catalogue, hero] = await Promise.all([
    getPublicHomeCatalogue(),
    getPublishedHomepageHero(),
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
      <HomePageSections catalogueResult={catalogue} />
    </main>
  );
}
