import { supabase } from './supabase';
import { inventoryChanged } from './inventoryEvents';
import { WorldDiscovery } from './worldDiscovery';
import { saveWorldPos, saveWorldReturn, type WorldSpot } from './worldReturn';

export type PraemState = 'none' | 'asleep' | 'set' | 'sold';
export type Praem = {
  maze: number; maze_name?: string; ring?: string; state: PraemState; found?: boolean;
  name: string; description?: string | null; icon_svg: string | null; icon_lit?: string | null;
  can_travel?: boolean; entrance?: { x: number; y: number } | null; sell_price?: number | null;
};
export type PraemListing = { id: string; maze: number; name: string; ring?: string; description?: string; icon_svg: string | null; price: number; listed_at: string; yours: boolean; owned: boolean };
export type PraemResult = { ok: boolean; reason?: string; credits?: number; earned?: number; paid?: number; x?: number; y?: number; layer?: number; name?: string };
const rpc = supabase.rpc as unknown as (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
export const PRAEMS_CHANGED = 'praem:praems-changed';
export const RIFT_ARRIVAL = 'praem.riftArrival';
export const praemVisible = (a: { col: number; row: number }, b: { col: number; row: number }) => Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row)) <= 2;
export const praemNearby = (a: { col: number; row: number }, b: { col: number; row: number }) => Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row)) <= 4;
export const praemOwned = (p: Praem) => p.state === 'asleep' || p.state === 'set';
export const canSellPraem = (p: Praem) => p.maze !== 30 && p.state === 'set' && p.sell_price != null;
export const ringClass = (ring?: string) => `praem-ring-${['fire', 'gods', 'atoms', 'stars', 'quantum', 'swerve'].includes((ring ?? '').toLowerCase()) ? ring?.toLowerCase() : 'stars'}`;
export const praemSockets = (items: Praem[]) => Array.from({ length: 30 }, (_, i): Praem => items.find(p => p.maze === i + 1) ?? { maze: i + 1, state: 'none', name: '', icon_svg: null });
export async function myPraems(): Promise<Praem[]> {
  const { data, error } = await rpc('my_praems');
  if (error) throw error;
  return Array.isArray(data) ? data.map(p => ({ ...p, state: p.state ?? (p.found ? 'set' : 'none') })) : [];
}
export async function praemMarket(): Promise<PraemListing[]> {
  const { data, error } = await rpc('praem_market_list');
  if (error) throw error;
  return Array.isArray(data) ? data as PraemListing[] : [];
}
export async function mutatePraem(fn: 'sell_praem' | 'buy_praem' | 'rift_travel', args: Record<string, unknown>): Promise<PraemResult> {
  const { data, error } = await rpc(fn, args);
  if (error || !data) return { ok: false, reason: 'error' };
  const result = data as PraemResult;
  if (result.ok && fn !== 'rift_travel') { inventoryChanged(); window.dispatchEvent(new Event(PRAEMS_CHANGED)); }
  return result;
}
export const praemFailure = (reason?: string) => reason === 'not_set' ? 'The way is closed.' : reason === 'not_for_sale' ? 'This one stays with you.' : reason === 'gone' ? 'Someone has already taken it.' : reason === 'already_have' ? 'You have one.' : reason === 'not_enough' ? 'Not enough credits.' : 'That did not work. Try again.';
export async function discoverPraemEntrances(userId: string, items: Praem[]) {
  const entrances = items.filter(p => p.state === 'set' && p.entrance);
  if (!entrances.length) return;
  const discovery = new WorldDiscovery(userId);
  try { await discovery.ready; for (const p of entrances) if (p.entrance) discovery.reveal(p.entrance.x, p.entrance.y, 12); await discovery.flush(true); }
  finally { discovery.dispose(); }
}
export async function travelPraem(maze: number, userId: string): Promise<PraemResult> {
  const result = await mutatePraem('rift_travel', { p_maze: maze });
  if (!result.ok) return result;
  if (!Number.isFinite(result.x) || !Number.isFinite(result.y) || (result.layer !== 0 && result.layer !== 1)) return { ok: false, reason: 'error' };
  const spot: WorldSpot = { x: Number(result.x), y: Number(result.y), layer: result.layer };
  saveWorldPos(spot); saveWorldReturn(spot);
  sessionStorage.setItem(RIFT_ARRIVAL, '1');
  if (spot.layer === 0) await discoverPraemEntrances(userId, [{ maze, state: 'set', name: result.name ?? '', icon_svg: null, entrance: spot }]).catch(() => undefined);
  return result;
}

/** Quiet gesture-unlocked tones; never start audio before the player interacts. */
let audio: AudioContext | null = null;
export function unlockPraemAudio() {
  try { audio ??= new AudioContext(); if (audio.state === 'suspended') void audio.resume(); } catch { /* audio unavailable */ }
}
export function praemTone(chime = false) {
  if (!audio || audio.state !== 'running' || document.visibilityState === 'hidden') return;
  const now = audio.currentTime, oscillator = audio.createOscillator(), gain = audio.createGain();
  oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(chime ? 440 : 65, now);
  gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(chime ? .035 : .012, now + .15); gain.gain.exponentialRampToValueAtTime(.0001, now + (chime ? 1 : 2));
  oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(now); oscillator.stop(now + (chime ? 1.1 : 2.1));
}