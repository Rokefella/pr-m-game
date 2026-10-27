import { HIDDEN_LABEL_RADIUS, isHiddenPlace } from './worldSam';
import { isGroundSway, WAVE_BAND_CELL_LIMIT } from './terrainMotion';
import { chunkOrigin, eraAt, eraPointFor, WORLD_CHUNK, WORLD_TILE, type WorldLayer, type Era, type Place, type Terrain, type WorldChunk, type WorldPoint, type WorldChunkCache } from './worldTest';
import { drawTerrainBase, drawTerrainMotion, drawTerrainSprite, hasMovingSprite, isObjectLayer, spriteLight, spriteVersion, type TerrainInk } from './terrainTile';
import { buildingBlockCanvas, buildingVersion } from './theme/buildingCanvas';
export { drawTerrain, eraColor } from './terrainTile';
export type WorldInk = TerrainInk & { dusk: string; night: string; dawn: string };
export function drawPlace(ctx: CanvasRenderingContext2D, place: Place, px: number, py: number, ink: WorldInk, showLabel = true) {
  if (place.kind === 'start') return;
  ctx.save(); ctx.translate(px + 20, py + 20); ctx.strokeStyle = place.kind === 'maze_entrance' ? ink.gold : ink.text; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 2;
  ctx.beginPath();
  const action = place.action ?? '';
  if (action.startsWith('door_')) { ctx.rect(-7, -11, 14, 21); ctx.moveTo(3, 0); ctx.lineTo(4, 0); }
  else if (action === 'ascend') { ctx.moveTo(0, 10); ctx.lineTo(0, -10); ctx.moveTo(-7, -3); ctx.lineTo(0, -10); ctx.lineTo(7, -3); }
  else if (action === 'shadow') { ctx.strokeStyle = ink.shadow; ctx.lineWidth = 3; for (let a = 0; a < Math.PI * 5; a += .3) { const r = 1 + a * .8; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke(); ctx.strokeStyle = ink.muted; ctx.lineWidth = 1; }
  else if (action === 'descend') { ctx.strokeStyle = ink.muted; ctx.lineWidth = 4; ctx.arc(0, 0, 9, 0, Math.PI * 2); }
  else switch (place.kind) {
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
  if (place.kind !== 'start' && showLabel) { ctx.font = '11px "IM Fell English", serif'; ctx.strokeStyle = ink.shadow; ctx.lineWidth = 3; ctx.strokeText(place.name, 0, -20); ctx.fillStyle = ink.text; ctx.fillText(place.name, 0, -20); }
  ctx.restore();
}
const CHUNK_PX = 16;
type ChunkArt = { canvas: HTMLCanvasElement; sig: string };
const chunkArt = new WeakMap<WorldChunk, ChunkArt>();
const neighbourSig = (cache: WorldChunkCache, c: WorldChunk) => [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => cache.chunks.has(cache.key(c.x0 + dx * WORLD_CHUNK, c.y0 + dy * WORLD_CHUNK)) ? 1 : 0).join('');
/** Objects borrow authored ground, with deterministic left/up/right/down precedence. */
export function worldObjectGround(cache: WorldChunkCache, types: Map<string, Terrain>, x: number, y: number, fallback?: Terrain): Terrain | undefined {
  const objectKey = cache.terrainKey(x, y);
  if (objectKey === 'rowboat' || objectKey === 'water_lantern') {
    for (const [dx, dy] of [[-1, 0], [0, -1], [1, 0], [0, 1]]) {
      const neighbour = types.get(cache.terrainKey(x + dx, y + dy) ?? '');
      if (neighbour?.grp === 'water') return neighbour;
    }
    return types.get('lotus_water') ?? types.get('water') ?? fallback;
  }
  for (const [dx, dy] of [[-1, 0], [0, -1], [1, 0], [0, 1]]) {
    const neighbour = types.get(cache.terrainKey(x + dx, y + dy) ?? '');
    if (neighbour && (neighbour.render_layer === 'ground' || (!neighbour.icon_svg?.trim() && !isObjectLayer(neighbour)))) return neighbour;
  }
  return fallback;
}
/** Height belongs to ground only; unloaded neighbours match this cell until the chunk arrives. */
export function drawWorldHeight(ctx: CanvasRenderingContext2D, cache: WorldChunkCache, terrain: Terrain, x: number, y: number, px: number, py: number, ink: WorldInk, layer: WorldLayer) {
  if (layer === 1 || terrain.grp === 'water') return;
  const h = cache.heightAt(x, y) ?? 0;
  const north = cache.heightAt(x, y - 1) ?? h, south = cache.heightAt(x, y + 1) ?? h;
  const east = cache.heightAt(x + 1, y) ?? h, west = cache.heightAt(x - 1, y) ?? h;
  ctx.save(); ctx.translate(px, py);
  const band = (color: string, alpha: number, bx: number, by: number, w: number, height: number) => {
    ctx.fillStyle = color; ctx.globalAlpha = alpha; ctx.fillRect(bx, by, w, height);
  };
  if (h > 0) band(ink.gold, .05 * h, 0, 0, CHUNK_PX, CHUNK_PX);
  if (south < h) band(ink.shadow, .45, 0, CHUNK_PX * .75, CHUNK_PX, CHUNK_PX / 4);
  if (north < h) band(ink.text, .35, 0, 0, CHUNK_PX, 2);
  if (east < h) band(ink.shadow, .3, CHUNK_PX - 3, 0, 3, CHUNK_PX);
  if (west < h) band(ink.text, .25, 0, 0, 2, CHUNK_PX);
  if (north > h) {
    const shadow = ctx.createLinearGradient(0, 0, 0, CHUNK_PX / 3);
    shadow.addColorStop(0, ink.shadow); shadow.addColorStop(1, 'transparent');
    ctx.fillStyle = shadow; ctx.globalAlpha = .25; ctx.fillRect(0, 0, CHUNK_PX, CHUNK_PX / 3);
  }
  ctx.restore();
}
/** Complete large sprites use an even top-left anchor; overwritten blocks keep single boulders. */
export function worldFootprintAnchor(cache: WorldChunkCache, terrain: Terrain, x: number, y: number): WorldPoint | undefined {
  if (terrain.footprint !== 2) return undefined;
  const ax = Math.floor(x / 2) * 2, ay = Math.floor(y / 2) * 2;
  return [[0, 0], [1, 0], [0, 1], [1, 1]].every(([dx, dy]) => cache.terrainKey(ax + dx, ay + dy) === terrain.key) ? { x: ax, y: ay } : undefined;
}
/** Static chunk art: all ground, then height, then objects so grouped sprites stay above slopes. */
export function chunkCanvas(cache: WorldChunkCache, chunk: WorldChunk, types: Map<string, Terrain>, eras: Era[], ink: WorldInk, layer: WorldLayer) {
  const sig = `${spriteVersion}:${buildingVersion}:${neighbourSig(cache, chunk)}`;
  const hit = chunkArt.get(chunk);
  if (hit && hit.sig === sig) return hit.canvas;
  const canvas = hit?.canvas ?? document.createElement('canvas');
  canvas.width = chunk.w * CHUNK_PX; canvas.height = chunk.h * CHUNK_PX;
  const ctx = canvas.getContext('2d'); if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false; ctx.fillStyle = ink.background; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cells: { x: number; y: number; px: number; py: number; terrain: Terrain; era?: Era; ground?: Terrain; object: boolean }[] = [];
  for (let y = chunk.y0; y < chunk.y0 + chunk.h; y++) for (let x = chunk.x0; x < chunk.x0 + chunk.w; x++) {
    const terrain = types.get(cache.terrainKey(x, y) ?? ''); if (!terrain) continue;
    const era = eraAt(eraPointFor({ x, y }, layer), eras), fallback = era?.ground_key ? types.get(era.ground_key) : undefined;
    const object = isObjectLayer(terrain) || terrain.footprint === 2 || terrain.key === 'building' || terrain.key.startsWith('house_') || terrain.key.startsWith('bld_');
    const ground = object ? worldObjectGround(cache, types, x, y, fallback) : fallback;
    const px = (x - chunk.x0) * CHUNK_PX, py = (y - chunk.y0) * CHUNK_PX;
    cells.push({ x, y, px, py, terrain, era, ground, object });
    if (object && ground) drawTerrainBase(ctx, ground, era, x, y, px, py, CHUNK_PX, ink);
    else if (!object) drawTerrainBase(ctx, terrain, era, x, y, px, py, CHUNK_PX, ink);
  }
  for (const c of cells) drawWorldHeight(ctx, cache, c.object ? c.ground ?? c.terrain : c.terrain, c.x, c.y, c.px, c.py, ink, layer);
  const seen = new Set<string>(), largeSeen = new Set<string>();
  for (const { x, y, px, py, terrain, era, ground, object } of cells) {
    if (!object || hasMovingSprite(terrain) || terrain.key.startsWith('bld_')) continue;
    if (terrain.footprint === 2) {
      const anchor = worldFootprintAnchor(cache, terrain, x, y);
      if (anchor) {
        const id = `${anchor.x},${anchor.y}`;
        if (largeSeen.has(id)) continue;
        largeSeen.add(id);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, canvas.width, canvas.height); ctx.clip();
        const drawn = drawTerrainSprite(ctx, terrain, anchor.x, anchor.y, (anchor.x - chunk.x0) * CHUNK_PX, (anchor.y - chunk.y0) * CHUNK_PX, CHUNK_PX * 2);
        ctx.restore();
        if (drawn) continue;
        largeSeen.delete(id); // Missing large art must not hide any remaining cell.
      }
      const boulder = types.get('boulder') ?? terrain;
      drawTerrainBase(ctx, boulder, era, x, y, px, py, CHUNK_PX, ink, false, ground, true);
      continue;
    }
    if (terrain.key === 'building') {
      if (seen.has(`${x},${y}`)) continue;
      if (isBuilding(cache, x + 1, y) || isBuilding(cache, x - 1, y) || isBuilding(cache, x, y + 1) || isBuilding(cache, x, y - 1)) { drawBuildingGroup(ctx, cache, types, eras, ink, layer, chunk, x, y, seen); continue; }
    }
    drawTerrainBase(ctx, terrain, era, x, y, px, py, CHUNK_PX, ink, false, ground, true);
  }
  chunkArt.set(chunk, { canvas, sig });
  return canvas;
}
const isBuilding = (cache: WorldChunkCache, x: number, y: number) => cache.terrainKey(x, y) === 'building';
function drawBuildingGroup(ctx: CanvasRenderingContext2D, cache: WorldChunkCache, types: Map<string, Terrain>, eras: Era[], ink: WorldInk, layer: WorldLayer, chunk: WorldChunk, sx: number, sy: number, seen: Set<string>) {
  const cells: WorldPoint[] = [], stack = [{ x: sx, y: sy }], local = new Set<string>([`${sx},${sy}`]);
  while (stack.length && cells.length < 256) {
    const p = stack.pop(); if (!p) break; cells.push(p);
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
    const era = eraAt(eraPointFor(c, layer), eras), fallback = era?.ground_key ? types.get(era.ground_key) : undefined;
    const ground = worldObjectGround(cache, types, c.x, c.y, fallback), building = types.get('building');
    if (!block && building) drawTerrainBase(ctx, building, era, c.x, c.y, (c.x - chunk.x0) * CHUNK_PX, (c.y - chunk.y0) * CHUNK_PX, CHUNK_PX, ink, false, ground, true);
  }
  if (block) {
    ctx.save(); ctx.beginPath();
    for (const c of inChunk) ctx.rect((c.x - chunk.x0) * CHUNK_PX, (c.y - chunk.y0) * CHUNK_PX, CHUNK_PX, CHUNK_PX);
    ctx.clip(); ctx.drawImage(block, (bx - chunk.x0) * CHUNK_PX, (by - chunk.y0) * CHUNK_PX); ctx.restore();
  }
  return true;
}
export function drawWorld(ctx: CanvasRenderingContext2D, cache: WorldChunkCache, types: Map<string, Terrain>, eras: Era[], places: Place[], camera: WorldPoint, width: number, height: number, time: number, ink: WorldInk, reduced: boolean, layer: WorldLayer = 0, clock = time, skinnedNpcs?: Set<string>, player?: WorldPoint) {
  ctx.fillStyle = ink.background; ctx.fillRect(0, 0, width, height); ctx.imageSmoothingEnabled = false;
  const size = cache.size;
  const x0 = Math.max(0, Math.floor(camera.x / WORLD_TILE)), y0 = Math.max(0, Math.floor(camera.y / WORLD_TILE));
  const x1 = Math.min(size - 1, Math.ceil((camera.x + width) / WORLD_TILE)), y1 = Math.min(size - 1, Math.ceil((camera.y + height) / WORLD_TILE));
  for (let cy = chunkOrigin(y0); cy <= y1; cy += WORLD_CHUNK) for (let cx = chunkOrigin(x0); cx <= x1; cx += WORLD_CHUNK) {
    const chunk = cache.chunks.get(cache.key(cx, cy));
    if (!chunk) { void cache.load(cx, cy); continue; }
    ctx.drawImage(chunkCanvas(cache, chunk, types, eras, ink, layer), chunk.x0 * WORLD_TILE - camera.x, chunk.y0 * WORLD_TILE - camera.y, chunk.w * WORLD_TILE, chunk.h * WORLD_TILE);
  }
  let fieldCells = 0;
  for (let y = y0; y <= y1 && fieldCells <= WAVE_BAND_CELL_LIMIT; y++) for (let x = x0; x <= x1; x++) { const t = types.get(cache.terrainKey(x, y) ?? ''); if (t && isGroundSway(t)) fieldCells++; }
  const band = fieldCells <= WAVE_BAND_CELL_LIMIT;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x * WORLD_TILE - camera.x, py = y * WORLD_TILE - camera.y;
    const key = cache.terrainKey(x, y), terrain = key ? types.get(key) : undefined;
    if (terrain) { if (terrain.moves) drawTerrainMotion(ctx, terrain, x, y, px, py, time, ink, reduced, (nx, ny) => types.get(cache.terrainKey(nx, ny) ?? ''), clock, WORLD_TILE, true, band); }
    else { ctx.strokeStyle = ink.grid; ctx.globalAlpha = .2; ctx.strokeRect(px, py, WORLD_TILE, WORLD_TILE); ctx.globalAlpha = 1; }
  }
  if (layer === 1) { ctx.fillStyle = ink.shadow; ctx.globalAlpha = .4; ctx.fillRect(0, 0, width, height); ctx.globalAlpha = 1; }
  for (const place of places) if (place.action !== 'signpost' && !(place.npc_key && skinnedNpcs?.has(place.npc_key)) && place.x >= x0 && place.x <= x1 && place.y >= y0 && place.y <= y1) drawPlace(ctx, place, place.x * WORLD_TILE - camera.x, place.y * WORLD_TILE - camera.y, ink, !isHiddenPlace(place) || (!!player && Math.max(Math.abs(player.x - place.x), Math.abs(player.y - place.y)) <= HIDDEN_LABEL_RADIUS));
}

