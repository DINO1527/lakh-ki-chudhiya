"use client";

import dynamic from "next/dynamic";
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { BangleLoader } from "@/components/shared/bangle-loader";
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

class BangleSceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onFailure();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function BangleFallback({ className = "bangle-stage__fallback" }: { className?: string }) {
  const palette = LACORA_BANGLE_PALETTE;
  const idPrefix = useId().replaceAll(":", "");
  const ids = {
    burgundy: `${idPrefix}-burgundy`,
    ivory: `${idPrefix}-ivory`,
    gold: `${idPrefix}-gold`,
    outerOrnament: `${idPrefix}-outer-ornament`,
    braidPattern: `${idPrefix}-braid-pattern`,
    shadow: `${idPrefix}-shadow`,
  };
  const rings = [
    { centerY: 225, type: "outer", rx: 205, ry: 104, width: 34 },
    { centerY: 257, type: "spacer", rx: 200, ry: 99, width: 24 },
    { centerY: 290, type: "braid", rx: 210, ry: 109, width: 44 },
    { centerY: 323, type: "spacer", rx: 200, ry: 99, width: 24 },
    { centerY: 355, type: "outer", rx: 205, ry: 104, width: 34 },
  ];

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 680 580">
      <defs>
        <linearGradient id={ids.burgundy} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#e89991" />
          <stop offset="0.18" stopColor={palette.burgundyLight} />
          <stop offset="0.43" stopColor={palette.burgundy} />
          <stop offset="0.7" stopColor={palette.burgundyDeep} />
          <stop offset="0.88" stopColor={palette.burgundy} />
          <stop offset="1" stopColor="#f2c8b0" />
        </linearGradient>
        <linearGradient id={ids.ivory} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.33" stopColor={palette.ivory} />
          <stop offset="0.72" stopColor={palette.ivoryShade} />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
        <linearGradient id={ids.gold} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff1cb" />
          <stop offset="0.5" stopColor={palette.gold} />
          <stop offset="1" stopColor="#f3dca5" />
        </linearGradient>
        <pattern
          height="18"
          id={ids.outerOrnament}
          patternTransform="rotate(36)"
          patternUnits="userSpaceOnUse"
          width="18"
        >
          <rect fill={`url(#${ids.burgundy})`} height="18" width="18" />
          <path
            d="M3 0v18M8 0v18M13 0v18"
            fill="none"
            stroke={`url(#${ids.gold})`}
            strokeWidth="1.5"
          />
          <path d="M5.5 0v18M15.5 0v18" fill="none" stroke={palette.ivory} strokeWidth="0.8" />
        </pattern>
        <pattern height="30" id={ids.braidPattern} patternUnits="userSpaceOnUse" width="36">
          <rect fill={palette.burgundyDeep} height="30" width="36" />
          <path
            d="M-9 0C0 0 9 30 18 30S36 0 45 0"
            fill="none"
            stroke={palette.burgundy}
            strokeLinecap="round"
            strokeWidth="10"
          />
          <path
            d="M-9 30C0 30 9 0 18 0S36 30 45 30"
            fill="none"
            stroke={palette.burgundyLight}
            strokeLinecap="round"
            strokeWidth="10"
          />
          <path
            d="M-9 0C0 0 9 30 18 30S36 0 45 0M-9 30C0 30 9 0 18 0S36 30 45 30"
            fill="none"
            stroke={`url(#${ids.gold})`}
            strokeDasharray="1 5 1 11"
            strokeLinecap="round"
            strokeOpacity="0.9"
            strokeWidth="1.2"
          />
        </pattern>
        <filter height="150%" id={ids.shadow} width="150%" x="-25%" y="-25%">
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

      <g filter={`url(#${ids.shadow})`} transform="rotate(-14 340 290)">
        {rings.map((ring) => (
          <g key={ring.centerY}>
            <ellipse
              cx="340"
              cy={ring.centerY}
              fill="none"
              rx={ring.rx}
              ry={ring.ry}
              stroke={
                ring.type === "spacer"
                  ? `url(#${ids.ivory})`
                  : ring.type === "braid"
                    ? `url(#${ids.braidPattern})`
                    : `url(#${ids.outerOrnament})`
              }
              strokeWidth={ring.width}
            />
            {ring.type === "braid" && (
              <ellipse
                cx="340"
                cy={ring.centerY}
                fill="none"
                opacity="0.62"
                rx={ring.rx}
                ry={ring.ry}
                stroke={`url(#${ids.gold})`}
                strokeDasharray="2 7 1 12"
                strokeWidth="2.2"
              />
            )}
          </g>
        ))}
      </g>
    </svg>
  );
}

