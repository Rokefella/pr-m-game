import { supabase } from '@/lib/supabase';
import { inventoryChanged } from './inventoryEvents';

/** Optional world_places visibility rule compared against users.maze_completed_level. */
export type ShowWhen = { min_completed_level?: number | null; max_completed_level?: number | null } | null | undefined;
export const showWhenMatches = (rule: ShowWhen, completed: number | null | undefined) => {
  if (!rule) return true;
  const level = Number(completed) || 0;
  if (rule.min_completed_level != null && level < Number(rule.min_completed_level)) return false;
  if (rule.max_completed_level != null && level > Number(rule.max_completed_level)) return false;
  return true;
};
export const SAM_KEYS = new Set(['bernard', 'sam']);
/** Sam's home tier by sam_stage: start fire, Cinder Hollow, The First Spark, then Lumen. */
export const samHomeTier = (samStage: number | null | undefined) => { const s = Number(samStage) || 0; return s <= 2 ? 0 : s <= 4 ? 1 : s === 5 ? 2 : 3; };
/** A Sam home's tier is its show_when minimum (start fire has none). */
const homeTier = (p: { show_when?: ShowWhen }) => Number(p.show_when?.min_completed_level) || 0;
/** Applies show_when to every other place; Sam stands only at the home matching his stage. */
export const visiblePlaces = <T extends { show_when?: ShowWhen; npc_key?: string | null }>(places: T[], completed: number | null | undefined, samStage: number | null | undefined = 0) => {
  const samHomes = places.filter(p => p.npc_key && SAM_KEYS.has(p.npc_key));
  const tier = samHomeTier(samStage);
  const best = samHomes.filter(p => homeTier(p) <= tier).sort((a, b) => homeTier(b) - homeTier(a))[0] ?? null;
  const seen = new Set<string>();
  return places.filter(p => {
    if (p.npc_key && SAM_KEYS.has(p.npc_key)) return p === best;
    if (!showWhenMatches(p.show_when, completed)) return false;
    if (!p.npc_key) return true;
    if (seen.has(p.npc_key)) return false;
    seen.add(p.npc_key); return true;
  });
};

export type SamStage = { id: string; text: string; button_label: string | null; condition: unknown; order_index: number };
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
/** An entry is visible when every requires_flags value matches the player's flags. */
export const entryVisible = (e: { requires_flags?: Record<string, unknown> | null }, flags: Record<string, string>) =>
  Object.entries(e.requires_flags ?? {}).every(([k, v]) => k === 'flags_equal' || String(flags[k] ?? '') === String(v));
export type BookNode = { node_key: string; text: string; topic?: string | null; requires_flags?: Record<string, unknown> | null; option_a_label?: string | null; option_a_target?: string | null; option_b_label?: string | null; option_b_target?: string | null };
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
  const matches = await Promise.all(stages.map(async s => {
    const { data, error } = await db.rpc('npc_stage_matches', { p_uid: userId, p_cond: s.condition });
    return !error && data === true;
  }));
  return firstMatchingStage(stages, matches);
}
export async function runStage(stageId: string) {
  const { data, error } = await db.rpc('run_npc_stage', { p_stage: stageId });
  if (error) return { ok: false, reason: error.message } as { ok: boolean; given?: unknown; reason?: string };
  const result = (data ?? { ok: false }) as { ok: boolean; given?: unknown; reason?: string };
  if (result.ok) inventoryChanged();
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
  return parseInt(data?.flag_value ?? '0', 10) || 0;
}
