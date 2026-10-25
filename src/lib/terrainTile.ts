import { WORLD_TILE, type Era, type Terrain } from './worldTest';
export type TerrainInk = { background: string; grid: string; text: string; muted: string; gold: string; cyan: string; shadow: string };
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
export function drawTerrain(ctx: CanvasRenderingContext2D, terrain: Terrain, era: Era | undefined, x: number, y: number, px: number, py: number, time: number, ink: TerrainInk, reduced: boolean, detail = false) {
  const size = WORLD_TILE, move = terrain.moves ?? '', frame = reduced ? 0 : Math.floor(time / 100);
  const animation = frame / 10 + (x * 7 + y * 3) % 13;
  const pulse = Math.sin(animation * 3);
  ctx.save(); ctx.translate(px, py);
  if (detail) { ctx.translate(size * .2, size * .2); ctx.scale(.6, .6); }
  if (!detail) {
  ctx.fillStyle = terrain.color ?? eraColor(era, ink.background); ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = ink.shadow; ctx.globalAlpha = terrain.color ? .25 : .5; ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = .3; ctx.strokeStyle = terrain.walkable ? ink.grid : ink.shadow; ctx.lineWidth = terrain.walkable ? .5 : 2; ctx.strokeRect(.5, .5, size - 1, size - 1);
  }
  ctx.strokeStyle = detail ? (terrain.color ?? ink.text) : ink.text; ctx.fillStyle = ctx.strokeStyle; ctx.globalAlpha = detail ? .8 : .24; ctx.lineWidth = 1;
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