export function BangleExperience({
  onIntroStart,
  onIntroComplete,
}: {
  onIntroStart: () => void;
  onIntroComplete: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(false);
  const [sceneRequested, setSceneRequested] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [motionPreferenceReady, setMotionPreferenceReady] = useState(false);
  const [webGlCheckComplete, setWebGlCheckComplete] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [backdropReady, setBackdropReady] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);

  useEffect(() => {
    const backdrop = new window.Image();
    const markBackdropReady = () => setBackdropReady(true);
    backdrop.onload = markBackdropReady;
    backdrop.onerror = markBackdropReady;
    backdrop.src = "/brand/lacora-hero-atmosphere.webp";
    if (backdrop.complete) markBackdropReady();

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(motionPreference.matches);
    const updatePageVisibility = () => setPageVisible(document.visibilityState === "visible");
    const motionPreferenceFrame = window.requestAnimationFrame(() => {
      updateMotionPreference();
      setMotionPreferenceReady(true);
    });
    const webGlCheckFrame = window.requestAnimationFrame(() => {
      setMotionEnabled(canUseWebGL());
      setWebGlCheckComplete(true);
    });
    const pageVisibilityFrame = window.requestAnimationFrame(updatePageVisibility);
    motionPreference.addEventListener("change", updateMotionPreference);
    document.addEventListener("visibilitychange", updatePageVisibility);

    const stage = stageRef.current;
    if (!stage || !("IntersectionObserver" in window)) {
      setVisible(true);
      setSceneRequested(true);
      return () => {
        window.cancelAnimationFrame(motionPreferenceFrame);
        window.cancelAnimationFrame(webGlCheckFrame);
        window.cancelAnimationFrame(pageVisibilityFrame);
        motionPreference.removeEventListener("change", updateMotionPreference);
        document.removeEventListener("visibilitychange", updatePageVisibility);
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setSceneRequested(true);
      },
      {
        rootMargin: "100px",
        threshold: 0.12,
      },
    );
    observer.observe(stage);

    return () => {
      backdrop.onload = null;
      backdrop.onerror = null;
      window.cancelAnimationFrame(motionPreferenceFrame);
      window.cancelAnimationFrame(webGlCheckFrame);
      window.cancelAnimationFrame(pageVisibilityFrame);
      observer.disconnect();
      motionPreference.removeEventListener("change", updateMotionPreference);
      document.removeEventListener("visibilitychange", updatePageVisibility);
    };
  }, []);

  useEffect(() => {
    if (!motionPreferenceReady || !webGlCheckComplete) return;

    if (reducedMotion || !motionEnabled || sceneFailed) {
      onIntroComplete();
    }
  }, [
    motionEnabled,
    motionPreferenceReady,
    onIntroComplete,
    reducedMotion,
    sceneFailed,
    webGlCheckComplete,
  ]);

  const shouldRenderScene = motionEnabled && sceneRequested && !reducedMotion && !sceneFailed;
  const isSceneActive = shouldRenderScene && visible && pageVisible && sceneReady && backdropReady;
  const showScene = shouldRenderScene && sceneReady && backdropReady;
  const showStaticFallback =
    motionPreferenceReady && webGlCheckComplete && (reducedMotion || !motionEnabled || sceneFailed);
  const showLoader =
    !motionPreferenceReady ||
    !webGlCheckComplete ||
    (motionEnabled && !reducedMotion && !sceneFailed && (!sceneReady || !backdropReady));
  const handleSceneReady = useCallback(() => setSceneReady(true), []);
  const handleSceneFailure = useCallback(() => setSceneFailed(true), []);

  return (
    <div className="bangle-experience">
      <div className={`bangle-stage__viewer${showScene ? " is-live" : ""}`} ref={stageRef}>
        <div aria-hidden="true" className="bangle-stage__glow" />
        <div
          aria-label="Five Lacora bangles: ruby outer rings with fine stripes, smooth ivory spacers and a dense interwoven ruby centre"
          className="bangle-stage__visual"
          role="img"
        >
          {showStaticFallback && <BangleFallback />}
        </div>
        {shouldRenderScene && (
          <div aria-hidden="true" className="bangle-stage__canvas">
            <BangleSceneBoundary onFailure={handleSceneFailure}>
              <BangleScene
                active={isSceneActive}
                onIntroStart={onIntroStart}
                onIntroComplete={onIntroComplete}
                onReady={handleSceneReady}
              />
            </BangleSceneBoundary>
          </div>
        )}
        {showLoader && (
          <div className="bangle-stage__loading">
            <BangleLoader compact label="Preparing the Lacora bangle scene" />
          </div>
        )}
      </div>
    </div>
  );
}
