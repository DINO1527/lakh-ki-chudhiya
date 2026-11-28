"use client";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./home-page-sections.module.css";

export function HomeRail({ children, label }: { children: ReactNode; label: string }) {
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    if (!cards.length) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let active = 0;
    let visible = false;
    let pointer = false;
    let automatic = false;
    let lastMovement = performance.now();
    const select = (index: number) => {
      delete cards[active].dataset.active;
      active = index;
      cards[active].dataset.active = "true";
    };
    const onScroll = () => {
      lastMovement = performance.now();
      if (automatic) return;
      const stride = cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : 1;
      select(
        el.scrollLeft > 0 && el.scrollLeft >= el.scrollWidth - el.clientWidth - 2
          ? cards.length - 1
          : Math.min(cards.length - 1, Math.max(0, Math.round(el.scrollLeft / stride))),
      );
    };
    const hold = () => {
      automatic = false;
      pointer = true;
    };
    const release = () => {
      if (!pointer) return;
      pointer = false;
      lastMovement = performance.now();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        lastMovement = performance.now();
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    select(0);
    const timer = window.setInterval(() => {
      if (
        !visible ||
        document.hidden ||
        pointer ||
        motion.matches ||
        el.matches(":focus-visible") ||
        !!el.querySelector(":focus-visible") ||
        (matchMedia("(hover:hover)").matches && el.matches(":hover")) ||
        cards.length < 2 ||
        performance.now() - lastMovement < 4500
      )
        return;
      automatic = true;
      select((active + 1) % cards.length);
      const target = cards[active].offsetLeft - cards[0].offsetLeft;
      el.scrollTo({ left: target, behavior: "smooth" });
      lastMovement = performance.now();
    }, 500);
    const manual = () => {
      automatic = false;
      lastMovement = performance.now();
    };
    el.addEventListener("wheel", manual, { passive: true });
    el.addEventListener("keydown", manual);
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", hold);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      el.removeEventListener("wheel", manual);
      el.removeEventListener("keydown", manual);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerdown", hold);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [children]);
  return (
    <div ref={rail} role="region" aria-label={label} tabIndex={0} className={styles.rail}>
      {children}
    </div>
  );
}
