import { compareFlag, flagNumber } from './flagValues';
import { supabase } from '@/lib/supabase';
import { inventoryChanged } from './inventoryEvents';
import { readOwnedDrops, refreshDrops } from './carriedDrops';
import { discardDrops, discardFailure } from './letGo';

/** Optional world_places visibility rule compared against users.maze_completed_level. */
export type ShowWhen = { min_completed_level?: number | null; max_completed_level?: number | null; flag?: string | null; flag_absent?: string | null } | null | undefined;
const flagSet = (flags: Record<string, string>, key: string) => String(flags[key] ?? '') !== '';
export const showWhenMatches = (rule: ShowWhen, completed: number | null | undefined, flags: Record<string, string> = {}) => {
  if (!rule) return true;
  if (rule.flag && !flagSet(flags, rule.flag)) return false;
  if (rule.flag_absent && flagSet(flags, rule.flag_absent)) return false;
  const level = Number(completed) || 0;
  if (rule.min_completed_level != null && level < Number(rule.min_completed_level)) return false;
  if (rule.max_completed_level != null && level > Number(rule.max_completed_level)) return false;
  return true;
};
/** Hidden places never appear on the map or in lists, and show their name only up close. */
export const HIDDEN_PLACE_NAMES = new Set(['Wandering trader']);
export const isHiddenPlace = (p: { name?: string | null }) => HIDDEN_PLACE_NAMES.has(String(p.name ?? ''));
export const HIDDEN_LABEL_RADIUS = 3;
export const LUMEN_MERCHANT = 'Lumen: merchant';
export const merchantFigure = (p: { name?: string; action?: string | null }) => p.action === 'merchant' && (p.name === 'Wandering trader' || p.name === LUMEN_MERCHANT);
export const figureNpc = (p: { name?: string; action?: string | null; npc_key?: string | null }) => merchantFigure(p) ? 'merchant' : p.npc_key ?? null;
/** Only the Lumen merchant marks the meeting, and only the first time. */
export const shouldMarkMerchantMet = (p: { name?: string | null; action?: string | null }, flags: Record<string, string>) => p.name === LUMEN_MERCHANT && p.action === 'merchant' && !flagSet(flags, 'met_lumen_merchant');
export const SAM_KEYS = new Set(['bernard', 'sam']);
/** Sam's home tier by sam_stage: start fire, Cinder Hollow, The First Spark, then Lumen. */
export const samHomeTier = (samStage: number | null | undefined) => { const s = Number(samStage) || 0; return s <= 2 ? 0 : s <= 4 ? 1 : s === 5 ? 2 : 3; };
/** A Sam home's tier is its show_when minimum (start fire has none). */
const homeTier = (p: { show_when?: ShowWhen }) => Number(p.show_when?.min_completed_level) || 0;
/** Applies show_when to every other place; Sam stands only at the home matching his stage. */
export const visiblePlaces = <T extends { show_when?: ShowWhen; npc_key?: string | null }>(places: T[], completed: number | null | undefined, samStage: number | null | undefined = 0, flags: Record<string, string> = {}) => {
  const samHomes = places.filter(p => p.npc_key && SAM_KEYS.has(p.npc_key));
  const tier = samHomeTier(samStage);
  const best = samHomes.filter(p => homeTier(p) <= tier).sort((a, b) => homeTier(b) - homeTier(a))[0] ?? null;
  const seen = new Set<string>();
  return places.filter(p => {
    if (p.npc_key && SAM_KEYS.has(p.npc_key)) return p === best;
    if (!showWhenMatches(p.show_when, completed, flags)) return false;
    if (!p.npc_key) return true;
    if (seen.has(p.npc_key)) return false;
    seen.add(p.npc_key); return true;
  });
};

/** Quest-log line for "Sam's land": where Sam waits, without numbers or game words. */
export const samLandLine = (samStage: number | null | undefined) => {
  const s = Number(samStage) || 0;
  if (s <= 2) return 'Sam is waiting by the fire where you woke.';
  if (s <= 4) return 'Sam is waiting outside Cinder Hollow.';
  if (s === 5) return 'Sam is waiting at The First Spark.';
  return 'Sam is waiting in Lumen.';
};

