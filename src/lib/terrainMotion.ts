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
export const terrainPulse = (move: string, time: number, x: number, y: number) => move === 'flicker'
  ? .08 + worldHash(x, y, Math.floor(time / 90)) * .22
  : .10 + .10 * Math.sin(time / 650 + worldHash(x, y, 29) * Math.PI * 2);
export function puffPhase(time: number, x: number, y: number, index: number) {
  return ((time / 3000 + worldHash(x, y, 71) + index / 3) % 1 + 1) % 1;
}
export const glintPhase = (time: number, x: number, y: number) => ((time + worldHash(x, y, 72) * 6000) % 6000) / 6000;
// Two launches per thirty-second clock cycle; both gaps are always 10–20 seconds.
export function gustStrength(x: number, y: number, clock: number, pine = false) { return gustWave(x, y, clock, pine).strength; }
/** Strongest passing gust and how far (0–1) it has travelled through the cell. */
export function gustWave(x: number, y: number, clock: number, pine = false) {
  const cycle = Math.floor(clock / 30000);
  let strength = 0, progress = 0;
  // Retain waves travelling across the full 1000-cell surface (~125 seconds).
  for (let launch = cycle - 5; launch <= cycle; launch++) for (let half = 0; half < 2; half++) {
    if (pine && half === 1) continue;
    const start = launch * 30000 + (half ? 10000 + worldHash(launch, 0, 47) * 10000 : 0);
    const age = (clock - start) / 1000 - x / 8 - worldHash(0, y, 48) * .3;
    if (age >= 0 && age < 1.5) { const k = Math.sin(age / 1.5 * Math.PI); if (k > strength) { strength = k; progress = age / 1.5; } }
  }
  return { strength, progress };
}
export function canSway(terrain: Terrain) {
  return terrain.moves === 'sway' && !/boulder|rock|building|factory|^house_|^bld_/.test(terrain.key);
}
export function leanAmount(terrain: Terrain, x: number, y: number, clock: number) {
  if (!canSway(terrain)) return 0;
  const gust = gustStrength(x, y, clock, /pine/.test(terrain.key));
  const breath = /grass|flower|reed|crops|park_lawn|overgrowth/.test(terrain.key) ? .16 * (1 + Math.sin(clock * Math.PI * 2 / 3000 + worldHash(x, y, 49) * Math.PI * 2)) / 2 : 0;
  return Math.max(gust, breath);
}
export function terrainDrawInterval(moving: boolean, gust: boolean) { return moving || gust ? 1000 / 30 : 100; }export const isGroundSway = (terrain: Terrain) => canSway(terrain) && terrain.render_layer !== 'object';
/** Lighter band rows (3px) sliding top→bottom while a gust passes; null when calm. */
export function waveBand(terrain: Terrain, x: number, y: number, clock: number) {
  if (!isGroundSway(terrain)) return null;
  const { strength, progress } = gustWave(x, y, clock);
  return strength > .05 ? { y: Math.round(progress * 19) - 3, h: 3 } : null;
}
export const WAVE_BAND_CELL_LIMIT = 400;