/** Decorative fire light is applied after the world's tint, never to gameplay vision. */
export function drawWorldFireLight(ctx: CanvasRenderingContext2D, cache: WorldChunkCache, types: Map<string, Terrain>, camera: WorldPoint, width: number, height: number, ink: WorldInk, phase: string) {
  if (phase !== 'night' && phase !== 'dusk') return;
  const x0 = Math.max(0, Math.floor(camera.x / WORLD_TILE)), y0 = Math.max(0, Math.floor(camera.y / WORLD_TILE));
  const x1 = Math.min(cache.size - 1, Math.ceil((camera.x + width) / WORLD_TILE)), y1 = Math.min(cache.size - 1, Math.ceil((camera.y + height) / WORLD_TILE));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .35;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const terrain = types.get(cache.terrainKey(x, y) ?? ''); if (terrain?.moves !== 'flicker') continue;
    const radius = (terrain.light_radius && terrain.light_radius > 0 ? terrain.light_radius : 3) * WORLD_TILE;
    const px = (x + .5) * WORLD_TILE - camera.x, py = (y + .5) * WORLD_TILE - camera.y;
    const glow = ctx.createRadialGradient(px, py, 0, px, py, radius);
    glow.addColorStop(0, spriteLight(terrain, x, y, ink, true)); glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow; ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
  }
  ctx.restore();
}
