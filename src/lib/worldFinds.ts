import { supabase } from '@/lib/supabase';
import { drawTerrainMotion, drawTerrainSprite, spriteLight, type TerrainInk } from './terrainTile';
import { WORLD_TILE, type Terrain, type WorldPoint } from './worldTest';

export type FindKind = 'cache_steps' | 'cache_credits' | 'thing' | 'tool' | 'words' | 'quest_object' | 'landmark' | 'sigil';
export type WorldFind = {
  id: string; find_key: string; x: number; y: number; layer: number; kind: FindKind | string;
  drop_key?: string | null; amount?: number | null; title: string; text?: string | null;
  visibility: 'glint' | 'hidden' | 'visible' | string; glint_radius?: number | null; sprite_key?: string | null;
};
export type ClaimResult = { granted: boolean; reason?: string; needs?: string; kind?: string; title?: string; text?: string; drop_name?: string; amount?: number };

export const chebyshev = (a: WorldPoint, b: WorldPoint) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
/** Distance within which an unclaimed find shows; visible finds always show, claimed glint/hidden never. */
export const findRadius = (f: WorldFind) => f.visibility === 'hidden' ? 1 : Math.max(0, Number(f.glint_radius ?? 2));
export const findShows = (f: WorldFind, player: WorldPoint, claimed: boolean) => {
  if (f.visibility === 'visible') return true;
  if (claimed) return false;
  return chebyshev(f, player) <= findRadius(f);
};
/** Sprite to draw for a visible find; a claimed cold quest fire is lit (personal). */
export const findSprite = (f: WorldFind, claimed: boolean) => f.kind === 'quest_object' && claimed && f.sprite_key === 'campfire_cold' ? 'campfire' : f.sprite_key ?? null;
export const findButton = (kind: string) => kind === 'landmark' ? 'Look closer' : kind === 'quest_object' ? 'Light it' : kind === 'words' ? 'Read it' : 'Take it';
export const findReceipt = (r: ClaimResult) => r.kind === 'cache_steps' ? `+${r.amount ?? 0} steps` : r.kind === 'cache_credits' ? `+${r.amount ?? 0} credits` : (r.kind === 'thing' || r.kind === 'tool' || r.kind === 'words') ? r.drop_name ?? '' : '';
/** Unclaimed glint/hidden finds carry a floating marker at any distance. */
export const findMarked = (f: WorldFind, claimed: boolean) => !claimed && (f.visibility === 'glint' || f.visibility === 'hidden');
/** The unclaimed glint/hidden find in a bumped (blocked) cell, if any. */
export const bumpedFind = (finds: WorldFind[], claimed: Set<string>, cell: WorldPoint) => finds.find(f => f.x === cell.x && f.y === cell.y && findMarked(f, claimed.has(f.id))) ?? null;
/** Walk-up rule: only finds on walkable cells open when the player comes within 1. */
export const approachedFind = (finds: WorldFind[], claimed: Set<string>, skip: Set<string>, at: WorldPoint, walkable: (p: WorldPoint) => boolean) =>
  finds.find(f => !claimed.has(f.id) && !skip.has(f.id) && chebyshev(f, at) <= 1 && findShows(f, at, false) && walkable(f)) ?? null;
/** 8-bit gold diamond floating above a cell; two-frame bob, static with reduced motion. */
export function drawMarker(ctx: CanvasRenderingContext2D, px: number, py: number, time: number, ink: TerrainInk, reduced: boolean) {
  const bob = reduced ? 0 : Math.floor(time / 400) % 2 ? -2 : 0, s = 2, cx = Math.round(px + WORLD_TILE / 2), top = Math.round(py - 12 + bob);
  ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const rows = [1, 3, 5, 3, 1];
  ctx.fillStyle = ink.shadow ?? ink.muted; rows.forEach((w, i) => ctx.fillRect(cx - ((w + 2) * s) / 2, top + (i - 1) * s, (w + 2) * s, s * 3));
  ctx.fillStyle = ink.gold; rows.forEach((w, i) => ctx.fillRect(cx - (w * s) / 2, top + i * s, w * s, s));
  ctx.restore();
}
export const findsOn = (finds: WorldFind[], layer: number) => finds.filter(f => (Number(f.layer) || 0) === layer);

