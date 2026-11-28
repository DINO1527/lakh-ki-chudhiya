import type { HeroLayout } from "./hero-layout";

export type HeroRingId = "outerTop" | "spacerTop" | "centre" | "spacerBottom" | "outerBottom";
export type HeroRingMotion = {
  start: { x: number; y: number };
  fan: { x: number; y: number };
  dockY: number;
  dockStart: number;
  dockEnd: number;
};

export const HERO_RING_ORDER: readonly HeroRingId[] = [
  "outerTop",
  "spacerTop",
  "centre",
  "spacerBottom",
  "outerBottom",
];

export function heroIntroDuration(mode: HeroLayout["mode"]) {
  return mode === "stacked" ? 5.4 : 6.4;
}

export function createHeroRingMotion(layout: HeroLayout): Record<HeroRingId, HeroRingMotion> {
  const { stage, mode } = layout;
  const cx = (stage.x + stage.width / 2) / Math.max(layout.width, 1);
  const cy = (stage.y + stage.height / 2) / Math.max(layout.height, 1);
  const sx = stage.width / Math.max(layout.width, 1);
  const sy = stage.height / Math.max(layout.height, 1);
  const mobile = mode === "stacked";
  const offsetsY = [0.222, 0.123, 0, -0.123, -0.222];
  const centerIndex = 2;
  const innerIndices = new Set([1, 3]);

  return Object.fromEntries(
    HERO_RING_ORDER.map((id, index) => {
      const dockStart =
        index === centerIndex ? (mobile ? 0.48 : 0.52) : innerIndices.has(index) ? 0.64 : 0.76;
      const dockEnd =
        index === centerIndex ? (mobile ? 0.64 : 0.69) : innerIndices.has(index) ? 0.83 : 1;
      const slot = index - 2;
      return [
        id,
        {
          start: {
            x: mobile ? sx * (0.18 - index * 0.065) : 0.13 - index * 0.07,
            y: mobile ? cy - sy * (0.27 + index * 0.018) : 0.12 - index * 0.028,
          },
          fan: {
            x: cx + sx * slot * 0.025,
            y: cy + sy * slot * 0.06,
          },
          dockY: offsetsY[index],
          dockStart,
          dockEnd,
        },
      ];
    }),
  ) as Record<HeroRingId, HeroRingMotion>;
}
