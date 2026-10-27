export const WORLD_RETURN_KEY = 'praem.worldReturn';
export const WORLD_POS_KEY = 'praem.worldPos';
export const WORLD_LAYOUT_VERSION = 4;
export const WORLD_LAYOUT_VERSION_KEY = 'praem.worldLayoutVersion';
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
export const saveWorldPos = (spot: WorldSpot) => {
  write(WORLD_POS_KEY, spot);
  try { localStorage.setItem(WORLD_LAYOUT_VERSION_KEY, String(WORLD_LAYOUT_VERSION)); } catch { /* storage unavailable */ }
};
export const hasWorldReturn = () => read(WORLD_RETURN_KEY) !== null;

/** Every normal home exit goes to the world, regardless of the trip's origin. */
export const exitDestination = () => '/world';

/** Opening /world: a pending return wins (and is consumed), then the last position. */
export function takeWorldOpening(): WorldSpot | null {
  try {
    if (localStorage.getItem(WORLD_LAYOUT_VERSION_KEY) !== String(WORLD_LAYOUT_VERSION)) {
      localStorage.removeItem(WORLD_POS_KEY); localStorage.removeItem(WORLD_RETURN_KEY);
      localStorage.setItem(WORLD_LAYOUT_VERSION_KEY, String(WORLD_LAYOUT_VERSION));
      return null;
    }
  } catch { return null; }
  const back = read(WORLD_RETURN_KEY);
  if (back) { try { localStorage.removeItem(WORLD_RETURN_KEY); } catch { /* ignore */ } return back; }
  return read(WORLD_POS_KEY);
}
