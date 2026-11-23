"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { BangleExperience } from "./bangle-experience";

type HomeHeroProps = {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
};

export function HomeHero({ eyebrow, title, body, ctaLabel, ctaHref }: HomeHeroProps) {
  const [introStarted, setIntroStarted] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const handleIntroStart = useCallback(() => setIntroStarted(true), []);
  const handleIntroComplete = useCallback(() => setIntroComplete(true), []);

  return (
    <section
      aria-labelledby="home-title"
      className={`home-hero${!introStarted && !introComplete ? " is-intro-pending" : ""}${introStarted && !introComplete ? " is-intro-running" : ""}${introComplete ? " is-intro-complete" : ""}`}
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
        <BangleExperience onIntroStart={handleIntroStart} onIntroComplete={handleIntroComplete} />
      </div>

      <svg
        aria-hidden="true"
        className="home-hero__wave"
        focusable="false"
        preserveAspectRatio="none"
        viewBox="0 0 1600 180"
      >
        <path
          className="home-hero__wave-base"
          d="M0 77C128 106 200 146 338 139S533 76 678 72 883 132 1039 137 1248 74 1394 61 1538 68 1600 45V180H0Z"
        />
        <path
          className="home-hero__wave-shadow"
          d="M0 101C148 130 241 155 377 149S570 103 717 98 916 146 1070 151 1269 107 1403 91 1543 93 1600 77V180H0Z"
        />
        <path
          className="home-hero__wave-ribbon"
          d="M0 65C128 94 200 134 338 127S533 64 678 60 883 120 1039 125 1248 62 1394 49 1538 56 1600 33L1600 53C1538 76 1482 66 1394 79 1248 92 1195 153 1039 149S833 84 678 84 476 151 338 156 128 123 0 95Z"
        />
        <path
          className="home-hero__wave-highlight"
          d="M0 77C128 106 200 146 338 139S533 76 678 72 883 132 1039 137 1248 74 1394 61 1538 68 1600 45"
        />
      </svg>
    </section>
  );
}
