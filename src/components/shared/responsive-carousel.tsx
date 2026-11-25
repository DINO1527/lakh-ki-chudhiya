"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import styles from "./responsive-carousel.module.css";

type ResponsiveCarouselProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

type SnapPoint = { index: number; left: number };

export function ResponsiveCarousel({ label, children, className }: ResponsiveCarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null);
  const dotRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const snapPointsRef = useRef<readonly SnapPoint[]>([]);
  const [snapPoints, setSnapPoints] = useState<readonly SnapPoint[]>([]);
  const [activePage, setActivePage] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const cards = Array.from(track.children) as HTMLElement[];
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      if (cards.length < 2 || maxScroll < 2 || track.clientWidth === 0) {
        snapPointsRef.current = [];
        setSnapPoints([]);
        setActivePage(0);
        return;
      }

      const cardWidth = cards[0]?.getBoundingClientRect().width ?? 0;
      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
      const cardsPerPage = Math.max(1, Math.floor((track.clientWidth + gap) / (cardWidth + gap)));
      const trackLeft = track.getBoundingClientRect().left;
      const points: SnapPoint[] = [];

      for (let index = 0; index < cards.length; index += cardsPerPage) {
        const card = cards[index];
        if (!card) continue;
        const left = Math.min(
          maxScroll,
          Math.max(0, card.getBoundingClientRect().left - trackLeft + track.scrollLeft),
        );
        if (points.every((point) => Math.abs(point.left - left) > 2)) points.push({ index, left });
      }
      if (points.every((point) => Math.abs(point.left - maxScroll) > 2)) {
        points.push({ index: cards.length - 1, left: maxScroll });
      }

      snapPointsRef.current = points;
      setSnapPoints((current) => {
        const unchanged =
          current.length === points.length &&
          current.every(
            (point, index) =>
              point.index === points[index]?.index &&
              Math.abs(point.left - (points[index]?.left ?? 0)) < 1,
          );
        return unchanged ? current : points;
      });
      setActivePage((current) => Math.min(current, points.length - 1));
    };

    const updateActivePage = () => {
      const nearest = snapPointsRef.current.reduce((bestIndex, point, index, points) => {
        const best = points[bestIndex];
        return best &&
          Math.abs(point.left - track.scrollLeft) < Math.abs(best.left - track.scrollLeft)
          ? index
          : bestIndex;
      }, 0);
      setActivePage((current) => (current === nearest ? current : nearest));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    Array.from(track.children).forEach((card) => observer.observe(card));
    const mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(track, { childList: true });
    track.addEventListener("scroll", updateActivePage, { passive: true });
    window.addEventListener("resize", measure, { passive: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      track.removeEventListener("scroll", updateActivePage);
      window.removeEventListener("resize", measure);
    };
  }, [children]);

  const goToPage = (index: number, focus = false) => {
    const point = snapPoints[index];
    const track = trackRef.current;
    if (!point || !track) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({ left: point.left, behavior: reducedMotion ? "auto" : "smooth" });
    setActivePage(index);
    if (focus) dotRefs.current[index]?.focus();
  };

  const handleDotKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    let nextPage: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      nextPage = Math.min(activePage + 1, snapPoints.length - 1);
    if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      nextPage = Math.max(activePage - 1, 0);
    if (event.key === "Home") nextPage = 0;
    if (event.key === "End") nextPage = snapPoints.length - 1;
    if (nextPage === null) return;
    event.preventDefault();
    goToPage(nextPage, true);
  };

  return (
    <div
      aria-label={label}
      className={styles.carousel}
      role="region"
      aria-roledescription="carousel"
    >
      <ul className={`${styles.track}${className ? ` ${className}` : ""}`} ref={trackRef}>
        {children}
      </ul>
      {snapPoints.length > 1 && (
        <div
          aria-label={`${label} pages`}
          className={styles.dots}
          onKeyDown={handleDotKeys}
          role="group"
        >
          {snapPoints.map((point, index) => (
            <button
              aria-current={activePage === index ? "step" : undefined}
              aria-label={`Show ${label.toLowerCase()} page ${index + 1} of ${snapPoints.length}`}
              className={styles.dot}
              key={`${point.index}-${index}`}
              onClick={() => goToPage(index)}
              ref={(element) => {
                dotRefs.current[index] = element;
              }}
              type="button"
              tabIndex={activePage === index ? 0 : -1}
            >
              <span aria-hidden="true" className={styles.dotMark} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
