"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./auto-swipe-carousel.module.css";

type AutoSwipeCarouselProps<T> = {
  items: readonly T[];
  getItemKey: (item: T) => string;
  label: string;
  ariaLabel: string;
  renderSlide: (item: T, index: number) => ReactNode;
  renderEmpty: () => ReactNode;
  intervalMs?: number;
};

export function AutoSwipeCarousel<T>({
  items,
  getItemKey,
  label,
  ariaLabel,
  renderSlide,
  renderEmpty,
  intervalMs = 7_200,
}: AutoSwipeCarouselProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pausedByUser, setPausedByUser] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [inView, setInView] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(media.matches);
    updateMotionPreference();
    media.addEventListener("change", updateMotionPreference);

    const track = trackRef.current;
    if (!track || !("IntersectionObserver" in window)) {
      setInView(true);
      return () => media.removeEventListener("change", updateMotionPreference);
    }

    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.25,
    });
    observer.observe(track);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  const scrollToSlide = useCallback(
    (index: number) => {
      const track = trackRef.current;
      const slide = track?.children.item(index);
      if (!(slide instanceof HTMLElement) || !track) return;

      track.scrollTo({
        left: slide.offsetLeft - track.offsetLeft,
        behavior: reducedMotion ? "instant" : "smooth",
      });
      setActiveIndex(index);
    },
    [reducedMotion],
  );

  useEffect(() => {
    if (
      items.length < 2 ||
      pausedByUser ||
      interacting ||
      !inView ||
      reducedMotion ||
      intervalMs <= 0
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const next = (activeIndex + 1) % items.length;
      scrollToSlide(next);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [
    activeIndex,
    inView,
    interacting,
    intervalMs,
    items.length,
    pausedByUser,
    reducedMotion,
    scrollToSlide,
  ]);

  const move = (direction: -1 | 1) => {
    const next = (activeIndex + direction + items.length) % items.length;
    scrollToSlide(next);
  };

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0 || items.length === 0) return;
    const next = Math.round(track.scrollLeft / track.clientWidth);
    setActiveIndex(Math.min(next, items.length - 1));
  };

  return (
    <div
      aria-label={ariaLabel}
      className={styles.carousel}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setInteracting(false);
        }
      }}
      onFocus={() => setInteracting(true)}
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onTouchEnd={() => setInteracting(false)}
      onTouchStart={() => setInteracting(true)}
      role="group"
    >
      <div className={styles.header}>
        <p className={styles.label}>{label}</p>
        {items.length > 1 && (
          <div className={styles.actions}>
            <button
              aria-label={`Previous ${label.toLowerCase()}`}
              onClick={() => move(-1)}
              type="button"
            >
              <span aria-hidden="true">←</span>
            </button>
            <button
              aria-label={
                pausedByUser
                  ? `Resume ${label.toLowerCase()} rotation`
                  : `Pause ${label.toLowerCase()} rotation`
              }
              aria-pressed={pausedByUser}
              onClick={() => setPausedByUser((current) => !current)}
              type="button"
            >
              <span aria-hidden="true">{pausedByUser ? "▶" : "Ⅱ"}</span>
            </button>
            <button
              aria-label={`Next ${label.toLowerCase()}`}
              onClick={() => move(1)}
              type="button"
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>{renderEmpty()}</div>
      ) : (
        <>
          <div
            aria-label={ariaLabel}
            aria-roledescription="carousel"
            className={styles.track}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") move(1);
              if (event.key === "ArrowLeft") move(-1);
            }}
            onScroll={handleScroll}
            ref={trackRef}
            role="region"
            tabIndex={0}
          >
            {items.map((item, index) => (
              <div
                aria-label={`${index + 1} of ${items.length}`}
                aria-roledescription="slide"
                className={styles.slide}
                key={getItemKey(item)}
              >
                {renderSlide(item, index)}
              </div>
            ))}
          </div>
          {items.length > 1 && (
            <p aria-hidden="true" className={styles.position}>
              {String(activeIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
