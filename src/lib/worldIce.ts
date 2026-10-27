import { worldWalkable, WORLD_MOVE_MS, type Terrain, type WorldPoint } from './worldTest';
export const isIce = (terrain?: Pick<Terrain, 'key'>) => terrain?.key === 'ice';
export const ICE_MOVE_MS = WORLD_MOVE_MS / 3;
export const npcTerrainSafe = (terrain?: Terrain) => worldWalkable(terrain) && !isIce(terrain) && terrain?.grp !== 'water' && !/building|^house_|^bld_|signpost/.test(terrain?.key ?? '');
export function iceNext(from: WorldPoint, direction: WorldPoint, terrainAt: (point: WorldPoint) => Terrain | undefined) {
  const next = { x: from.x + direction.x, y: from.y + direction.y };
  return worldWalkable(terrainAt(next)) ? next : null;
}