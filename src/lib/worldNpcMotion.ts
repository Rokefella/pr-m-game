import { npcFacingToward, type Facing, type WalkPhase } from './skins';
import type { Place, WorldPoint } from './worldTest';
export const npcId = (p: Place) => `${p.npc_key}:${p.x}:${p.y}`;
const hash = (key: string, slot: number) => { let h = slot | 0; for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
/** Paths are home-rooted, so independent clients need no prior slot history. */
export function npcPath(home: WorldPoint, key: string, slot: number, safe: (p: WorldPoint) => boolean): WorldPoint[] {
  const cells: WorldPoint[] = [], queue = [home], parents = new Map<string, WorldPoint | null>([[`${home.x},${home.y}`, null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]; if (safe(p)) cells.push(p);
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const n = { x: p.x + dx, y: p.y + dy }, id = `${n.x},${n.y}`;
      if (Math.max(Math.abs(n.x - home.x), Math.abs(n.y - home.y)) > 4 || parents.has(id) || !safe(n)) continue;
      parents.set(id, p); queue.push(n);
    }
  }
  if (!cells.length) return [home];
  let p: WorldPoint | null = cells[hash(key, slot) % cells.length]; const path: WorldPoint[] = [];
  while (p) { path.unshift(p); p = parents.get(`${p.x},${p.y}`) ?? null; }
  return path;
}
export type NpcPose = WorldPoint & { cell: WorldPoint; facing: Facing; phase: WalkPhase };
export class NpcWander {
  private slot = -Infinity;
  private path: WorldPoint[] = [];
  private frozen: NpcPose | null = null;
  private last: NpcPose | null = null;
  sample(home: WorldPoint, key: string, now: number, player: WorldPoint, safe: (p: WorldPoint) => boolean, reduced = false): NpcPose {
    const slot = Math.floor(now / 8000);
    if (slot !== this.slot) {
      const previous = npcPath(home, key, slot - 1, safe).at(-1) ?? home;
      const next = npcPath(home, key, slot, safe);
      const back = npcPath(home, key, slot - 1, safe).slice().reverse();
      this.path = [previous, ...back.slice(1), ...next.slice(1)]; this.slot = slot;
    }
    const near = (p: WorldPoint) => Math.max(Math.abs(p.x - player.x), Math.abs(p.y - player.y)) <= 1;
    if (this.frozen && !near(this.frozen.cell)) this.frozen = null;
    if (!this.frozen && this.last && near(this.last.cell)) this.frozen = this.last;
    if (this.frozen) return { ...this.frozen, facing: npcFacingToward(this.frozen.cell, player), phase: 'stand' };
    const steps = Math.max(0, this.path.length - 1), progress = Math.min(steps, (now % 8000) / 2500 * steps), index = Math.floor(progress);
    const a = this.path[index] ?? home, b = this.path[index + 1] ?? a, t = progress - index;
    const dx = b.x - a.x, dy = b.y - a.y;
    const pose: NpcPose = { x: a.x + dx * t, y: a.y + dy * t, cell: t < .5 ? a : b, facing: dx ? dx > 0 ? 'right' : 'left' : dy ? dy > 0 ? 'down' : 'up' : 'down', phase: reduced || progress >= steps ? 'stand' : index % 2 ? 'a' : 'b' };
    this.last = pose;
    if (near(pose.cell)) { this.frozen = pose; return { ...pose, facing: npcFacingToward(pose.cell, player), phase: 'stand' }; }
    return pose;
  }
}