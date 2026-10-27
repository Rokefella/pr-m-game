import { supabase } from '@/lib/supabase';
import { USER_CREDITS_REFRESHED } from '@/lib/mechanics';
import { inventoryChanged } from '@/lib/inventoryEvents';

/** Categories the server refuses to let go of or sell (reason keep_this). */
export const KEEP_CATEGORIES = new Set(['key', 'tool', 'words', 'skin', 'sigil']);
export const canLetGo = (d: { category?: string | null }) => !KEEP_CATEGORIES.has(String(d.category ?? ''));
export const canSell = (d: { category?: string | null; value?: number | null }) => canLetGo(d) && (Number(d.value) || 0) > 0;
export const letGoQuestion = (count: number, name: string) => `Leave ${count} × ${name} behind?`;
export const saleReceipt = (earned: number) => `+${earned} credits`;
export const clampCount = (n: number, max: number) => Math.max(1, Math.min(Math.max(1, max), Math.floor(n) || 1));
const REASONS: Record<string, string> = { keep_this: 'This stays with you.', no_value: 'Nobody would pay for this.', none_left: 'There is none left.', unknown_item: 'That is not yours to give.' };
export type DiscardResult = { ok: boolean; removed?: number; sold?: number; earned?: number; credits?: number; left?: number; reason?: string };
export const discardFailure = (reason?: string) => REASONS[reason ?? ''] ?? 'No signal. Try again.';

export async function discardDrops(userId: string | undefined, dropKey: string, count: number, sell: boolean): Promise<DiscardResult> {
  const { data, error } = await (supabase.rpc as unknown as (f: string, a: object) => Promise<{ data: DiscardResult | null; error: unknown }>)('discard_drops', { p_drop_key: dropKey, p_count: count, p_sell: sell });
  if (error || !data) return { ok: false };
  if (data.ok) {
    if (Number.isFinite(data.credits)) window.dispatchEvent(new CustomEvent(USER_CREDITS_REFRESHED, { detail: { userId, credits: data.credits } }));
    inventoryChanged();
  }
  return data;
}
