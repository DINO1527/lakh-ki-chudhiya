"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { LACORA_BANGLE_PALETTE } from "./bangle-palette";

const BangleScene = dynamic(() => import("./bangle-scene").then((module) => module.BangleScene), {
  ssr: false,
  loading: () => null,
});

function canUseWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    const extension = context?.getExtension("WEBGL_lose_context");
    extension?.loseContext();
    return Boolean(context);
  } catch {
    return false;
  }
}

function BangleFallback() {
  const palette = LACORA_BANGLE_PALETTE;
  const rings = [
    { centerY: 118, color: palette.burgundy, width: 33 },
    { centerY: 199, color: palette.ivory, width: 32 },
    { centerY: 290, color: palette.burgundyDeep, width: 70 },
    { centerY: 381, color: palette.ivory, width: 32 },
    { centerY: 462, color: palette.burgundy, width: 33 },
  ];

  return (
    <svg aria-hidden="true" className="bangle-stage__fallback" viewBox="0 0 680 580">
      <defs>
        <linearGradient id="lacora-burgundy" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#e89991" />
          <stop offset="0.18" stopColor={palette.burgundyLight} />
          <stop offset="0.43" stopColor={palette.burgundy} />
          <stop offset="0.7" stopColor={palette.burgundyDeep} />
          <stop offset="0.88" stopColor={palette.burgundy} />
          <stop offset="1" stopColor="#f2c8b0" />
        </linearGradient>
        <linearGradient id="lacora-ivory" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.33" stopColor={palette.ivory} />
          <stop offset="0.72" stopColor={palette.ivoryShade} />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
        <linearGradient id="lacora-gold" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff1cb" />
          <stop offset="0.5" stopColor={palette.gold} />
          <stop offset="1" stopColor="#f3dca5" />
        </linearGradient>
        <filter height="150%" id="lacora-shadow" width="150%" x="-25%" y="-25%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="9" />
          <feOffset dy="12" />
          <feComponentTransfer>
            <feFuncA slope="0.3" type="linear" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#lacora-shadow)" transform="rotate(-14 340 290)">
        {rings.map((ring, index) => (
          <g key={ring.centerY}>
            <ellipse
              cx="340"
              cy={ring.centerY}
              fill="none"
              rx="205"
              ry={index === 2 ? 114 : 104}
              stroke={ring.color === palette.ivory ? "url(#lacora-ivory)" : "url(#lacora-burgundy)"}
              strokeWidth={ring.width}
            />
            <ellipse
              cx="340"
              cy={ring.centerY}
              fill="none"
              rx="205"
              ry={index === 2 ? 114 : 104}
              stroke="url(#lacora-gold)"
              strokeWidth={index === 2 ? 2 : 1.5}
            />
          </g>
        ))}

        <path
          d="M182 274c50-66 113-69 158-4s107 61 158-4M182 302c50-66 113-69 158-4s107 61 158-4"
          fill="none"
          opacity=".93"
          stroke="url(#lacora-ivory)"
          strokeLinecap="round"
          strokeWidth="13"
        />
        <path
          d="M182 288c50 66 113 69 158 4s107-61 158 4"
          fill="none"
          opacity=".95"
          stroke="url(#lacora-burgundy)"
          strokeLinecap="round"
          strokeWidth="17"
        />
      </g>
    </svg>
  );
}

export function BangleExperience() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(motionPreference.matches);
    const motionPreferenceFrame = window.requestAnimationFrame(updateMotionPreference);
    const webGlCheckFrame = window.requestAnimationFrame(() => setMotionEnabled(canUseWebGL()));
    motionPreference.addEventListener("change", updateMotionPreference);

    const stage = stageRef.current;
    if (!stage || !("IntersectionObserver" in window)) {
      setVisible(true);
      return () => {
        window.cancelAnimationFrame(motionPreferenceFrame);
        window.cancelAnimationFrame(webGlCheckFrame);
        motionPreference.removeEventListener("change", updateMotionPreference);
      };
    }

    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: "100px",
      threshold: 0.12,
    });
    observer.observe(stage);

    return () => {
      window.cancelAnimationFrame(motionPreferenceFrame);
      window.cancelAnimationFrame(webGlCheckFrame);
      observer.disconnect();
      motionPreference.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  const isSceneActive = motionEnabled && visible && !reducedMotion;
  const showScene = isSceneActive && sceneReady;
  const handleSceneReady = useCallback(() => setSceneReady(true), []);

  return (
    <div className="bangle-experience">
      <div
        aria-label="Slowly rotating 3D illustration of a five-ring Lacora bangle set"
        className={`bangle-stage__viewer${showScene ? " is-live" : ""}`}
        ref={stageRef}
        role="img"
      >
        <div aria-hidden="true" className="bangle-stage__glow" />
        <BangleFallback />
        {isSceneActive && (
          <div aria-hidden="true" className="bangle-stage__canvas">
            <BangleScene active={visible} onReady={handleSceneReady} />
          </div>
        )}
      </div>
    </div>
  );
}
