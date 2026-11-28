"use client";

import { useEffect, type ReactNode } from "react";

export function HomeMotion({ children }: { children: ReactNode }) {
  useEffect(() => {
    let frame = 0;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        (entry.target as HTMLElement).style.setProperty(
          "--home-loop-state",
          entry.isIntersecting ? "running" : "paused",
        );
      });
    });
    document.querySelectorAll("[data-home-tone]").forEach((section) => observer.observe(section));
    const update = () => {
      frame = 0;
      const sections = document.querySelectorAll<HTMLElement>("[data-home-tone]");
      let tone = "light";
      sections.forEach((section) => {
        const bounds = section.getBoundingClientRect();
        if (bounds.top <= 110 && bounds.bottom > 110) tone = section.dataset.homeTone ?? "light";
      });
      document.body.dataset.homeTone = tone;
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", scroll);
      cancelAnimationFrame(frame);
      observer.disconnect();
      delete document.body.dataset.homeTone;
    };
  }, []);
  return <div className="home-motion">{children}</div>;
}
