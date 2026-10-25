export const WORLD_RETURN_KEY = 'praem.worldReturn';
export const WORLD_POS_KEY = 'praem.worldPos';
export type WorldSpot = { layer: 0 | 1; x: number; y: number };

function read(key: string): WorldSpot | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<WorldSpot>;
    if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) return null;
    return { layer: Number(v.layer) === 1 ? 1 : 0, x: Number(v.x), y: Number(v.y) };
  } catch { return null; }
}
const write = (key: string, spot: WorldSpot) => { try { localStorage.setItem(key, JSON.stringify(spot)); } catch { /* storage unavailable */ } };

export const saveWorldReturn = (spot: WorldSpot) => write(WORLD_RETURN_KEY, spot);
export const saveWorldPos = (spot: WorldSpot) => write(WORLD_POS_KEY, spot);
export const hasWorldReturn = () => read(WORLD_RETURN_KEY) !== null;

/** Where an exit that normally goes to the village should go: /world when the trip started there. */
export const exitDestination = () => hasWorldReturn() ? '/world' : '/village';

/** Opening /world: a pending return wins (and is consumed), then the last position. */
export function takeWorldOpening(): WorldSpot | null {
  const back = read(WORLD_RETURN_KEY);
  if (back) { try { localStorage.removeItem(WORLD_RETURN_KEY); } catch { /* ignore */ } return back; }
  return read(WORLD_POS_KEY);
}
