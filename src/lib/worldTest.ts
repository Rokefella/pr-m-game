import { supabase } from '@/lib/supabase';
import { loadTerrainSprites } from './terrainTile';
export const WORLD_SIZE = 1000;
export const WORLD_TILE = 40;
export const WORLD_CHUNK = 64;
export const WORLD_MOVE_MS = 150;
export type WorldPoint = { x: number; y: number };
export type Terrain = { key: string; name: string; grp: string; walkable: boolean; steps: number | null; sight: number | null; sight_delta: number | null; light_radius: number | null; moves: string | null; color: string | null; enabled: boolean; icon_svg?: string | null; icon_variants?: unknown; footprint?: number | null; footprint_w?: number | null; footprint_h?: number | null; sprite_w?: number | null; sprite_h?: number | null; render_layer?: string | null };
export const isWorldBuilding = (key: string) => key.startsWith('bld_');
export const worldWalkable = (terrain: Terrain | undefined) => terrain?.walkable === true && terrain.enabled !== false && !isWorldBuilding(terrain.key);
export type Era = { order_index: number; name: string; ring_from: number; ring_to: number; palette: unknown; step_cost: number; darkness: number; ground_key?: string | null };
export type Place = WorldPoint & { kind: string; name: string; maze_level: number | null; notes: string | null; layer?: number | null; action?: string | null; target_layer?: number | null; target_x?: number | null; target_y?: number | null; show_when?: { min_completed_level?: number | null; max_completed_level?: number | null } | null; npc_key?: string | null };
export type WorldLayer = 0 | 1;
export const UNDER_SIZE = 250;
export const layerSize = (layer: WorldLayer) => layer === 1 ? UNDER_SIZE : WORLD_SIZE;
/** Underground cells take the era of the centre of the 4 x 4 surface plot above them. */
export const eraPointFor = (point: WorldPoint, layer: WorldLayer): WorldPoint => layer === 1 ? { x: point.x * 4 + 2, y: point.y * 4 + 2 } : point;
export const placesOn = (places: Place[], layer: WorldLayer) => places.filter(p => (Number(p.layer) || 0) === layer);
export const placeAction = (place: Place): string | null => place.action ?? (place.kind === 'maze_entrance' ? 'maze' : null);
export function mazeOutcome(mazeLevel: number | null, playerLevel: number): 'enter' | 'completed' | 'locked' {
  const level = Number(mazeLevel);
  return level === playerLevel ? 'enter' : level < playerLevel ? 'completed' : 'locked';
}
export type DayNight = { cycle_minutes: number; day: number; dusk: number; night: number; dawn: number; night_view_delta: number };
export type WorldChunk = { x0: number; y0: number; w: number; h: number; keys: string[]; rows: number[][]; height?: string[] };
export const DEFAULT_CYCLE: DayNight = { cycle_minutes: 17, day: 10, dusk: 1, night: 5, dawn: 1, night_view_delta: -2 };
export const clampWorld = (value: number, size = WORLD_SIZE) => Math.max(0, Math.min(size - 1, Math.round(value)));
export const chunkOrigin = (value: number) => Math.floor(value / WORLD_CHUNK) * WORLD_CHUNK;
export const worldArea = (point: WorldPoint) => ({ x: Math.floor(point.x / 50), y: Math.floor(point.y / 50) });
export function eraAt(point: WorldPoint, eras: Era[]) {
  const ring = Math.max(Math.abs(point.x - 500), Math.abs(point.y - 500));
  return eras.find(era => ring >= era.ring_from && ring <= era.ring_to);
}
export const tileCost = (terrain: Terrain, era?: Era) => (terrain.steps ?? 1) * (era?.step_cost ?? 1);
/** Movement uses terrain steps only; era multipliers still belong to session accounting. */
export const worldMoveDuration = (terrain: Pick<Terrain, 'steps'>) => WORLD_MOVE_MS * Math.max(1, terrain.steps ?? 1);
export const isWading = (terrain: Terrain | undefined) => terrain?.walkable === true && terrain.enabled !== false && terrain.grp === 'water';
export const isWorldConversation = (place: Place) => place.kind === 'npc_home' || place.action === 'merchant';
export const isSignpost = (place: Place) => place.action === 'signpost';
export type SignLine = { dir: 'onward' | 'back' | null; text: string };
/** Signpost notes: one row per line; Onward/Back lines get their direction. */
export const signpostLines = (notes: string | null | undefined): SignLine[] => (notes ?? '').split(/\r?\n/).map(t => t.trim()).filter(Boolean)
  .map(text => ({ text, dir: /^onward\b/i.test(text) ? 'onward' as const : /^back\b/i.test(text) ? 'back' as const : null }));
export const adjacentConversation = (places: Place[], point: WorldPoint) => places.find(p => isWorldConversation(p) && Math.max(Math.abs(p.x - point.x), Math.abs(p.y - point.y)) <= 1);

