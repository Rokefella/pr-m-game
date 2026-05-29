import { supabase } from '@/lib/supabase';

type FlagMap = Record<string, string>;

let cache: FlagMap = {};
let loadedForUser: string | null = null;

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
  return cache;
}

export function getFlag(key: string): string | null {
  return cache[key] ?? null;
}

export async function setFlag(userId: string, key: string, value: string): Promise<void> {
  cache[key] = value;
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
}

export function _getLoadedUser(): string | null {
  return loadedForUser;
}
