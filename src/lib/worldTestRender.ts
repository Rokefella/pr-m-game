import { chunkOrigin, eraAt, eraPointFor, WORLD_CHUNK, WORLD_TILE, type WorldLayer, type Era, type Place, type Terrain, type WorldChunk, type WorldPoint, type WorldChunkCache } from './worldTest';
import { drawTerrainBase, drawTerrainMotion, isObjectLayer, spriteVersion, type TerrainInk } from './terrainTile';
import { buildingBlockCanvas, buildingVersion } from './theme/buildingCanvas';
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
const CHUNK_PX = 16;
type ChunkArt = { canvas: HTMLCanvasElement; sig: string };
const chunkArt = new WeakMap<WorldChunk, ChunkArt>();
const neighbourSig = (cache: WorldChunkCache, c: WorldChunk) => [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => cache.chunks.has(cache.key(c.x0 + dx * WORLD_CHUNK, c.y0 + dy * WORLD_CHUNK)) ? 1 : 0).join('');
/** Objects borrow authored ground, with deterministic left/up/right/down precedence. */
export function worldObjectGround(cache: WorldChunkCache, types: Map<string, Terrain>, x: number, y: number, fallback?: Terrain): Terrain | undefined {
  for (const [dx, dy] of [[-1, 0], [0, -1], [1, 0], [0, 1]]) {
    const neighbour = types.get(cache.terrainKey(x + dx, y + dy) ?? '');
    if (neighbour && (neighbour.render_layer === 'ground' || (!neighbour.icon_svg?.trim() && !isObjectLayer(neighbour)))) return neighbour;
  }
  return fallback;
}
/** Static chunk art at 16 px per cell; redrawn only when sprites, building art or neighbouring chunks change. */
function chunkCanvas(cache: WorldChunkCache, chunk: WorldChunk, types: Map<string, Terrain>, eras: Era[], ink: WorldInk, layer: WorldLayer) {
  const sig = `${spriteVersion}:${buildingVersion}:${neighbourSig(cache, chunk)}`;
  const hit = chunkArt.get(chunk);
  if (hit && hit.sig === sig) return hit.canvas;
  const canvas = hit?.canvas ?? document.createElement('canvas');
  canvas.width = chunk.w * CHUNK_PX; canvas.height = chunk.h * CHUNK_PX;
  const ctx = canvas.getContext('2d'); if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false; ctx.fillStyle = ink.background; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const seen = new Set<string>();
  for (let y = chunk.y0; y < chunk.y0 + chunk.h; y++) for (let x = chunk.x0; x < chunk.x0 + chunk.w; x++) {
    const terrain = types.get(cache.terrainKey(x, y) ?? ''); if (!terrain) continue;
    const era = eraAt(eraPointFor({ x, y }, layer), eras), fallback = era?.ground_key ? types.get(era.ground_key) : undefined;
    const ground = isObjectLayer(terrain) ? worldObjectGround(cache, types, x, y, fallback) : fallback;
    const px = (x - chunk.x0) * CHUNK_PX, py = (y - chunk.y0) * CHUNK_PX;
    if (terrain.key === 'building') {
      if (seen.has(`${x},${y}`)) continue;
      if (isBuilding(cache, x + 1, y) || isBuilding(cache, x - 1, y) || isBuilding(cache, x, y + 1) || isBuilding(cache, x, y - 1)) { drawBuildingGroup(ctx, cache, types, eras, ink, layer, chunk, x, y, seen); continue; }
    }
    drawTerrainBase(ctx, terrain, era, x, y, px, py, CHUNK_PX, ink, false, ground);
  }
  chunkArt.set(chunk, { canvas, sig });
  return canvas;
}
const isBuilding = (cache: WorldChunkCache, x: number, y: number) => cache.terrainKey(x, y) === 'building';
function drawBuildingGroup(ctx: CanvasRenderingContext2D, cache: WorldChunkCache, types: Map<string, Terrain>, eras: Era[], ink: WorldInk, layer: WorldLayer, chunk: WorldChunk, sx: number, sy: number, seen: Set<string>) {
  const cells: WorldPoint[] = [], stack = [{ x: sx, y: sy }], local = new Set<string>([`${sx},${sy}`]);
  while (stack.length && cells.length < 256) {
    const p = stack.pop()!; cells.push(p);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { x: p.x + dx, y: p.y + dy }, k = `${n.x},${n.y}`;
      if (!local.has(k) && isBuilding(cache, n.x, n.y)) { local.add(k); stack.push(n); }
    }
  }
  const xs = cells.map(c => c.x), ys = cells.map(c => c.y), bx = Math.min(...xs), by = Math.min(...ys);
  const cols = Math.max(...xs) - bx + 1, rows = Math.max(...ys) - by + 1;
  const block = buildingBlockCanvas(cols, rows);
  for (const c of cells) seen.add(`${c.x},${c.y}`);
  const inChunk = cells.filter(c => c.x >= chunk.x0 && c.x < chunk.x0 + chunk.w && c.y >= chunk.y0 && c.y < chunk.y0 + chunk.h);
  for (const c of inChunk) {
    const era = eraAt(eraPointFor(c, layer), eras), ground = era?.ground_key ? types.get(era.ground_key) : undefined, building = types.get('building')!;
    if (block) { if (ground) drawTerrainBase(ctx, ground, era, c.x, c.y, (c.x - chunk.x0) * CHUNK_PX, (c.y - chunk.y0) * CHUNK_PX, CHUNK_PX, ink); }
    else drawTerrainBase(ctx, building, era, c.x, c.y, (c.x - chunk.x0) * CHUNK_PX, (c.y - chunk.y0) * CHUNK_PX, CHUNK_PX, ink, false, ground);
  }
  if (block) {
    ctx.save(); ctx.beginPath();
    for (const c of inChunk) ctx.rect((c.x - chunk.x0) * CHUNK_PX, (c.y - chunk.y0) * CHUNK_PX, CHUNK_PX, CHUNK_PX);
    ctx.clip(); ctx.drawImage(block, (bx - chunk.x0) * CHUNK_PX, (by - chunk.y0) * CHUNK_PX); ctx.restore();
  }
  return true;
}
export function drawWorld(ctx: CanvasRenderingContext2D, cache: WorldChunkCache, types: Map<string, Terrain>, eras: Era[], places: Place[], camera: WorldPoint, width: number, height: number, time: number, ink: WorldInk, reduced: boolean, layer: WorldLayer = 0) {
  ctx.fillStyle = ink.background; ctx.fillRect(0, 0, width, height); ctx.imageSmoothingEnabled = false;
  const size = cache.size;
  const x0 = Math.max(0, Math.floor(camera.x / WORLD_TILE)), y0 = Math.max(0, Math.floor(camera.y / WORLD_TILE));
  const x1 = Math.min(size - 1, Math.ceil((camera.x + width) / WORLD_TILE)), y1 = Math.min(size - 1, Math.ceil((camera.y + height) / WORLD_TILE));
  for (let cy = chunkOrigin(y0); cy <= y1; cy += WORLD_CHUNK) for (let cx = chunkOrigin(x0); cx <= x1; cx += WORLD_CHUNK) {
    const chunk = cache.chunks.get(cache.key(cx, cy));
    if (!chunk) { void cache.load(cx, cy); continue; }
    ctx.drawImage(chunkCanvas(cache, chunk, types, eras, ink, layer), chunk.x0 * WORLD_TILE - camera.x, chunk.y0 * WORLD_TILE - camera.y, chunk.w * WORLD_TILE, chunk.h * WORLD_TILE);
  }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x * WORLD_TILE - camera.x, py = y * WORLD_TILE - camera.y;
    const key = cache.terrainKey(x, y), terrain = key ? types.get(key) : undefined;
    if (terrain) { if (terrain.moves) drawTerrainMotion(ctx, terrain, x, y, px, py, time, ink, reduced); }
    else { ctx.strokeStyle = ink.grid; ctx.globalAlpha = .2; ctx.strokeRect(px, py, WORLD_TILE, WORLD_TILE); ctx.globalAlpha = 1; }
  }
  if (layer === 1) { ctx.fillStyle = ink.shadow; ctx.globalAlpha = .4; ctx.fillRect(0, 0, width, height); ctx.globalAlpha = 1; }
  for (const place of places) if (place.x >= x0 && place.x <= x1 && place.y >= y0 && place.y <= y1) drawPlace(ctx, place, place.x * WORLD_TILE - camera.x, place.y * WORLD_TILE - camera.y, ink);
}