export type SamStage = { id: string; text: string; button_label: string | null; button_action_key?: string | null; condition: unknown; order_index: number };
export const requiredStageDrop = (condition: unknown) => {
  const c = condition as { has_drop?: unknown } | null;
  return typeof c?.has_drop === 'string' ? c.has_drop : null;
};
export const stageHasDrop = (condition: unknown, keys: ReadonlySet<string>) => { const key = requiredStageDrop(condition); return !key || keys.has(key); };
export const sevenFiresProgress = (flags: Record<string, string>) => ({ done: flags.seven_fires === 'done', count: Math.max(0, Math.min(7, flagNumber(flags, 'fires_lit'))) });
export const sevenFiresLine = (flags: Record<string, string>) => { const progress = sevenFiresProgress(flags); return progress.done ? 'All seven fires burn again.' : `${progress.count} of the 7 fires burn again`; };
export const firstMatchingStage = <T,>(stages: T[], matches: boolean[]) => stages.find((_, i) => matches[i]) ?? null;
export const fillName = (text: string, name: string) => text.replace(/\{name\}/g, name);

export type SamTopic = { key: string; label: string };
const TOPIC_LABELS: Record<string, string> = { instrument: 'The Instrument', sam_02: 'The cave', whistle: 'Your whistle', stones: 'The stones', words: 'The carved words', background: 'Where you came from', character: 'You', childhood: 'When you were young', lumen_well: 'The well', lumen_library: 'The library', lumen_exchange: 'The exchange', lumen_towns: 'Other towns' };
export const samTopics = (samStage: number): SamTopic[] => {
  const keys = [
    ...(samStage >= 2 ? ['instrument'] : []),
    ...(samStage === 3 ? ['sam_02'] : []),
    ...(samStage >= 3 ? ['whistle', 'stones', 'words'] : []),
    'background', 'character', 'childhood',
  ];
  return keys.map(key => ({ key, label: TOPIC_LABELS[key] }));
};