/** Arrival recovery searches in walking-distance order without triggering place actions. */
export async function nearestWorldWalkable(cache: WorldChunkCache, types: Map<string, Terrain>, point: WorldPoint): Promise<WorldPoint | null> {
  const queue = [point], seen = new Set([`${point.x},${point.y}`]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (!cache.terrainKey(p.x, p.y)) await cache.load(p.x, p.y);
    const key = cache.terrainKey(p.x, p.y);
    if (!key) continue; // Unavailable chunks are not evidence of a blocked cell.
    const terrain = types.get(key);
    if (worldWalkable(terrain)) return p;
    for (const [dx, dy] of [[-1, 0], [0, -1], [1, 0], [0, 1]]) {
      const next = { x: p.x + dx, y: p.y + dy }, id = `${next.x},${next.y}`;
      if (next.x >= 0 && next.y >= 0 && next.x < cache.size && next.y < cache.size && !seen.has(id)) { seen.add(id); queue.push(next); }
    }
  }
  return null;
}
export function worldPhase(now: number, settings = DEFAULT_CYCLE) {
  const minute = ((now / 60000) % settings.cycle_minutes + settings.cycle_minutes) % settings.cycle_minutes;
  let start = 0;
  for (const phase of ['day', 'dusk', 'night', 'dawn'] as const) {
    const length = settings[phase];
    if (minute < start + length) return { phase, minutesLeft: start + length - minute, progress: (minute - start) / length };
    start += length;
  }
  return { phase: 'day' as const, minutesLeft: settings.cycle_minutes - minute, progress: 0 };
}
export function nearbyChunks(point: WorldPoint, size = WORLD_SIZE): WorldPoint[] {
  const x0 = chunkOrigin(point.x), y0 = chunkOrigin(point.y);
  const xs = [x0], ys = [y0];
  if (point.x - x0 < 16) xs.push(x0 - WORLD_CHUNK);
  if (x0 + WORLD_CHUNK - point.x <= 16) xs.push(x0 + WORLD_CHUNK);
  if (point.y - y0 < 16) ys.push(y0 - WORLD_CHUNK);
  if (y0 + WORLD_CHUNK - point.y <= 16) ys.push(y0 + WORLD_CHUNK);
  return xs.flatMap(x => ys.map(y => ({ x, y }))).filter(p => p.x >= 0 && p.y >= 0 && p.x < size && p.y < size);
}
export class WorldChunkCache {
  chunks = new Map<string, WorldChunk>();
  pending = new Map<string, Promise<void>>();
  errors = new Map<string, number>();
  center: WorldPoint = { x: 25, y: 25 };
  constructor(private fetchChunk: (x: number, y: number) => Promise<WorldChunk>, public size = WORLD_SIZE) {}
  key(x: number, y: number) { return `${chunkOrigin(x)},${chunkOrigin(y)}`; }
  terrainKey(x: number, y: number): string | undefined {
    const chunk = this.chunks.get(this.key(x, y));
    return chunk?.keys[chunk.rows[y - chunk.y0]?.[x - chunk.x0]];
  }
  heightAt(x: number, y: number): number | undefined {
    const chunk = this.chunks.get(this.key(x, y));
    if (!chunk || x < chunk.x0 || y < chunk.y0 || x >= chunk.x0 + chunk.w || y >= chunk.y0 + chunk.h) return undefined;
    const digit = Number(chunk.height?.[y - chunk.y0]?.[x - chunk.x0] ?? 0);
    return Number.isFinite(digit) ? Math.max(0, Math.min(3, digit)) : 0;
  }
  async load(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return;
    const x0 = chunkOrigin(x), y0 = chunkOrigin(y), key = this.key(x, y);
    if (this.chunks.has(key)) return;
    const pending = this.pending.get(key); if (pending) return pending;
    if (Date.now() - (this.errors.get(key) ?? 0) < 4000) return;
    const job = this.fetchChunk(x0, y0).then(chunk => {
      if (Math.abs(x0 - chunkOrigin(this.center.x)) <= 3 * WORLD_CHUNK && Math.abs(y0 - chunkOrigin(this.center.y)) <= 3 * WORLD_CHUNK) this.chunks.set(key, chunk);
      this.errors.delete(key);
    }).catch(() => { this.errors.set(key, Date.now()); }).finally(() => this.pending.delete(key));
    this.pending.set(key, job); return job;
  }
  maintain(point: WorldPoint) {
    this.center = point;
    for (const [key, chunk] of this.chunks) if (Math.abs(chunk.x0 - chunkOrigin(point.x)) > 3 * WORLD_CHUNK || Math.abs(chunk.y0 - chunkOrigin(point.y)) > 3 * WORLD_CHUNK) this.chunks.delete(key);
    for (const key of this.errors.keys()) { const [x, y] = key.split(',').map(Number); if (Math.abs(x - point.x) > 4 * WORLD_CHUNK || Math.abs(y - point.y) > 4 * WORLD_CHUNK) this.errors.delete(key); }
    for (const p of nearbyChunks(point, this.size)) void this.load(p.x, p.y);
  }
}
export async function fetchWorldChunk(x: number, y: number, layer: WorldLayer = 0): Promise<WorldChunk> {
  const { data, error } = await supabase.rpc((layer === 1 ? 'world_under_window' : 'world_window') as never, { p_x0: x, p_y0: y, p_w: WORLD_CHUNK, p_h: WORLD_CHUNK } as never);
  if (error || !data) throw new Error('World window unavailable');
  const chunk = data as unknown as WorldChunk;
  if (!Array.isArray(chunk.keys) || !Array.isArray(chunk.rows)) throw new Error('Invalid world window');
  return chunk;
}
export async function readWorldData() {
  const [terrain, eras, places, settings] = await Promise.all([
    supabase.from('world_terrain_types' as never).select('*'),
    supabase.from('world_eras' as never).select('*').order('order_index'),
    supabase.from('world_places' as never).select('*'),
    supabase.from('world_settings' as never).select('day_night').eq('id', 1).maybeSingle(),
  ]);
  if (terrain.error || eras.error || places.error || settings.error) throw new Error('World data unavailable');
  await loadTerrainSprites((terrain.data ?? []) as unknown as Terrain[]);
  return { terrain: (terrain.data ?? []) as unknown as Terrain[], eras: (eras.data ?? []) as unknown as Era[], places: (places.data ?? []) as unknown as Place[], cycle: { ...DEFAULT_CYCLE, ...(settings.data as unknown as { day_night?: Partial<DayNight> } | null)?.day_night } };
}