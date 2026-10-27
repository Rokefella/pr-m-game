import { useEffect, useState } from 'react';
import { eraPointFor, type Place, type WorldPoint } from './worldTest';
import { SAM_KEYS, visiblePlaces } from './worldSam';
import type { WorldFind } from './worldFinds';

export const DEV_MAP_KEY = 'praem.devMapShowAll';
const CHANGE = 'praem:dev-map-show-all';
export function devMapEnabled(registration: number | null | undefined) {
  if (registration !== 1) return false;
  try { return localStorage.getItem(DEV_MAP_KEY) === '1'; } catch { return false; }
}
export function setDevMapEnabled(registration: number | null | undefined, enabled: boolean) {
  if (registration !== 1) return;
  try { localStorage.setItem(DEV_MAP_KEY, enabled ? '1' : '0'); } catch { /* Storage may be unavailable. */ }
  window.dispatchEvent(new Event(CHANGE));
}
export function useDevMapEnabled(registration: number | null | undefined) {
  const [enabled, setEnabled] = useState(() => devMapEnabled(registration));
  useEffect(() => {
    setEnabled(devMapEnabled(registration));
    const update = () => setEnabled(devMapEnabled(registration));
    window.addEventListener(CHANGE, update); window.addEventListener('storage', update);
    return () => { window.removeEventListener(CHANGE, update); window.removeEventListener('storage', update); };
  }, [registration]);
  return registration === 1 && enabled;
}
export type DevMapMarker = WorldPoint & { id: string; name: string; at: WorldPoint; tone: 'place' | 'trader' | 'fire' | 'item' | 'words' | 'claimed' | 'sam' | 'player'; symbol: string };
export const placeSymbol = (p: Place) => p.kind === 'maze_entrance' ? '◇' : p.kind === 'npc_home' ? '○' : p.action === 'merchant' ? '¤' : p.action === 'door_library' ? '▥' : '⌂';
export function devMapMarkers(registration: number | null | undefined, enabled: boolean, places: Place[], finds: (WorldFind & { enabled?: boolean })[], claimed: Set<string>, samStage: number, player: WorldPoint, layer: 0 | 1): DevMapMarker[] {
  if (registration !== 1 || !enabled) return [];
  const project = (p: WorldPoint & { layer?: number | null }) => eraPointFor(p, Number(p.layer) === 1 ? 1 : 0);
  const marks: DevMapMarker[] = places.map((p, i) => ({ ...p, id: `place-${i}`, at: project(p), tone: p.name === 'Wandering trader' ? 'trader' : 'place', symbol: placeSymbol(p) }));
  for (const f of finds.filter(f => f.enabled !== false)) marks.push({ ...f, id: `find-${f.id}`, name: f.title, at: project(f), tone: claimed.has(f.id) ? 'claimed' : f.kind === 'quest_object' ? 'fire' : ['words', 'landmark', 'note'].includes(f.kind) ? 'words' : 'item', symbol: f.kind === 'quest_object' ? '✶' : '▲' });
  const sam = visiblePlaces(places, 0, samStage).find(p => p.npc_key && SAM_KEYS.has(p.npc_key));
  if (sam) marks.push({ ...sam, id: 'sam-current', name: 'Sam', at: project(sam), tone: 'sam', symbol: '○' });
  marks.push({ ...player, id: 'player', name: 'Your position', at: eraPointFor(player, layer), tone: 'player', symbol: '●' });
  return marks;
}