import { eraAt, eraPointFor, WORLD_TILE, type WorldLayer, type Era, type Place, type Terrain, type WorldPoint, type WorldChunkCache } from './worldTest';
import { drawTerrain, type TerrainInk } from './terrainTile';
export { drawTerrain, eraColor } from './terrainTile';
export type WorldInk = TerrainInk & { dusk: string; night: string; dawn: string };
export function drawPlace(ctx: CanvasRenderingContext2D, place: Place, px: number, py: number, ink: WorldInk) {
  ctx.save(); ctx.translate(px + 20, py + 20); ctx.strokeStyle = place.kind === 'maze_entrance' ? ink.gold : ink.text; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 2;
  ctx.beginPath();
  const action = place.action ?? '';
  if (action.startsWith('door_')) { ctx.rect(-7, -11, 14, 21); ctx.moveTo(3, 0); ctx.lineTo(4, 0); }
  else if (action === 'ascend') { ctx.moveTo(0, 10); ctx.lineTo(0, -10); ctx.moveTo(-7, -3); ctx.lineTo(0, -10); ctx.lineTo(7, -3); }
  else if (action === 'shadow') { ctx.strokeStyle = ink.shadow; ctx.lineWidth = 3; for (let a = 0; a < Math.PI * 5; a += .3) { const r = 1 + a * .8; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke(); ctx.strokeStyle = ink.muted; ctx.lineWidth = 1; }
  else if (action === 'descend') { ctx.strokeStyle = ink.muted; ctx.lineWidth = 4; ctx.arc(0, 0, 9, 0, Math.PI * 2); }
  else switch (place.kind) {
    case 'start': ctx.moveTo(-5, 10); ctx.lineTo(-5, -11); ctx.lineTo(9, -11); ctx.lineTo(6, -3); ctx.lineTo(-5, -3); break;
    case 'town': ctx.moveTo(-10, -1); ctx.lineTo(0, -11); ctx.lineTo(10, -1); ctx.lineTo(8, -1); ctx.lineTo(8, 10); ctx.lineTo(-8, 10); ctx.lineTo(-8, -1); break;
    case 'maze_entrance': ctx.moveTo(0, -12); ctx.lineTo(12, 0); ctx.lineTo(0, 12); ctx.lineTo(-12, 0); ctx.closePath(); break;
    case 'landmark': ctx.rect(-6, -12, 12, 22); ctx.moveTo(-9, 11); ctx.lineTo(9, 11); break;
    case 'npc_home': ctx.arc(0, 0, 8, 0, Math.PI * 2); break;
    case 'well': ctx.strokeStyle = ink.muted; ctx.lineWidth = 4; ctx.arc(0, 0, 9, 0, Math.PI * 2); break;
    default: ctx.rect(-4, -4, 8, 8); break;
  }
  ctx.stroke();
  ctx.font = '9px "DM Mono", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = ink.gold;
  if (place.kind === 'maze_entrance') ctx.fillText(String(place.maze_level ?? ''), 0, 3);
  ctx.font = '11px "IM Fell English", serif'; ctx.strokeStyle = ink.shadow; ctx.lineWidth = 3; ctx.strokeText(place.name, 0, -20); ctx.fillStyle = ink.text; ctx.fillText(place.name, 0, -20); ctx.restore();
}
export function drawWorld(ctx: CanvasRenderingContext2D, cache: WorldChunkCache, types: Map<string, Terrain>, eras: Era[], places: Place[], camera: WorldPoint, width: number, height: number, time: number, ink: WorldInk, reduced: boolean, layer: WorldLayer = 0) {
  ctx.fillStyle = ink.background; ctx.fillRect(0, 0, width, height);
  const size = cache.size;
  const x0 = Math.max(0, Math.floor(camera.x / WORLD_TILE)), y0 = Math.max(0, Math.floor(camera.y / WORLD_TILE));
  const x1 = Math.min(size - 1, Math.ceil((camera.x + width) / WORLD_TILE)), y1 = Math.min(size - 1, Math.ceil((camera.y + height) / WORLD_TILE));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x * WORLD_TILE - camera.x, py = y * WORLD_TILE - camera.y;
    const key = cache.terrainKey(x, y), terrain = key ? types.get(key) : undefined;
    if (terrain) drawTerrain(ctx, terrain, eraAt(eraPointFor({ x, y }, layer), eras), x, y, px, py, time, ink, reduced);
    else { ctx.strokeStyle = ink.grid; ctx.globalAlpha = .2; ctx.strokeRect(px, py, WORLD_TILE, WORLD_TILE); ctx.globalAlpha = 1; void cache.load(x, y); }
  }
  if (layer === 1) { ctx.fillStyle = ink.shadow; ctx.globalAlpha = .4; ctx.fillRect(0, 0, width, height); ctx.globalAlpha = 1; }
  for (const place of places) if (place.x >= x0 && place.x <= x1 && place.y >= y0 && place.y <= y1) drawPlace(ctx, place, place.x * WORLD_TILE - camera.x, place.y * WORLD_TILE - camera.y, ink);
}