import { type Facing, type WalkPhase } from './skins';
import type { Place, WorldPoint } from './worldTest';
export const npcId = (p: Place) => `${p.npc_key}:${p.x}:${p.y}`;
const hash = (key: string, slot: number) => { let h = slot | 0; for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
export const NPC_TILE_MS = 600;
export const npcPauseMs = (key: string, slot: number) => 6000 + hash(key, slot) % 8001;
const distance = (a: WorldPoint, b: WorldPoint) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
export function npcPath(home: WorldPoint, key: string, slot: number, safe: (p: WorldPoint) => boolean): WorldPoint[] {
  if (!safe(home)) return [home];
  const cells: WorldPoint[] = [], queue = [home], parents = new Map<string, WorldPoint | null>([[`${home.x},${home.y}`, null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]; if (i > 0) cells.push(p);
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const n = { x: p.x + dx, y: p.y + dy }, id = `${n.x},${n.y}`;
      if (distance(n, home) > 3 || parents.has(id) || !safe(n)) continue;
      parents.set(id, p); queue.push(n);
    }
  }
  if (!cells.length) return [home];
  let p: WorldPoint | null = cells[hash(key, slot) % cells.length]; const path: WorldPoint[] = [];
  while (p) { path.unshift(p); p = parents.get(`${p.x},${p.y}`) ?? null; }
  return path;
}
export type NpcPose = WorldPoint & { cell: WorldPoint; facing: Facing; phase: WalkPhase };
const face = (a: WorldPoint, b: WorldPoint): Facing => Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) && b.x !== a.x ? b.x > a.x ? 'right' : 'left' : b.y !== a.y ? b.y > a.y ? 'down' : 'up' : 'down';
/** A closed home-rooted route repeats on the shared clock; each edge has its own calm pause. */
export class NpcWander {
  private route: WorldPoint[] = [];
  private durations: number[] = [];
  private total = 0;
  private frozen: NpcPose | null = null;
  private last: NpcPose | null = null;
  sample(home: WorldPoint, key: string, now: number, player: WorldPoint, safe: (p: WorldPoint) => boolean, reduced = false, talking = false): NpcPose {
    if (!this.route.length || (this.route.length === 1 && safe(home))) {
      const out = npcPath(home, key, 0, safe);
      this.route = [...out, ...out.slice(0, -1).reverse()];
      this.durations = this.route.slice(1).map((_, i) => NPC_TILE_MS + npcPauseMs(key, i));
      this.total = this.durations.reduce((a, b) => a + b, 0);
    }
    if (reduced || !this.total) return { ...home, cell: home, facing: distance(home, player) <= 3 ? face(home, player) : 'down', phase: 'stand' };
    if (!this.frozen && this.last && (talking || distance(this.last.cell, player) <= 3)) this.frozen = { ...this.last, phase: 'stand' };
    let time = ((now % this.total) + this.total) % this.total, index = 0;
    while (index < this.durations.length - 1 && time >= this.durations[index]) { time -= this.durations[index]; index++; }
    const a = this.route[index], b = this.route[index + 1] ?? a;
    const t = Math.min(1, time / NPC_TILE_MS);
    const pose: NpcPose = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, cell: t < .5 ? a : b, facing: face(a, b), phase: t >= 1 ? 'stand' : Math.floor(time / 150) % 2 ? 'a' : 'b' };
    if (this.frozen) {
      // Rejoin only when the shared path passes the frozen position: never teleport on release.
      if (!talking && distance(this.frozen.cell, player) > 3 && Math.hypot(pose.x - this.frozen.x, pose.y - this.frozen.y) < .06) this.frozen = null;
      else return { ...this.frozen, facing: face(this.frozen.cell, player), phase: 'stand' };
    }
    this.last = pose;
    if (talking || distance(pose.cell, player) <= 3) { this.frozen = pose; return { ...pose, facing: face(pose.cell, player), phase: 'stand' }; }
    return pose;
  }
}
