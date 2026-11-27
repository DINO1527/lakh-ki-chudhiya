export type HeroRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type HeroLayout = {
  width: number;
  height: number;
  stage: { x: number; y: number; width: number; height: number };
  mode: "desktop" | "stacked" | "compact";
  foregroundSafe: boolean;
};

export function measureHeroLayout(hero: HeroRect, stage: HeroRect, copy: HeroRect): HeroLayout {
  const stageX = stage.left - hero.left;
  const stageY = stage.top - hero.top;
  const copyRight = copy.left + copy.width;
  const copyBottom = copy.top + copy.height;
  const stageRight = stageX + stage.width;
  const stageBottom = stageY + stage.height;
  const sideBySide = stageX >= copyRight - hero.left + 12;
  const belowCopy = stageY >= copyBottom - hero.top - 8;
  const mode = belowCopy ? "stacked" : sideBySide ? "desktop" : "compact";

  return {
    width: hero.width,
    height: hero.height,
    stage: { x: stageX, y: stageY, width: stage.width, height: stage.height },
    mode,
    foregroundSafe:
      mode === "desktop" &&
      stageX >= copyRight - hero.left + 24 &&
      stageRight <= hero.width - 12 &&
      stageY >= 0 &&
      stageBottom <= hero.height,
  };
}
