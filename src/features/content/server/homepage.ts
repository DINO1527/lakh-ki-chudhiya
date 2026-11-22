import "server-only";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export type HomepageHero = {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
};

export const DEFAULT_HOMEPAGE_HERO: HomepageHero = {
  eyebrow: "Lac bangles, made by hand",
  title: "Colour with a story of its own.",
  body: "We are preparing a thoughtful collection of handcrafted lac bangles. The pieces, sizes and details will be shared here once they are ready.",
  ctaLabel: "Explore the collection",
  ctaHref: "/shop",
};

export async function getPublishedHomepageHero(): Promise<HomepageHero> {
  if (!isSupabaseServerConfigured()) return DEFAULT_HOMEPAGE_HERO;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_content")
    .select("eyebrow, title, body, cta_label, cta_href")
    .eq("content_key", "home_hero")
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) return DEFAULT_HOMEPAGE_HERO;
  return {
    eyebrow: data.eyebrow,
    title: data.title,
    body: data.body,
    ctaLabel: data.cta_label,
    ctaHref: data.cta_href || "/shop",
  };
}