const GATED = new Set(['instrument', 'sam_02', 'whistle', 'stones', 'words']);
const topicLabel = (key: string) => TOPIC_LABELS[key] ?? key.replace(/^sam_/, '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
/** Stage-gated topics plus every other topic the book has a root for, so ungated topics are never dropped. */
export const cardTopics = (samStage: number, allEntries: BookNode[], flags: Record<string, string> = {}): SamTopic[] => {
  const entries = allEntries.filter(e => !isRetired(e.topic) && entryVisible(e, flags));
  const listed = samTopics(samStage);
  const known = new Set([...GATED, ...listed.map(t => t.key)]);
  const extra = [...new Set(entries.map(e => e.topic).filter((t): t is string => !!t && !known.has(t)))].map(key => ({ key, label: topicLabel(key) }));
  return [...listed, ...extra].filter(t => topicRoot(entries, t.key));
};

export const isRetired = (value: string | null | undefined) => typeof value === 'string' && value.startsWith('retired');
/** Book minimum gates apply only to numeric requirements with flags_equal=false. */
export const entryVisible = (e: { requires_flags?: Record<string, unknown> | null; flags_equal?: boolean | null }, flags: Record<string, string>) =>
  Object.entries(e.requires_flags ?? {}).every(([k, v]) => {
    if (k === 'flags_equal') return true;
    return compareFlag(flags[k], v, e.flags_equal === false);
  });
export type BookNode = { node_key: string; text: string; topic?: string | null; requires_flags?: Record<string, unknown> | null; flags_equal?: boolean | null; option_a_label?: string | null; option_a_target?: string | null; option_b_label?: string | null; option_b_target?: string | null };
/** Picks a random _a/_b variant (or the plain node) for a node key. */
export const pickNode = (entries: BookNode[], key: string, rand = Math.random) => {
  const list = entries.filter(e => e.node_key === key || e.node_key === `${key}_a` || e.node_key === `${key}_b`);
  return list.length ? list[Math.floor(rand() * list.length)] : null;
};
const baseKey = (k: string) => k.replace(/_[ab]$/, '');
/** A topic's roots: entries with that topic whose base node key ends in _root (deduped). */
export const topicRoots = (entries: BookNode[], topic: string) => [...new Set(entries.filter(e => e.topic === topic && baseKey(e.node_key).endsWith('_root')).map(e => baseKey(e.node_key)))];
export const topicRoot = (entries: BookNode[], topic: string, rand = Math.random) => {
  const roots = topicRoots(entries, topic);
  return roots.length ? roots[Math.floor(rand() * roots.length)] : null;
};

export const receiptLine = (given: unknown, dropNames: Record<string, string>) => (Array.isArray(given) ? given : []).map((g: Record<string, unknown>) => {
  if (g.steps != null) return `+${g.steps} steps`;
  if (g.credits != null) return `+${g.credits} credits`;
  if (g.drop != null) return `Kept: ${dropNames[String(g.drop)] ?? String(g.drop)}`;
  return '';
}).filter(Boolean).join(' · ');

const db = supabase as unknown as { from: (t: string) => any; rpc: (f: string, a: object) => any };
export async function loadSam(npcKey: string) {
  const { data: npc } = await db.from('npcs').select('*').eq('npc_key', npcKey).maybeSingle();
  if (!npc) return null;
  const [stages, book] = await Promise.all([
    db.from('npc_dialogue_stages').select('*').eq('npc_id', npc.id).eq('dimension', 'world').order('order_index'),
    db.from('npc_book_entries').select('*').eq('npc_id', npc.id),
  ]);
  return { npc: npc as { id: string; name: string }, stages: (stages.data ?? []) as SamStage[], book: ((book.data ?? []) as BookNode[]).filter(e => !isRetired(e.topic)) };
}
export async function currentStage(userId: string, stages: SamStage[]) {
  const drops = stages.some(s => requiredStageDrop(s.condition)) ? new Set((await readOwnedDrops(userId)).map(d => d.drop_key)) : new Set<string>();
  const matches = await Promise.all(stages.map(async s => {
    if (!stageHasDrop(s.condition, drops)) return false;
    const { data, error } = await db.rpc('npc_stage_matches', { p_uid: userId, p_cond: s.condition });
    return !error && data === true;
  }));
  return firstMatchingStage(stages, matches);
}
export const MISSING_ITEM_LINE = "You don't seem to have it on you.";
/** The server checks has_drop and performs take: itself, all or nothing. */
export async function runStage(stageId: string, userId?: string): Promise<{ ok: boolean; given?: unknown; reason?: string; handInFailed?: boolean; steps_remaining?: number; credits?: number }> {
  let result: NpcStageResult;
  try { result = await runNpcStage2(stageId); } catch (err) { return { ok: false, reason: (err as Error).message }; }
  if (!result.ok) return result.reason === 'missing_item' ? { ok: false, reason: MISSING_ITEM_LINE, handInFailed: true } : { ok: false, reason: result.reason };
  if (userId) {
    if (Number.isFinite(result.steps_remaining)) window.dispatchEvent(new CustomEvent(USER_STEPS_REFRESHED, { detail: { userId, steps: result.steps_remaining } }));
    if (Number.isFinite(result.credits)) window.dispatchEvent(new CustomEvent(USER_CREDITS_REFRESHED, { detail: { userId, credits: result.credits } }));
    await refreshDrops(userId).catch(() => undefined);
  }
  inventoryChanged();
  return result;
}
export async function dropNames() {
  const { data } = await db.from('drop_types').select('drop_key, name');
  return Object.fromEntries(((data ?? []) as { drop_key: string; name: string }[]).map(d => [d.drop_key, d.name]));
}
export async function samFlags(userId: string) {
  const { data } = await db.from('quest_flags').select('flag_key, flag_value').eq('user_id', userId);
  return Object.fromEntries(((data ?? []) as { flag_key: string; flag_value: string }[]).map(r => [r.flag_key, r.flag_value])) as Record<string, string>;
}
export async function samStageFlag(userId: string) {
  const { data } = await db.from('quest_flags').select('flag_value').eq('user_id', userId).eq('flag_key', 'sam_stage').maybeSingle();
  return Math.trunc(flagNumber({ v: data?.flag_value }, 'v'));
}
