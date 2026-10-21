export const LANTERN_BASE_RADIUS_CELLS = 2.5;
export const LANTERN_PERCEPTION_BONUS = 0.5;
export const LANTERN_SOFT_CELLS = 1.5;

export function lanternRadii(perception: number, cellSize = 40, runBonusCells = 0) {
  const r1 = (LANTERN_BASE_RADIUS_CELLS + Math.min(6, Math.max(0, perception) * LANTERN_PERCEPTION_BONUS) + runBonusCells) * cellSize;
  return { r1, r2: r1 + LANTERN_SOFT_CELLS * cellSize };
}