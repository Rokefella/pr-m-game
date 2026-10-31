import { supabase } from '@/lib/supabase';

type FlagMap = Record<string, string>;

export { compareFlag, flagNumber } from './flagValues';

let cache: FlagMap = {};
let loadedForUser: string | null = null;
const listeners = new Set<() => void>();
export function subscribeQuestFlags(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function questFlagSnapshot(): Readonly<FlagMap> { return cache; }
function publishFlags() { listeners.forEach(listener => listener()); }

export async function getAllFlags(userId: string): Promise<FlagMap> {
  const { data, error } = await supabase
    .from('quest_flags')
    .select('flag_key, flag_value')
    .eq('user_id', userId);

  if (error) {
    console.error('[questFlags] getAllFlags error:', error);
    return cache;
  }

  const next: FlagMap = {};
  for (const row of data || []) {
    next[(row as { flag_key: string }).flag_key] = (row as { flag_value: string }).flag_value;
  }
  cache = next;
  loadedForUser = userId;
  publishFlags();
  return cache;
}

export function getFlag(key: string): string | null {
  return cache[key] ?? null;
}

/** Recover Bernard from persisted progress, never a level or a run/session marker. */
export async function reconcileBernardAfterShadow(userId: string, transferSaved = false): Promise<boolean> {
  try {
    const flags = await getAllFlags(userId);
    // Only this exact transition is automatic; earlier quests and later rewards stay intact.
    if (loadedForUser !== userId || flags.bernard_stage !== '3') return false;
    let completed = transferSaved || flags.shadow_visited === 'true';
    if (!completed) {
      const { data, error } = await supabase.from('library').select('id').eq('user_id', userId).limit(1);
      if (error) throw error;
      completed = (data ?? []).length > 0;
    }
    if (!completed) return false;
    const { error } = await supabase.from('quest_flags').upsert(
      { user_id: userId, flag_key: 'bernard_stage', flag_value: '4', updated_at: new Date().toISOString() },
      { onConflict: 'user_id,flag_key' },
    );
    if (error) throw error;
    if (loadedForUser === userId) {
      cache = { ...cache, bernard_stage: '4' };
      publishFlags();
    }
    return true;
  } catch (error) {
    // Quest repair is retryable on the next village visit and cannot fail a saved transfer.
    console.error('[questFlags] Bernard Shadow recovery failed:', error);
    return false;
  }
}

export async function setFlag(userId: string, key: string, value: string): Promise<void> {
  cache = { ...cache, [key]: value };
  loadedForUser = userId;
  publishFlags();
  const { error } = await supabase
    .from('quest_flags')
    .upsert(
      { user_id: userId, flag_key: key, flag_value: value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,flag_key' },
    );
  if (error) {
    console.error('[questFlags] setFlag error:', error, { key, value });
  }
}

export function hasFlags(keys: string[]): boolean {
  return keys.every((k) => cache[k] === 'true');
}

export function _resetQuestFlagCache(): void {
  cache = {};
  loadedForUser = null;
  publishFlags();
}

export function _getLoadedUser(): string | null {
  return loadedForUser;
}
