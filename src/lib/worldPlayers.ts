import { supabase } from './supabase';
import { publicPlayers } from './publicPlayers';
import { normalizeSkinKey, type Facing } from './skins';
import type { WorldLayer, WorldPoint } from './worldTest';
export type WorldPlayer = WorldPoint & { user_id: string; layer: number; village_level?: number; facing?: Facing; avatar_body?: string | null; orb_dye?: string | null; aura_color?: string | null; username?: string | null; title?: string | null; last_seen: string };
export const shownPlayers = (rows: WorldPlayer[], self: string | undefined, layer: WorldLayer, now: number) => rows.filter(p => p.user_id !== self && p.layer === layer && p.village_level === 0 && Number.isFinite(p.x) && Number.isFinite(p.y) && now - Date.parse(p.last_seen) <= 120000);
export function playerAppearance(p: WorldPlayer, at: WorldPoint) {
  return { near: Math.max(Math.abs(p.x - at.x), Math.abs(p.y - at.y)) <= 12, skin: normalizeSkinKey(p.avatar_body), facing: ['down', 'up', 'left', 'right'].includes(p.facing ?? '') ? p.facing as Facing : 'down', auraColor: p.aura_color, orbDye: p.orb_dye };
}
export class WorldPresence {
  private pending: WorldPlayer | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private last = -Infinity;
  private off = false;
  constructor(private write: (p: WorldPlayer) => Promise<unknown>, private now = Date.now) {}
  publish(row: WorldPlayer) { this.pending = row; if (!this.timer) this.send(); }
  private send() {
    if (this.off || !this.pending) return;
    const wait = 1000 - (this.now() - this.last);
    if (wait > 0) { this.timer = setTimeout(() => { this.timer = undefined; this.send(); }, wait); return; }
    const row = this.pending; this.pending = null; this.last = this.now();
    void this.write({ ...row, last_seen: new Date(this.last).toISOString() }).catch(() => undefined);
  }
  dispose() { this.off = true; if (this.timer) clearTimeout(this.timer); }
}
export async function readWorldPlayers(): Promise<WorldPlayer[]> {
  try {
    const { data, error } = await supabase.from('player_positions').select('*').eq('village_level', 0).gte('last_seen', new Date(Date.now() - 120000).toISOString());
    if (error) return [];
    const players = (data ?? []) as unknown as WorldPlayer[];
    if (!players.length) return players;
    const identities = await publicPlayers(players.map(p => p.user_id));
    const labels = new Map(identities.map(p => [p.id, p]));
    return players.flatMap(p => { const publicRow = labels.get(p.user_id); return publicRow ? [{ ...p, ...publicRow }] : []; });
  } catch { return []; }
}
export const writeWorldPlayer = async (row: WorldPlayer) => { const { error } = await supabase.from('player_positions').upsert(row as never); if (error) throw error; };