import type { Era, Terrain } from './worldTest';
import { worldHash } from './worldHash';
export type TerrainInk = { background: string; grid: string; text: string; muted: string; gold: string; cyan: string; shadow: string };
const TILE = 40;
const NO_FLIP = new Set(['road', 'square', 'town_wall', 'bridge', 'cliff_edge', 'dune_crest', 'crater', 'building']);

/** Pre-rendered 16×16 sprites by terrain key; `spriteVersion` bumps whenever a new sprite becomes ready. */
const sprites = new Map<string, HTMLCanvasElement>();
const loading = new Map<string, Promise<void>>();
export let spriteVersion = 0;
export const terrainSprite = (key: string | undefined) => key ? sprites.get(key) : undefined;
export const isObjectLayer = (terrain: Terrain | undefined) => terrain?.render_layer === 'object';

export function loadSvgCanvas(svg: string, w: number, h: number): Promise<HTMLCanvasElement | null> {
  if (typeof Image === 'undefined' || typeof document === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    const img = new Image(), timer = setTimeout(() => resolve(null), 4000);
    img.onload = () => {
      clearTimeout(timer);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const cx = c.getContext('2d'); if (!cx) return resolve(null);
      cx.imageSmoothingEnabled = false; cx.drawImage(img, 0, 0, w, h); resolve(c);
    };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

/** Fetch-once sprite cache; types without icon_svg keep the colour-fill art. */
export function loadTerrainSprites(types: Iterable<Terrain>): Promise<void> {
  const jobs: Promise<void>[] = [];
  for (const t of types) {
    if (typeof t.icon_svg !== 'string' || !t.icon_svg.trim() || sprites.has(t.key)) continue;
    let job = loading.get(t.key);
    if (!job) {
      job = loadSvgCanvas(t.icon_svg, 16, 16).then(c => { if (c) { sprites.set(t.key, c); spriteVersion++; } });
      loading.set(t.key, job);
    }
    jobs.push(job);
  }
  return Promise.all(jobs).then(() => undefined);
}

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

function blit(ctx: CanvasRenderingContext2D, sprite: HTMLCanvasElement, key: string, x: number, y: number, size: number, objectLayer: boolean) {
  const h = NO_FLIP.has(key) ? 0 : worldHash(x, y, 7);
  const fx = (h >= .25 && h < .5) || h >= .75, fy = !objectLayer && h >= .5;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.translate(fx ? size : 0, fy ? size : 0); ctx.scale(fx ? -1 : 1, fy ? -1 : 1);
  ctx.drawImage(sprite, 0, 0, size, size); ctx.restore();
}

/** Static colour-fill + group mark for types without a sprite (drawn in 40-unit space). */
function drawFallback(ctx: CanvasRenderingContext2D, terrain: Terrain, era: Era | undefined, x: number, y: number, ink: TerrainInk, detail: boolean) {
  if (!detail) {
    ctx.fillStyle = terrain.color ?? eraColor(era, ink.background); ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = ink.shadow; ctx.globalAlpha = terrain.color ? .25 : .5; ctx.fillRect(0, 0, TILE, TILE);
    ctx.globalAlpha = .3; ctx.strokeStyle = terrain.walkable ? ink.grid : ink.shadow; ctx.lineWidth = terrain.walkable ? .5 : 2; ctx.strokeRect(.5, .5, TILE - 1, TILE - 1);
  }
  ctx.strokeStyle = detail ? (terrain.color ?? ink.text) : ink.text; ctx.fillStyle = ctx.strokeStyle; ctx.globalAlpha = detail ? .8 : .24; ctx.lineWidth = 1;
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
  ctx.stroke(); ctx.globalAlpha = 1;
}

/**
 * Static part of a cell at `size` px: sprite (object sprites over `ground`) or the legacy colour fill.
 * `detail` draws a small overlay (maze edge/junction details) without a ground fill.
 */
export function drawTerrainBase(ctx: CanvasRenderingContext2D, terrain: Terrain, era: Era | undefined, x: number, y: number, px: number, py: number, size: number, ink: TerrainInk, detail = false, ground?: Terrain) {
  ctx.save(); ctx.translate(px, py);
  if (detail) { ctx.translate(size * .2, size * .2); ctx.scale(.6, .6); }
  const sprite = terrainSprite(terrain.key), object = isObjectLayer(terrain);
  if (!detail && object && ground && ground.key !== terrain.key) {
    const gs = terrainSprite(ground.key);
    if (gs) blit(ctx, gs, ground.key, x, y, size, false);
    else { ctx.save(); ctx.scale(size / TILE, size / TILE); drawFallback(ctx, ground, era, x, y, ink, false); ctx.restore(); }
  }
  if (sprite) blit(ctx, sprite, terrain.key, x, y, size, object || detail);
  else { ctx.scale(size / TILE, size / TILE); drawFallback(ctx, terrain, era, x, y, ink, detail || (object && Boolean(ground))); }
  ctx.restore();
}

/** Per-frame `moves` animation (~10 fps), drawn as a light overlay on top of the static cell. */
export function drawTerrainMotion(ctx: CanvasRenderingContext2D, terrain: Terrain, x: number, y: number, px: number, py: number, time: number, ink: TerrainInk, reduced: boolean) {
  const move = terrain.moves ?? ''; if (!move || move === 'none') return;
  const size = TILE, frame = reduced ? 0 : Math.floor(time / 100), light = terrainSprite(terrain.key) ? .6 : 1;
  const animation = frame / 10 + (x * 7 + y * 3) % 13, pulse = Math.sin(animation * 3);
  ctx.save(); ctx.translate(px, py); ctx.strokeStyle = ink.text; ctx.fillStyle = ink.text; ctx.lineWidth = 1;
  if (move === 'heat_shimmer') { ctx.globalAlpha = (.04 + (pulse + 1) * .02) * light; ctx.fillRect(0, (frame * 2 + y * 5) % size, size, 2); }
  if (move === 'glow' || move === 'flicker') { ctx.globalAlpha = (.06 + (pulse + 1) * .04) * light; ctx.fillStyle = terrain.color ?? ink.cyan; ctx.fillRect(0, 0, size, size); ctx.fillStyle = ink.text; }
  if (move.startsWith('flow')) {
    const speed = move === 'flow_fast' ? 10 : move === 'flow_slow' ? 2 : 5;
    const a = Math.atan2(y - 500, x - 500), offset = reduced ? 0 : animation * speed % 16;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, size, size); ctx.clip(); ctx.translate(20, 20); ctx.rotate(a);
    ctx.globalAlpha = (move === 'flow_light' ? .12 : .25) * light;
    for (let i = -40; i < 40; i += 16) { ctx.beginPath(); ctx.moveTo(i + offset, -30); ctx.lineTo(i + offset, 30); ctx.stroke(); } ctx.restore();
  }
  if (['shimmer', 'waves', 'foam'].includes(move)) { ctx.globalAlpha = (.12 + (pulse + 1) * .12) * light; ctx.fillRect(8 + x % 14, 6 + y % 16, 3, 1); ctx.fillRect(27, 28, 3, 1); }
  if (move === 'drift') { ctx.globalAlpha = .16 * light; ctx.fillRect((x * 7 + frame * .3) % 36, (y * 11 + frame * .2) % 36, 2, 2); }
  if (move === 'pulse') { ctx.strokeStyle = ink.cyan; ctx.globalAlpha = .3 * light; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(20, 20); ctx.lineTo(20, 40); ctx.stroke(); ctx.globalAlpha = .7 * light; ctx.fillStyle = ink.cyan; ctx.fillRect(reduced ? 18 : frame * 2 % 38, 18, 3, 3); }
  ctx.restore();
}

/** Full 40px cell (static + motion) — used directly by the maze skins. */
export function drawTerrain(ctx: CanvasRenderingContext2D, terrain: Terrain, era: Era | undefined, x: number, y: number, px: number, py: number, time: number, ink: TerrainInk, reduced: boolean, detail = false, ground?: Terrain) {
  drawTerrainBase(ctx, terrain, era, x, y, px, py, TILE, ink, detail, ground);
  if (!detail) drawTerrainMotion(ctx, terrain, x, y, px, py, time, ink, reduced);
}
