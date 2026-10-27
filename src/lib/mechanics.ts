import { supabase } from '@/lib/supabase';

export const MECHANIC_USED = 'praem:mechanic-used';
export const USER_STEPS_REFRESHED = 'praem:user-steps-refreshed';
export const USER_CREDITS_REFRESHED = 'praem:user-credits-refreshed';
export const STEP_CAP = 5000;
export type Cell = { col: number; row: number };
export type MazeUseContext = { level: number; position: () => Cell; beforeUse?: () => Promise<void> };
export type RunEffects = { lantern_bonus: number; chalk: boolean; compass: boolean; magnet: boolean; lucky: boolean; reveals: Array<Cell & { r: number }> };
export type MechanicResult = { ok?: boolean; reason?: string; effect?: string; amount?: number; steps_remaining?: number; credits?: number };
export const emptyRunEffects = (): RunEffects => ({ lantern_bonus: 0, chalk: false, compass: false, magnet: false, lucky: false, reveals: [] });
export function normalizeRunEffects(value: unknown): RunEffects {
  const row = (value ?? {}) as Partial<RunEffects>;
  return { lantern_bonus: Math.min(4, Math.max(0, Number(row.lantern_bonus) || 0)), chalk: row.chalk === true, compass: row.compass === true, magnet: row.magnet === true, lucky: row.lucky === true,
    reveals: Array.isArray(row.reveals) ? row.reveals.filter(p => Number.isFinite(p?.col) && Number.isFinite(p?.row) && Number.isFinite(p?.r) && p.r >= 0) : [] };
}
export async function readRunEffects(userId: string, level: number): Promise<RunEffects | null> {
  const { data, error } = await supabase.from('run_state' as never).select('lantern_bonus, chalk, compass, magnet, lucky, reveals').eq('user_id', userId).eq('level', level).maybeSingle();
  return error ? null : normalizeRunEffects(data);
}
export function isStepMechanic(drop: { name: string; drop_key?: string; effect?: string | null }) {
  return drop.effect?.startsWith('steps:+') === true || ['step_pouch', 'spare_lace', 'second_wind'].includes(drop.drop_key ?? '') || ['Step Pouch', 'Spare Lace', 'Second Wind'].includes(drop.name);
}
export const isCreditMechanic = (drop: { effect?: string | null }) => drop.effect?.startsWith('credits:+') === true;
export function mechanicBlocked(stepDrop: boolean, steps: number | undefined, maze?: MazeUseContext, creditDrop = false) {
  if (stepDrop && steps !== undefined && steps >= STEP_CAP) return 'Your steps are full.';
  if (!stepDrop && !creditDrop && !maze) return 'Use it inside a maze.';
  return '';
}
export function mechanicWhisper(result: MechanicResult) {
  switch (result.effect) {
    case 'steps': return `+${result.amount ?? 0} steps.`;
    case 'credits': return `+${result.amount ?? 0} credits.`;
    case 'lantern': return 'Your light widens for this run.';
    case 'chalk': return 'Chalk dust marks your path.';
    case 'compass': return 'The shard points to the golden door.';
    case 'magnet': return 'Fragments nearby begin to glow.';
    case 'lucky': return 'Your next crate will roll higher.';
    case 'reveal': return 'A part of the maze is revealed.';
    case 'pulse': return 'The pebble hums.';
    default: return 'The Instrument responds.';
  }
}
export const cellDistance = (a: Cell, b: Cell) => Math.hypot(a.col - b.col, a.row - b.row);
export function nearestFragment<T extends Cell & { prime: number }>(fragments: T[], collected: Set<number>, player: Cell): T | undefined {
  return fragments.filter(f => !collected.has(f.prime)).reduce<T | undefined>((best, f) => !best || cellDistance(f, player) < cellDistance(best, player) ? f : best, undefined);
}
export const inReveal = (cell: Cell, reveals: RunEffects['reveals']) => reveals.some(p => Math.abs(cell.col - p.col) <= p.r && Math.abs(cell.row - p.row) <= p.r);
export function restoreChalk(level: number, resume: boolean): Set<string> {
  const key = `praem_chalk_${level}`;
  if (!resume) { sessionStorage.removeItem(key); return new Set(); }
  try { const cells = JSON.parse(sessionStorage.getItem(key) ?? '[]'); return new Set(Array.isArray(cells) ? cells.filter((c: unknown) => typeof c === 'string' && /^\d+,\d+$/.test(c)) : []); } catch { return new Set(); }
}