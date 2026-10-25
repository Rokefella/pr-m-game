import { supabase } from '@/lib/supabase';
import type { Terrain } from './worldTest';
import { worldHash } from './worldHash';
import { loadTerrainSprites } from './terrainTile';
export type MazeSkin = { era_order: number; name: string; wall_keys: string[]; floor_keys: string[]; edge: { key: string; p: number }[]; junction_key: string | null; straight_key: string | null; darkness: number; accent: string; enabled: boolean };
export type LevelSkin = { place_name: string; era_name: string; skin: MazeSkin; terrain: Map<string, Terrain> };
export const skinHash = worldHash;
export const skinDarkness = (darkness: number) => Math.min(.35, Math.max(0, .05 * (darkness - 1)));
export function skinTile(x: number, y: number, skin: MazeSkin, open: ReadonlySet<string>, walls: ReadonlySet<string>) {
  const wall = walls.has(`${x},${y}`);
  if (wall) return { wall, key: skin.wall_keys[skinHash(x, y, 5) < .25 ? Math.floor(skinHash(Math.floor(x / 3), Math.floor(y / 3), 3) * skin.wall_keys.length) : 0], edge: undefined, junction: undefined };
  const cx = Math.floor(x / 2), cy = Math.floor(y / 2);
  let key = skin.floor_keys[skinHash(cx, cy, 6) < .35 ? Math.floor(skinHash(cx, cy, 4) * skin.floor_keys.length) : 0];
  const neighbours = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
  const opens = neighbours.map(([col, row]) => open.has(`${col},${row}`)), count = opens.filter(Boolean).length;
  if (skin.straight_key && count === 2 && ((opens[0] && opens[1]) || (opens[2] && opens[3])) && skinHash(Math.floor(x / 4), Math.floor(y / 4), 8) < .35) key = skin.straight_key;
  const edge = neighbours.some(([col, row]) => walls.has(`${col},${row}`)) ? skin.edge.find((entry, i) => skinHash(x, y, 17 + i) < entry.p)?.key : undefined;
  const junction = skin.junction_key && count >= 3 && skinHash(x, y, 13) < .5 ? skin.junction_key : undefined;
  return { wall, key, edge, junction };
}
/** Read-only metadata; failure falls back to the original maze artwork. */
export async function readMazeSkin(level: number, override?: number, onMetadata?: (accent: string, label: string) => void): Promise<LevelSkin | null> {
  try {
    const { data: view } = await supabase.from('maze_level_skins' as never).select('place_name, era_name, skin').eq('level_number', level).maybeSingle();
    const row = view as unknown as { place_name?: string; era_name?: string; skin?: MazeSkin } | null;
    let skin = row?.skin;
    if (override !== undefined) {
      const { data } = await supabase.from('maze_skins' as never).select('*').eq('era_order', override).maybeSingle();
      skin = data as unknown as MazeSkin | undefined;
    }
    if (!skin || skin.enabled === false || !Array.isArray(skin.wall_keys) || !skin.wall_keys.length || !Array.isArray(skin.floor_keys) || !skin.floor_keys.length) return null;
    onMetadata?.(skin.accent, `${row?.place_name ?? ''} · ${override !== undefined ? skin.name : row?.era_name ?? skin.name}`);
    const { data, error } = await supabase.from('world_terrain_types' as never).select('*');
    if (error || !Array.isArray(data)) return null;
    const terrain = new Map((data as unknown as Terrain[]).map(t => [t.key, t]));
    if ([...skin.wall_keys, ...skin.floor_keys, ...(skin.edge ?? []).map(e => e.key), skin.straight_key, skin.junction_key].some(key => key && !terrain.has(key))) return null;
    await loadTerrainSprites(terrain.values());
    return { place_name: row?.place_name ?? '', era_name: override !== undefined ? skin.name : row?.era_name ?? skin.name, skin: { ...skin, edge: skin.edge ?? [] }, terrain };
  } catch { return null; }
}
