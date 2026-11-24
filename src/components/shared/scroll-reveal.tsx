"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./scroll-reveal.module.css";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
};

export function ScrollReveal({ children, className, delayMs = 0 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!element || reduceMotion.matches || !("IntersectionObserver" in window)) {
      setReady(true);
      setVisible(true);
      return;
    }

    setVisible(element.getBoundingClientRect().top < window.innerHeight * 0.92);
    setReady(true);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`${styles.reveal}${className ? ` ${className}` : ""}`}
      data-reveal-ready={ready ? "true" : undefined}
      data-reveal-visible={visible ? "true" : "false"}
      ref={ref}
      style={{ "--reveal-delay": `${delayMs}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
