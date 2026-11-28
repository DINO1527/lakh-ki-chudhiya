"use client";

import dynamic from "next/dynamic";
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
  const [, setFirstVisit] = useState(true);
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

  const animateIntro = false;
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