const db = supabase as unknown as { from: (t: string) => any; rpc: (f: string, a: object) => any };
export async function loadFinds(userId: string) {
  const [finds, claims] = await Promise.all([db.from('world_finds').select('*'), db.from('world_find_claims').select('find_id').eq('user_id', userId)]);
  return { finds: (finds.data ?? []) as WorldFind[], claimed: new Set<string>(((claims.data ?? []) as { find_id: string }[]).map(c => c.find_id)) };
}
export async function claimFind(id: string, at: WorldPoint): Promise<ClaimResult> {
  const { data, error } = await db.rpc('claim_find', { p_find: id, p_x: at.x, p_y: at.y });
  if (error) return { granted: false, reason: 'error' };
  return (data ?? { granted: false }) as ClaimResult;
}

/** Draws showing finds over the world (sparkles for glint/hidden, sprites for visible). */
export function drawFinds(ctx: CanvasRenderingContext2D, finds: WorldFind[], claimed: Set<string>, player: WorldPoint, types: Map<string, Terrain>, camera: WorldPoint, width: number, height: number, time: number, ink: TerrainInk, reduced: boolean) {
  for (const f of finds) {
    const px = f.x * WORLD_TILE - camera.x, py = f.y * WORLD_TILE - camera.y;
    if (px < -WORLD_TILE || py < -WORLD_TILE || px > width || py > height) continue;
    const isClaimed = claimed.has(f.id);
    if (f.visibility === 'visible') {
      const key = findSprite(f, isClaimed), terrain = key ? types.get(key) : undefined;
      if (terrain?.moves === 'flicker') drawTerrainMotion(ctx, terrain, f.x, f.y, px, py, time, ink, reduced, undefined, time, WORLD_TILE);
      else if (!terrain || !drawTerrainSprite(ctx, terrain, f.x, f.y, px, py, WORLD_TILE)) { ctx.fillStyle = ink.muted; ctx.fillRect(px + WORLD_TILE / 2 - 3, py + WORLD_TILE / 2 - 3, 6, 6); }
      continue;
    }
    if (!findMarked(f, isClaimed)) continue;
    if (chebyshev(f, player) <= 2) {
      const frame = reduced ? 1 : Math.floor(time / 220 + f.x + f.y) % 3, s = 2, cx = px + WORLD_TILE / 2, cy = py + WORLD_TILE / 2, arm = [1, 2, 3][frame];
      ctx.save(); ctx.fillStyle = ink.gold; ctx.globalAlpha = frame === 0 ? .55 : .95;
      ctx.fillRect(cx - s / 2, cy - s / 2 - arm * s, s, arm * s * 2 + s); ctx.fillRect(cx - s / 2 - arm * s, cy - s / 2, arm * s * 2 + s, s);
      ctx.fillStyle = ink.text; ctx.fillRect(cx - s / 2, cy - s / 2, s, s); ctx.restore();
    }
  }
}
/** Markers drawn after the night tint so they stay readable. */
export function drawFindMarkers(ctx: CanvasRenderingContext2D, finds: WorldFind[], claimed: Set<string>, camera: WorldPoint, width: number, height: number, time: number, ink: TerrainInk, reduced: boolean) {
  for (const f of finds) {
    const px = f.x * WORLD_TILE - camera.x, py = f.y * WORLD_TILE - camera.y;
    if (px < -WORLD_TILE || py < -WORLD_TILE || px > width || py > height + WORLD_TILE) continue;
    if (findMarked(f, claimed.has(f.id))) drawMarker(ctx, px, py, time, ink, reduced);
  }
}
/** Night light for personally lit quest fires, matching campfire light. */
export function drawFindLight(ctx: CanvasRenderingContext2D, finds: WorldFind[], claimed: Set<string>, types: Map<string, Terrain>, camera: WorldPoint, ink: TerrainInk, phase: string) {
  if (phase !== 'night' && phase !== 'dusk') return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .35;
  for (const f of finds) {
    const terrain = types.get(findSprite(f, claimed.has(f.id)) ?? ''); if (f.visibility !== 'visible' || terrain?.moves !== 'flicker') continue;
    const radius = (terrain.light_radius && terrain.light_radius > 0 ? terrain.light_radius : 3) * WORLD_TILE;
    const px = (f.x + .5) * WORLD_TILE - camera.x, py = (f.y + .5) * WORLD_TILE - camera.y;
    const glow = ctx.createRadialGradient(px, py, 0, px, py, radius);
    glow.addColorStop(0, spriteLight(terrain, f.x, f.y, ink, true)); glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow; ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
  }
  ctx.restore();
}
