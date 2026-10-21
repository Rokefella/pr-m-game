import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { supabase } from '@/lib/supabase';
import { getAllFlags, _getLoadedUser, questFlagSnapshot, subscribeQuestFlags } from '@/lib/questFlags';
import { getNpcQuestState, type QuestContext, type QuestEntry, type QuestStage } from '@/lib/npcQuestState';

export const NPC_DIALOGUE_CLOSED = 'praem:npc-dialogue-closed';
export const NPC_INVENTORY_CHANGED = 'praem:npc-inventory-changed';
type Data = { npcs: Record<string, { stages: QuestStage[]; entries: QuestEntry[] }>; drops: Set<string>; level: number; social: number; perception: number; trade: number };
const empty: Data = { npcs: {}, drops: new Set(), level: 1, social: 0, perception: 0, trade: 0 };
let snapshot = empty;
let owner: string | null = null;
let pending: Promise<void> | null = null;
let revision = 0;
let consumers = 0;
let stopRefresh: (() => void) | null = null;
let refreshQueued = false;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
function refresh(userId: string): Promise<void> {
  if (pending) { refreshQueued = true; return pending; }
  const version = revision;
  const request = (async () => {
    try {
      const [npcRows, stages, entries, drops, player] = await Promise.all([
        supabase.from('npcs').select('id, npc_key'),
        supabase.from('npc_dialogue_stages').select('*').order('order_index'),
        supabase.from('npc_book_entries').select('*'),
        supabase.from('drops').select('drop_types(drop_key)').eq('user_id', userId),
        supabase.from('users').select('level, social, perception, trade').eq('id', userId).maybeSingle(),
      ]);
      if (owner !== userId || version !== revision) return;
      if ([npcRows, stages, entries, drops, player].some(r => r.error)) return;
      const npcs: Data['npcs'] = {};
      for (const npc of npcRows.data ?? []) npcs[npc.npc_key] = {
        stages: (stages.data ?? []).filter(r => r.npc_id === npc.id) as unknown as QuestStage[],
        entries: (entries.data ?? []).filter(r => r.npc_id === npc.id) as unknown as QuestEntry[],
      };
      const keys = new Set<string>();
      for (const row of drops.data ?? []) {
        const types = Array.isArray(row.drop_types) ? row.drop_types : [row.drop_types];
        for (const type of types) if (type?.drop_key) keys.add(type.drop_key);
      }
      const stats = player.data as { level?: number; social?: number; perception?: number; trade?: number } | null;
      snapshot = { npcs, drops: keys, level: stats?.level ?? 1, social: stats?.social ?? 0, perception: stats?.perception ?? 0, trade: stats?.trade ?? 0 };
      listeners.forEach(fn => fn());
    } catch { /* Marker failures must never interrupt gameplay. */ }
  })().finally(() => {
    if (pending !== request) return;
    pending = null;
    if (refreshQueued && owner === userId) { refreshQueued = false; void refresh(userId); }
  });
  pending = request;
  return pending;
}

/** One session snapshot shared by every orb; no queries or rule evaluation in animation loops. */
export function useNpcQuestStates(userId?: string, overrides?: Partial<Omit<QuestContext, 'flags' | 'drops' | 'stages' | 'entries'>>) {
  const data = useSyncExternalStore(subscribe, () => snapshot);
  const flags = useSyncExternalStore(subscribeQuestFlags, questFlagSnapshot);
  useEffect(() => {
    if (!userId) return;
    if (owner !== userId) { stopRefresh?.(); stopRefresh = null; owner = userId; revision++; snapshot = empty; pending = null; }
    if (_getLoadedUser() !== userId) void getAllFlags(userId);
    consumers++;
    if (!stopRefresh) {
      void refresh(userId);
      const update = () => { void refresh(userId); };
      window.addEventListener(NPC_DIALOGUE_CLOSED, update);
      window.addEventListener(NPC_INVENTORY_CHANGED, update);
      const channel = supabase.channel(`npc-quests-${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'drops', filter: `user_id=eq.${userId}` }, update).subscribe();
      stopRefresh = () => { window.removeEventListener(NPC_DIALOGUE_CLOSED, update); window.removeEventListener(NPC_INVENTORY_CHANGED, update); void supabase.removeChannel(channel); };
    }
    return () => { consumers--; if (!consumers) { stopRefresh?.(); stopRefresh = null; } };
  }, [userId]);
  const level = overrides?.level ?? data.level;
  const social = overrides?.social ?? data.social;
  const perception = overrides?.perception ?? data.perception;
  const trade = overrides?.trade ?? data.trade;
  const rescue = overrides?.rescue;
  return useMemo(() => {
    const result = new Map<string, ReturnType<typeof getNpcQuestState>>();
    return (name: string) => {
      if (!userId || owner !== userId || _getLoadedUser() !== userId) return 'none' as const;
      const key = name.toLowerCase().replace(/^the\s+/, '').split(' ')[0];
      const existing = result.get(key);
      if (existing) return existing;
      const state = getNpcQuestState(key, { level, social, perception, trade, rescue, flags, drops: data.drops, ...data.npcs[key] });
      result.set(key, state);
      return state;
    };
  }, [userId, data, flags, level, social, perception, trade, rescue?.alexandraFound, rescue?.claireFound, rescue?.following]);
}