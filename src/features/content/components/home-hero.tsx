"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { WaveDivider } from "@/components/shared/wave-divider";
import { BangleExperience, BangleFallback } from "./bangle-experience";

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
    >
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
            <span aria-hidden="true">↗</span>
          </Link>
          <Link className="home-hero__story-link" href="#craftsmanship">
            Our craftsmanship <span aria-hidden="true">↓</span>
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
        {fallbackRequired && <BangleFallback />}
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
