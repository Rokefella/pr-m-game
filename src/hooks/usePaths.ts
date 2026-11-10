import { useEffect, useSyncExternalStore } from 'react';
import { supabase } from '@/lib/supabase';
import { parsePaths, type Path } from '@/lib/paths';
// Same event names as useNpcQuestStates (kept literal so test mocks of that module don't break paths).
const NPC_DIALOGUE_CLOSED = 'praem:npc-dialogue-closed';
const NPC_INVENTORY_CHANGED = 'praem:npc-inventory-changed';

/** Fire after anything that can move a path on (e.g. a claimed world find). */
export const PATHS_REFRESH = 'praem:paths-refresh';
type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
const rpc: Rpc = (fn, args) => (supabase.rpc as unknown as Rpc)(fn, args);

let snapshot: Path[] = [];
let owner: string | null = null;
let consumers = 0;
let stop: (() => void) | null = null;
let pending: Promise<void> | null = null;
let queued = false;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const emit = () => listeners.forEach(fn => fn());

export function refreshPaths(userId: string): Promise<void> {
  if (pending) { queued = true; return pending; }
  const request = (async () => {
    try {
      const { data, error } = await rpc('my_paths');
      if (error || owner !== userId) return;
      snapshot = parsePaths(data); emit();
    } catch { /* Paths must never interrupt gameplay. */ }
  })().finally(() => {
    pending = null;
    if (queued && owner === userId) { queued = false; void refreshPaths(userId); }
  });
  pending = request;
  return request;
}

/** Remembers the seen step locally at once so it never repeats, then tells the server. */
export async function markPathSeen(quest: string, step: string) {
  snapshot = snapshot.map(p => p.quest_key === quest ? { ...p, seen: step } : p); emit();
  try { await rpc('path_seen', { p_quest: quest, p_step: step }); } catch { /* ignore */ }
}

/** Read-only view of the shared snapshot (no fetching). */
export const usePathsSnapshot = () => useSyncExternalStore(subscribe, () => snapshot);

export function usePaths(userId?: string | null) {
  const paths = usePathsSnapshot();
  useEffect(() => {
    if (!userId) return;
    if (owner !== userId) { stop?.(); stop = null; owner = userId; snapshot = []; pending = null; emit(); }
    consumers++;
    if (!stop) {
      const update = () => { void refreshPaths(userId); };
      [NPC_DIALOGUE_CLOSED, NPC_INVENTORY_CHANGED, PATHS_REFRESH].forEach(e => window.addEventListener(e, update));
      stop = () => [NPC_DIALOGUE_CLOSED, NPC_INVENTORY_CHANGED, PATHS_REFRESH].forEach(e => window.removeEventListener(e, update));
    }
    void refreshPaths(userId); // each world/town mount (incl. returning from a maze)
    return () => { consumers--; if (!consumers) { stop?.(); stop = null; } };
  }, [userId]);
  return owner === userId ? paths : [];
}

export function _resetPathsForTests() { snapshot = []; owner = null; consumers = 0; stop?.(); stop = null; pending = null; queued = false; }
