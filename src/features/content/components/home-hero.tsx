"use client";

import Link from "next/link";
import { ArrowUpRight, ArrowDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { WaveDivider } from "@/components/shared/wave-divider";
import { BangleExperience } from "./bangle-experience";

type HomeHeroProps = {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
};

export function HomeHero({ eyebrow, title, body, ctaLabel, ctaHref }: HomeHeroProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const copyRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [introComplete, setIntroComplete] = useState(false);
  const [introStarted, setIntroStarted] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [fallbackRequired, setFallbackRequired] = useState(false);
  const [foregroundSafe, setForegroundSafe] = useState(false);
  const [atmosphereActive, setAtmosphereActive] = useState(false);
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    let visible = false;
    const update = () => setAtmosphereActive(visible && document.visibilityState === "visible");
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(hero);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const handleIntroStart = useCallback(() => setIntroStarted(true), []);
  const handleIntroComplete = useCallback(() => setIntroComplete(true), []);
  const handleSceneReady = useCallback((ready: boolean) => setSceneReady(ready), []);
  const handleFallbackRequired = useCallback(
    (required: boolean) => setFallbackRequired(required),
    [],
  );
  const handleForegroundSafe = useCallback((safe: boolean) => setForegroundSafe(safe), []);

  return (
    <section
      data-home-tone="dark"
      aria-labelledby="home-title"
      className={[
        "home-hero",
        introStarted ? "has-intro-started" : "",
        introStarted && !introComplete ? "is-intro-running" : "",
        introComplete ? "is-intro-complete" : "",
        sceneReady ? "is-scene-ready" : "",
        foregroundSafe ? "is-bangle-foreground-safe" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      ref={heroRef}
      data-atmosphere-active={atmosphereActive}
    >
      <svg
        aria-hidden="true"
        className="hero-threads"
        viewBox="0 0 1440 800"
        preserveAspectRatio="none"
      >
        <g fill="none">
          {Array.from({ length: 18 }, (_, index) => index).map((strand) => (
            <path
              key={strand}
              className="hero-threads__strand"
              style={{ animationDelay: `${strand * -2}s` }}
              d={`M-120 ${140 + strand * 33} C220 ${80 + strand * 32}, 400 ${640 + strand * 12}, 750 ${190 + strand * 29} S1100 ${30 + strand * 28}, 1560 ${100 + strand * 34}`}
            />
          ))}
          <path
            className="hero-threads__arc"
            d="M-80 200C280 -40 440 120 740 190S1210 460 1500 60"
          />
          <path
            className="hero-threads__arc"
            d="M-80 212C280 -28 440 132 740 202S1210 472 1500 72"
          />
        </g>
      </svg>
      <div className="home-hero__copy" ref={copyRef}>
        <p className="home-hero__eyebrow">
          <span aria-hidden="true" className="home-hero__eyebrow-line" />
          {eyebrow}
        </p>
        <h1 className="home-hero__title" id="home-title">
          {title}
        </h1>
        <p className="home-hero__description">{body}</p>
        <div className="home-hero__actions">
          <Link className="button home-hero__button" href={ctaHref}>
            {ctaLabel}
            <ArrowUpRight aria-hidden="true" size={18} />
          </Link>
          <Link className="home-hero__story-link" href="#craftsmanship">
            Our craftsmanship <ArrowDown aria-hidden="true" size={16} />
          </Link>
        </div>
        <div className="home-hero__footnote">
          <span aria-hidden="true" className="home-hero__footnote-rule" />
          Made by hand. Made to feel like you.
        </div>
      </div>

      <div
        aria-label="Five handcrafted Lacora bangles in burgundy, ivory and woven ruby"
        className="home-hero__art"
        ref={stageRef}
        role="img"
      >
        {fallbackRequired && (
          <span className="home-hero__scene-note">Explore the artistry of lac.</span>
        )}
      </div>

      <BangleExperience
        copyRef={copyRef}
        heroRef={heroRef}
        onForegroundSafe={handleForegroundSafe}
        onIntroComplete={handleIntroComplete}
        onIntroStart={handleIntroStart}
        onSceneReady={handleSceneReady}
        onFallbackRequired={handleFallbackRequired}
        stageRef={stageRef}
      />

      <WaveDivider placement="hero" />
    </section>
  );
}
