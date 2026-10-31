import { supabase } from '@/lib/supabase';

export type ExplorerProgress = { ok: boolean; explored: number; total: number; percent: number; claimed: unknown };
export type ExplorerClaim = { ok: boolean; title?: string; skin?: string; reason?: string };

type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
const rpc: Rpc = (fn, args) => (supabase.rpc as unknown as Rpc)(fn, args ?? {});

/** The Grand Explorer signpost is the 'signpost' place at the foot of the post, (5,3) on the surface. */
export const isGrandExplorerSign = (p: { x: number; y: number; layer?: number | null; action?: string | null }) =>
  p.x === 5 && p.y === 3 && (p.layer ?? 0) === 0 && p.action === 'signpost';

/** One decimal, never rounding up to 100 before the land is truly all walked. */
export function explorerPercentLabel(p: Pick<ExplorerProgress, 'explored' | 'total' | 'percent'>) {
  if (p.total > 0 && p.explored >= p.total) return '100';
  const raw = Number.isFinite(p.percent) ? p.percent : p.total > 0 ? (p.explored / p.total) * 100 : 0;
  return String(Math.min(99.9, Math.floor(raw * 10) / 10));
}
export const explorerComplete = (p: Pick<ExplorerProgress, 'explored' | 'total'>) => p.total > 0 && p.explored >= p.total;
export const explorerClaimed = (p: Pick<ExplorerProgress, 'claimed'>) => Boolean(p.claimed);
/** A claimed timestamp becomes a readable date; a bare true has no date to show. */
export function claimedDate(claimed: unknown, locale = 'en-GB') {
  if (typeof claimed !== 'string') return null;
  const d = new Date(claimed);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

export async function explorerProgress(): Promise<ExplorerProgress> {
  const { data, error } = await rpc('explorer_progress');
  if (error) throw new Error(error.message);
  const d = (data ?? {}) as Partial<ExplorerProgress>;
  return { ok: Boolean(d.ok), explored: Number(d.explored) || 0, total: Number(d.total) || 0, percent: Number(d.percent) || 0, claimed: d.claimed ?? null };
}
export async function claimGrandExplorer(): Promise<ExplorerClaim> {
  const { data, error } = await rpc('claim_grand_explorer');
  if (error) throw new Error(error.message);
  return (data ?? { ok: false }) as ExplorerClaim;
}
