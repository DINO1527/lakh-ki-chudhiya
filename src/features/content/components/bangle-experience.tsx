"use client";

import dynamic from "next/dynamic";
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { LACORA_BANGLE_PALETTE } from "./bangle-palette";
import { measureHeroLayout, type HeroLayout } from "../domain/hero-layout";

const BangleScene = dynamic(() => import("./bangle-scene").then((module) => module.BangleScene), {
  ssr: false,
  loading: () => null,
});

const HERO_MOTION_SESSION_KEY = "lacora:hero-motion-v4-played";

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
  heroRef,
  copyRef,
  stageRef,
  onIntroStart,
  onIntroComplete,
  onSceneReady,
  onForegroundSafe,
  onFallbackRequired,
}: {
  heroRef: RefObject<HTMLElement | null>;
  copyRef: RefObject<HTMLElement | null>;
  stageRef: RefObject<HTMLElement | null>;
  onIntroStart: () => void;
  onIntroComplete: () => void;
  onSceneReady: (ready: boolean) => void;
  onForegroundSafe: (safe: boolean) => void;
  onFallbackRequired: (required: boolean) => void;
}) {
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [sceneRequested, setSceneRequested] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [motionPreferenceReady, setMotionPreferenceReady] = useState(false);
  const [firstVisit, setFirstVisit] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [motionComplete, setMotionComplete] = useState(false);
  const [layout, setLayout] = useState<HeroLayout | null>(null);
  const completionFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => {
      const reduced = motionPreference.matches;
      setReducedMotion(reduced);
      if (reduced) setFirstVisit(false);
      setMotionPreferenceReady(true);
    };
    const updatePageVisibility = () => setPageVisible(document.visibilityState === "visible");
    motionPreference.addEventListener("change", updateMotionPreference);
    document.addEventListener("visibilitychange", updatePageVisibility);
    const initializationFrame = window.requestAnimationFrame(() => {
      updateMotionPreference();
      updatePageVisibility();
      const webGlAvailable = canUseWebGL();
      setMotionEnabled(webGlAvailable);
      onFallbackRequired(!webGlAvailable);
      try {
        setFirstVisit(
          !motionPreference.matches &&
            (process.env.NODE_ENV === "development" ||
              window.sessionStorage.getItem(HERO_MOTION_SESSION_KEY) !== "played"),
        );
      } catch {
        setFirstVisit(!motionPreference.matches);
      }
    });

    const hero = heroRef.current;
    const stage = stageRef.current;
    const copy = copyRef.current;
    if (!hero || !stage || !copy) {
      motionPreference.removeEventListener("change", updateMotionPreference);
      document.removeEventListener("visibilitychange", updatePageVisibility);
      window.cancelAnimationFrame(initializationFrame);
      return;
    }

    const updateLayout = () => {
      const heroBounds = hero.getBoundingClientRect();
      const stageBounds = stage.getBoundingClientRect();
      const copyBounds = copy.getBoundingClientRect();
      setLayout(measureHeroLayout(heroBounds, stageBounds, copyBounds));
    };
    updateLayout();

    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(hero);
    resizeObserver.observe(stage);
    resizeObserver.observe(copy);
    void document.fonts?.ready.then(updateLayout);
    const requestScene = () => setSceneRequested(true);

    let observer: IntersectionObserver | null = null;
    let fallbackFrame: number | null = null;
    try {
      observer = new IntersectionObserver(
        ([entry]) => {
          setVisible(entry.isIntersecting);
          if (entry.isIntersecting) requestScene();
        },
        {
          rootMargin: "100px",
          threshold: 0.12,
        },
      );
      observer.observe(hero);
    } catch {
      fallbackFrame = window.requestAnimationFrame(() => {
        setVisible(true);
        requestScene();
      });
    }

    return () => {
      resizeObserver.disconnect();
      observer?.disconnect();
      motionPreference.removeEventListener("change", updateMotionPreference);
      document.removeEventListener("visibilitychange", updatePageVisibility);
      window.cancelAnimationFrame(initializationFrame);
      if (fallbackFrame !== null) window.cancelAnimationFrame(fallbackFrame);
    };
  }, [copyRef, heroRef, onFallbackRequired, stageRef]);

  const animateIntro = !reducedMotion && firstVisit;
  const shouldRenderScene =
    motionEnabled && motionPreferenceReady && sceneRequested && Boolean(layout) && !sceneFailed;
  const showScene = shouldRenderScene && sceneReady;
  const isSceneActive = showScene && visible && pageVisible && !reducedMotion;
  const handleSceneReady = useCallback(() => {
    setSceneReady(true);
    onSceneReady(true);
  }, [onSceneReady]);
  const handleSceneFailure = useCallback(() => {
    setSceneFailed(true);
    setSceneReady(false);
    onSceneReady(false);
    onForegroundSafe(false);
    onFallbackRequired(true);
  }, [onFallbackRequired, onForegroundSafe, onSceneReady]);
  const handleForegroundSafe = useCallback(
    (safe: boolean) => onForegroundSafe(safe && Boolean(layout?.foregroundSafe)),
    [layout?.foregroundSafe, onForegroundSafe],
  );
  const handleIntroStart = useCallback(() => {
    try {
      window.sessionStorage.setItem(HERO_MOTION_SESSION_KEY, "played");
    } catch {
      // Motion remains a one-time component lifecycle when storage is unavailable.
    }
    onIntroStart();
  }, [onIntroStart]);
  const handleIntroComplete = useCallback(() => {
    setMotionComplete(true);
    onIntroComplete();
    onForegroundSafe(Boolean(layout?.foregroundSafe));
  }, [layout?.foregroundSafe, onForegroundSafe, onIntroComplete]);

  useEffect(() => {
    if (!showScene || animateIntro || motionComplete) return;
    completionFrameRef.current = window.requestAnimationFrame(() => {
      setMotionComplete(true);
      onIntroComplete();
      onForegroundSafe(Boolean(layout?.foregroundSafe));
    });
    return () => {
      if (completionFrameRef.current !== null) {
        window.cancelAnimationFrame(completionFrameRef.current);
      }
    };
  }, [
    animateIntro,
    layout?.foregroundSafe,
    motionComplete,
    onForegroundSafe,
    onIntroComplete,
    showScene,
  ]);

  return (
    <div className={`bangle-experience${showScene ? " is-ready" : ""}`}>
      {shouldRenderScene && layout && (
        <div aria-hidden="true" className="bangle-stage__canvas">
          <BangleSceneBoundary onFailure={handleSceneFailure}>
            <BangleScene
              active={isSceneActive}
              animateIntro={animateIntro}
              layout={layout}
              onIntroStart={handleIntroStart}
              onIntroComplete={handleIntroComplete}
              onReady={handleSceneReady}
              onForegroundSafe={handleForegroundSafe}
              onContextLost={handleSceneFailure}
            />
          </BangleSceneBoundary>
        </div>
      )}
    </div>
  );
}
