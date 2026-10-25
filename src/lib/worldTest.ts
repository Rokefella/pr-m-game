import { supabase } from '@/lib/supabase';
export const WORLD_SIZE = 1000;
export const WORLD_TILE = 40;
export const WORLD_CHUNK = 64;
export const WORLD_MOVE_MS = 150;
export type WorldPoint = { x: number; y: number };
export type Terrain = { key: string; name: string; grp: string; walkable: boolean; steps: number | null; sight: number | null; sight_delta: number | null; light_radius: number | null; moves: string | null; color: string | null; enabled: boolean };
export type Era = { order_index: number; name: string; ring_from: number; ring_to: number; palette: unknown; step_cost: number; darkness: number };
export type Place = WorldPoint & { kind: string; name: string; maze_level: number | null; notes: string | null };
export type DayNight = { cycle_minutes: number; day: number; dusk: number; night: number; dawn: number; night_view_delta: number };
export type WorldChunk = { x0: number; y0: number; w: number; h: number; keys: string[]; rows: number[][] };
export const DEFAULT_CYCLE: DayNight = { cycle_minutes: 17, day: 10, dusk: 1, night: 5, dawn: 1, night_view_delta: -2 };
export const clampWorld = (value: number) => Math.max(0, Math.min(WORLD_SIZE - 1, Math.round(value)));
export const chunkOrigin = (value: number) => Math.floor(value / WORLD_CHUNK) * WORLD_CHUNK;
export const worldArea = (point: WorldPoint) => ({ x: Math.floor(point.x / 50), y: Math.floor(point.y / 50) });
export function eraAt(point: WorldPoint, eras: Era[]) {
  const ring = Math.max(Math.abs(point.x - 500), Math.abs(point.y - 500));
  return eras.find(era => ring >= era.ring_from && ring <= era.ring_to);
}
export const tileCost = (terrain: Terrain, era?: Era) => (terrain.steps ?? 1) * (era?.step_cost ?? 1);
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
export function nearbyChunks(point: WorldPoint): WorldPoint[] {
  const x0 = chunkOrigin(point.x), y0 = chunkOrigin(point.y);
  const xs = [x0], ys = [y0];
  if (point.x - x0 < 16) xs.push(x0 - WORLD_CHUNK);
  if (x0 + WORLD_CHUNK - point.x <= 16) xs.push(x0 + WORLD_CHUNK);
  if (point.y - y0 < 16) ys.push(y0 - WORLD_CHUNK);
  if (y0 + WORLD_CHUNK - point.y <= 16) ys.push(y0 + WORLD_CHUNK);
  return xs.flatMap(x => ys.map(y => ({ x, y }))).filter(p => p.x >= 0 && p.y >= 0 && p.x < WORLD_SIZE && p.y < WORLD_SIZE);
}
export class WorldChunkCache {
  chunks = new Map<string, WorldChunk>();
  pending = new Map<string, Promise<void>>();
  errors = new Map<string, number>();
  center: WorldPoint = { x: 25, y: 25 };
  constructor(private fetchChunk: (x: number, y: number) => Promise<WorldChunk>) {}
  key(x: number, y: number) { return `${chunkOrigin(x)},${chunkOrigin(y)}`; }
  terrainKey(x: number, y: number): string | undefined {
    const chunk = this.chunks.get(this.key(x, y));
    return chunk?.keys[chunk.rows[y - chunk.y0]?.[x - chunk.x0]];
  }
  async load(x: number, y: number) {
    if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) return;
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
    for (const p of nearbyChunks(point)) void this.load(p.x, p.y);
  }
}
export async function fetchWorldChunk(x: number, y: number): Promise<WorldChunk> {
  const { data, error } = await supabase.rpc('world_window' as never, { p_x0: x, p_y0: y, p_w: WORLD_CHUNK, p_h: WORLD_CHUNK } as never);
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
  return { terrain: (terrain.data ?? []) as unknown as Terrain[], eras: (eras.data ?? []) as unknown as Era[], places: (places.data ?? []) as unknown as Place[], cycle: { ...DEFAULT_CYCLE, ...(settings.data as unknown as { day_night?: Partial<DayNight> } | null)?.day_night } };
}