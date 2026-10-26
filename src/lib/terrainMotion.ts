import { worldHash } from './worldHash';
import type { Terrain } from './worldTest';

export type TerrainNeighbour = (x: number, y: number) => Terrain | undefined;
export const WATER_MOVES = new Set(['flow', 'flow_fast', 'flow_slow', 'flow_light', 'shimmer', 'waves', 'foam']);
export function waterDirection(x: number, y: number, neighbour?: TerrainNeighbour) {
  // Principal axis of the eight connected water neighbours, oriented downstream.
  let xx = 0, yy = 0, xy = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if ((!dx && !dy) || neighbour?.(x + dx, y + dy)?.grp !== 'water') continue;
    xx += dx * dx; yy += dy * dy; xy += dx * dy;
  }
  if ((!xx && !yy) || (xx === yy && xy === 0)) return { x: Math.SQRT1_2, y: Math.SQRT1_2 };
  const angle = .5 * Math.atan2(2 * xy, xx - yy);
  let vx = Math.cos(angle), vy = Math.sin(angle);
  if (vy < -1e-6 || (Math.abs(vy) < 1e-6 && vx < 0)) { vx = -vx; vy = -vy; }
  return { x: vx, y: vy };
}
export function flowOffset(move: string, time: number) {
  return Math.floor(time * 6 / 1000) * (move === 'flow_fast' ? 2 : move === 'flow_slow' ? .5 : 1);
}
export function flameFrame(time: number, x: number, y: number) {
  return (Math.floor(time * 8 / 1000) + Math.floor(worldHash(x, y, 31) * 3)) % 3;
}
export function lavaBrightness(time: number) { return .12 + .12 * Math.sin(time * Math.PI / 1000); }
// Each clock-aligned ten-second slot may launch a gust; spacing is always 10–20 seconds.
export function gustStrength(x: number, y: number, clock: number, pine = false) {
  const slot = Math.floor(clock / 10000);
  let strength = 0;
  // Retain waves travelling across the full 1000-cell surface (~125 seconds).
  for (let launch = slot - 14; launch <= slot; launch++) {
    const active = launch % 2 === 0 || worldHash(launch, 0, 47) > .5;
    if (!active || (pine && launch % 2 !== 0)) continue;
    const age = (clock - launch * 10000) / 1000 - x / 8 - worldHash(0, y, 48) * .3;
    if (age >= 0 && age < 1.5) strength = Math.max(strength, Math.sin(age / 1.5 * Math.PI));
  }
  return strength;
}
export function canSway(terrain: Terrain) {
  return terrain.moves === 'sway' && !/boulder|rock|building|factory/.test(terrain.key);
}
export function leanAmount(terrain: Terrain, x: number, y: number, clock: number) {
  if (!canSway(terrain)) return 0;
  const gust = gustStrength(x, y, clock, /pine/.test(terrain.key));
  const breath = /grass|flower|reed/.test(terrain.key) ? .16 * (1 + Math.sin(clock * Math.PI * 2 / 3000 + worldHash(x, y, 49) * Math.PI * 2)) / 2 : 0;
  return Math.max(gust, breath);
}
export function terrainDrawInterval(moving: boolean, gust: boolean) { return moving || gust ? 1000 / 30 : 100; }