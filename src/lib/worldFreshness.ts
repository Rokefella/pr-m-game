import { supabase } from './supabase';

export const CHUNKS_BUILT_KEY = 'praem.worldChunksBuiltAt';
export const OVERVIEW_BUILT_KEY = 'praem.worldOverviewBuiltAt';

/** Newest built_at in a table, as epoch ms; null when unknown. */
export async function latestBuiltAt(table: 'world_chunk_cache' | 'world_overview'): Promise<number | null> {
  try {
    const { data, error } = await supabase.from(table as never).select('built_at').order('built_at', { ascending: false }).limit(1);
    if (error || !Array.isArray(data) || !data.length) return null;
    const t = Date.parse(String((data[0] as { built_at?: string }).built_at ?? ''));
    return Number.isFinite(t) ? t : null;
  } catch { return null; }
}

/** True when the server stamp is newer than the stored one; stores the server stamp. */
export function isStale(key: string, server: number | null): boolean {
  if (server === null) return false;
  let stored = NaN;
  try { stored = Number(localStorage.getItem(key)); } catch { /* storage unavailable */ }
  try { localStorage.setItem(key, String(server)); } catch { /* storage unavailable */ }
  return !Number.isFinite(stored) || stored === 0 ? false : server > stored;
}
