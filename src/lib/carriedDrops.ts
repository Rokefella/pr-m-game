import { supabase } from '@/lib/supabase';

export const DROPS_REFRESHED = 'praem:drops-refreshed';
export type OwnedDrop = {
  id: string; drop_key: string; name: string; description: string | null;
  category: string | null; icon_svg: string | null; rarity?: string | null;
  carried: boolean; run_level: number | null;
};
export type DropsRefresh = { userId: string; drops: OwnedDrop[] };

export async function readOwnedDrops(userId: string): Promise<OwnedDrop[]> {
  const { data, error } = await supabase.from('drops' as never)
    .select('id, carried, run_level, drop_types(drop_key, name, description, category, icon_svg, rarity)')
    .eq('user_id', userId);
  if (error) throw error;
  type DropType = Partial<Omit<OwnedDrop, 'id' | 'carried' | 'run_level'>>;
  const rows = (data ?? []) as unknown as Array<{ id: string; carried?: boolean; run_level?: number | null; drop_types?: DropType | DropType[] }>;
  return rows.map(row => {
    const type = Array.isArray(row.drop_types) ? row.drop_types[0] : row.drop_types;
    return {
      id: row.id, carried: row.carried === true, run_level: row.run_level ?? null,
      drop_key: type?.drop_key ?? '', name: type?.name ?? 'Unknown',
      description: type?.description ?? null, category: type?.category ?? null,
      icon_svg: type?.icon_svg ?? null, rarity: type?.rarity ?? null,
    };
  });
}

export function carriedDropCount(drops: OwnedDrop[], level: number): number {
  return drops.filter(drop => drop.carried && drop.run_level === level).length;
}

/** Presentation reads must never turn a successful mutation into a failure. */
export async function refreshDrops(userId: string): Promise<OwnedDrop[] | null> {
  try {
    const drops = await readOwnedDrops(userId);
    window.dispatchEvent(new CustomEvent<DropsRefresh>(DROPS_REFRESHED, { detail: { userId, drops } }));
    return drops;
  } catch (error) {
    console.error('[Drops] refresh failed', error);
    return null;
  }
}

export function exitCarryWarning(fragments: number, drops: number): string {
  const parts = [fragments > 0 ? `${fragments} fragments` : '', drops > 0 ? `${drops} drops` : ''].filter(Boolean);
  return parts.length ? `Leaving now loses the ${parts.join(' and ')} you carry from this run. Bank them in the Shadow Realm first.` : 'You carry no fragments or drops from this run.';
}