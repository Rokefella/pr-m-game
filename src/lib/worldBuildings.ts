import { WORLD_TILE, type Terrain, type WorldChunkCache, type WorldPoint } from './worldTest';

export type WorldBuilding = WorldPoint & { terrain: Terrain };
export function buildingBox(b: WorldBuilding) {
  const w = b.terrain.footprint_w ?? 2, h = b.terrain.footprint_h ?? 2;
  const spriteW = (b.terrain.sprite_w ?? w * 16) / 16, spriteH = (b.terrain.sprite_h ?? h * 16) / 16;
  return { x: b.x, y: b.y + h - spriteH, w: spriteW, h: spriteH, bottom: b.y + h, footprintW: w };
}
export function buildingOpacity(b: WorldBuilding, player: WorldPoint) {
  const box = buildingBox(b);
  return player.x >= box.x && player.x < box.x + box.w && player.y >= box.y && player.y < b.y ? .45 : 1;
}
/** Only anchors draw; the three-cell margin includes art rising above off-screen footprints. */
export function visibleBuildings(cache: WorldChunkCache, types: Map<string, Terrain>, camera: WorldPoint, width: number, height: number): WorldBuilding[] {
  const result: WorldBuilding[] = [];
  const x0 = Math.max(0, Math.floor(camera.x / WORLD_TILE) - 3), y0 = Math.max(0, Math.floor(camera.y / WORLD_TILE) - 3);
  const x1 = Math.min(cache.size - 1, Math.ceil((camera.x + width) / WORLD_TILE) + 3), y1 = Math.min(cache.size - 1, Math.ceil((camera.y + height) / WORLD_TILE) + 3);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const terrain = types.get(cache.terrainKey(x, y) ?? '');
    if (terrain?.key.startsWith('bld_') && terrain.key !== 'bld_part') result.push({ x, y, terrain });
    if (!terrain) void cache.load(x, y);
  }
  return result.sort((a, b) => buildingBox(a).bottom - buildingBox(b).bottom);
}