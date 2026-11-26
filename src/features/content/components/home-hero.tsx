"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
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
  const [introComplete, setIntroComplete] = useState(false);
  const handleIntroStart = useCallback(() => {}, []);
  const handleIntroComplete = useCallback(() => setIntroComplete(true), []);

  return (
    <section
      aria-labelledby="home-title"
      className={`home-hero${introComplete ? " is-intro-complete" : " is-intro-pending"}`}
    >
      <div className="home-hero__copy">
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

      <div className="home-hero__art">
        <BangleExperience onIntroStart={handleIntroStart} onIntroComplete={handleIntroComplete} />
      </div>

      <WaveDivider placement="hero" />
    </section>
  );
}
