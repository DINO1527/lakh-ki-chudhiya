import { describe, expect, it } from "vitest";
import {
  createHeroRingMotion,
  heroIntroDuration,
  HERO_RING_ORDER,
  heroRingSpacing,
} from "./hero-motion";
import type { HeroLayout } from "./hero-layout";

const desktop: HeroLayout = {
  width: 1440,
  height: 720,
  stage: { x: 700, y: 40, width: 720, height: 620 },
  mode: "desktop",
  foregroundSafe: true,
};
const mobile: HeroLayout = {
  width: 390,
  height: 900,
  stage: { x: 0, y: 620, width: 390, height: 240 },
  mode: "stacked",
  foregroundSafe: false,
};

describe("cinematic hero choreography", () => {
  it("keeps clearance between the thickest bands throughout the breathing cycle", () => {
    const thickestBandHeight = 2 * (0.058 + 0.009 + 0.005);
    for (let time = 0; time <= 24; time += 0.1) {
      expect(heroRingSpacing(time) - thickestBandHeight).toBeGreaterThan(0.08);
    }
    const rings = Object.values(createHeroRingMotion(desktop));
    for (let index = 1; index < rings.length; index += 1) {
      expect(rings[index - 1].dockY - rings[index].dockY).toBeGreaterThan(thickestBandHeight);
    }
  });
  it("uses the storyboard intro duration for measured desktop and mobile layouts", () => {
    expect(heroIntroDuration(desktop.mode)).toBe(6.4);
    expect(heroIntroDuration(mobile.mode)).toBe(5.4);
  });

  it("anchors the braid, docks the ivory pair next, and locks the outer pair last", () => {
    const motion = createHeroRingMotion(desktop);

    expect(HERO_RING_ORDER).toEqual([
      "outerTop",
      "spacerTop",
      "centre",
      "spacerBottom",
      "outerBottom",
    ]);
    expect(motion.centre.dockStart).toBeLessThan(motion.spacerTop.dockStart);
    expect(motion.spacerTop.dockEnd).toBeLessThan(motion.outerTop.dockEnd);
  });

  it("places the complete mobile fan within the measured art stage", () => {
    const motion = createHeroRingMotion(mobile);

    for (const ring of Object.values(motion)) {
      expect(ring.fan.x).toBeGreaterThanOrEqual(0);
      expect(ring.fan.x).toBeLessThanOrEqual(1);
      expect(ring.fan.y).toBeGreaterThanOrEqual(mobile.stage.y / mobile.height);
      expect(ring.fan.y).toBeLessThanOrEqual(
        (mobile.stage.y + mobile.stage.height) / mobile.height,
      );
    }
  });
});
