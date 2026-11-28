import { describe, expect, it } from "vitest";
import { measureHeroLayout } from "./hero-layout";

describe("measureHeroLayout", () => {
  it("uses the real stage and copy relationship to identify a desktop layout", () => {
    const layout = measureHeroLayout(
      { left: 0, top: 0, width: 1440, height: 720 },
      { left: 720, top: 50, width: 680, height: 620 },
      { left: 40, top: 60, width: 610, height: 570 },
    );

    expect(layout.mode).toBe("desktop");
    expect(layout.foregroundSafe).toBe(true);
    expect(layout.stage.x).toBe(720);
  });

  it("keeps stacked mobile art below its copy and out of the foreground", () => {
    const layout = measureHeroLayout(
      { left: 0, top: 0, width: 390, height: 900 },
      { left: 0, top: 620, width: 390, height: 240 },
      { left: 16, top: 20, width: 358, height: 570 },
    );

    expect(layout.mode).toBe("stacked");
    expect(layout.foregroundSafe).toBe(false);
  });

  it("classifies overlapping tablet columns as compact", () => {
    const layout = measureHeroLayout(
      { left: 0, top: 0, width: 900, height: 700 },
      { left: 430, top: 80, width: 450, height: 580 },
      { left: 30, top: 80, width: 470, height: 560 },
    );

    expect(layout.mode).toBe("compact");
    expect(layout.foregroundSafe).toBe(false);
  });
});
