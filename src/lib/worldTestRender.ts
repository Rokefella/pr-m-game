import { eraAt, eraPointFor, WORLD_TILE, type WorldLayer, type Era, type Place, type Terrain, type WorldPoint, type WorldChunkCache } from './worldTest';
export type WorldInk = { background: string; grid: string; text: string; muted: string; gold: string; cyan: string; shadow: string; dusk: string; night: string; dawn: string };
export function eraColor(era: Era | undefined, fallback: string): string {
  const palette = era?.palette;
  if (typeof palette === 'string' && /^#[\da-f]{3,8}$/i.test(palette)) return palette;
  if (Array.isArray(palette)) return palette.find(c => typeof c === 'string' && /^#[\da-f]{3,8}$/i.test(c)) ?? fallback;
  if (palette && typeof palette === 'object') {
    const colors = palette as Record<string, unknown>;
    const candidate = colors.ground ?? colors.background ?? colors.base ?? Object.values(colors).find(c => typeof c === 'string' && /^#[\da-f]{3,8}$/i.test(c));
    if (typeof candidate === 'string') return candidate;
  }
  return fallback;
}
export function drawTerrain(ctx: CanvasRenderingContext2D, terrain: Terrain, era: Era | undefined, x: number, y: number, px: number, py: number, time: number, ink: WorldInk, reduced: boolean) {
  const size = WORLD_TILE, move = terrain.moves ?? '', frame = reduced ? 0 : Math.floor(time / 100);
  const animation = frame / 10 + (x * 7 + y * 3) % 13;
  const pulse = Math.sin(animation * 3);
  ctx.save(); ctx.translate(px, py);
  ctx.fillStyle = terrain.color ?? eraColor(era, ink.background); ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = ink.shadow; ctx.globalAlpha = terrain.color ? .25 : .5; ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = .3; ctx.strokeStyle = terrain.walkable ? ink.grid : ink.shadow; ctx.lineWidth = terrain.walkable ? .5 : 2; ctx.strokeRect(.5, .5, size - 1, size - 1);
  ctx.strokeStyle = ink.text; ctx.fillStyle = ink.text; ctx.globalAlpha = .24; ctx.lineWidth = 1;
  if (move === 'heat_shimmer') ctx.globalAlpha = .2 + pulse * .06;
  if (move === 'sway') ctx.translate(reduced ? 0 : Math.sin(animation) * 2, 0);
  if (move === 'glow' || move === 'flicker') { ctx.globalAlpha = .06 + (pulse + 1) * .04; ctx.fillStyle = terrain.color ?? ink.cyan; ctx.fillRect(0, 0, size, size); ctx.fillStyle = ink.text; ctx.globalAlpha = .25 + pulse * .08; }
  ctx.beginPath();
  switch (terrain.grp) {
    case 'water': for (const row of [12, 24]) { ctx.moveTo(7, row); ctx.lineTo(12, row - 2); ctx.lineTo(18, row + 2); ctx.lineTo(25, row - 2); ctx.lineTo(32, row); } break;
    case 'plant': if ((x + y) % 3) { ctx.moveTo(20, 11); ctx.lineTo(12, 25); ctx.lineTo(28, 25); ctx.closePath(); ctx.moveTo(20, 25); ctx.lineTo(20, 32); } else { ctx.fillRect(18, 18, 3, 3); } break;
    case 'rock': ctx.moveTo(13, 27); ctx.lineTo(20, 15); ctx.lineTo(28, 27); ctx.closePath(); break;
    case 'structure': ctx.rect(13, 13, 14, 14); break;
    case 'edge': for (let i = 7; i < 31; i += 7) { ctx.moveTo(i, 13); ctx.lineTo(i + 6, 25); } break;
    case 'hazard': ctx.moveTo(14, 14); ctx.lineTo(26, 26); ctx.moveTo(26, 14); ctx.lineTo(14, 26); break;
    case 'atmosphere': ctx.arc(20, 20, 8, 0, Math.PI * 2); break;
    default: ctx.fillRect(7 + ((x * 11 + y) % 24), 8 + ((y * 7 + x) % 22), 2, 1); break;
  }
  ctx.stroke();
  if (move.startsWith('flow')) {
    const speed = move === 'flow_fast' ? 10 : move === 'flow_slow' ? 2 : 5;
    const a = Math.atan2(y - 500, x - 500), offset = reduced ? 0 : animation * speed % 16;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, size, size); ctx.clip(); ctx.translate(20, 20); ctx.rotate(a);
    ctx.globalAlpha = move === 'flow_light' ? .12 : .25;
    for (let i = -40; i < 40; i += 16) { ctx.beginPath(); ctx.moveTo(i + offset, -30); ctx.lineTo(i + offset, 30); ctx.stroke(); } ctx.restore();
  }
  if (['shimmer', 'waves', 'foam'].includes(move)) { ctx.globalAlpha = .12 + (pulse + 1) * .12; ctx.fillRect(8 + x % 14, 6 + y % 16, 3, 1); ctx.fillRect(27, 28, 3, 1); }
  if (move === 'drift') { ctx.globalAlpha = .16; ctx.fillRect((x * 7 + frame * .3) % 36, (y * 11 + frame * .2) % 36, 2, 2); }
  if (move === 'pulse') { ctx.strokeStyle = ink.cyan; ctx.globalAlpha = .3; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(20, 20); ctx.lineTo(20, 40); ctx.stroke(); ctx.globalAlpha = .7; ctx.fillStyle = ink.cyan; ctx.fillRect(reduced ? 18 : frame * 2 % 38, 18, 3, 3); }
  ctx.restore();
}
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