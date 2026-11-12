import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bumpedFind, drawFindLight, drawFinds, findButton, findReceipt, type WorldFind } from './worldFinds';
import type { Terrain } from './worldTest';
import type { TerrainInk } from './terrainTile';

const art = vi.hoisted(() => ({ motion: vi.fn(), sprite: vi.fn(() => true), light: vi.fn(() => 'green') }));
vi.mock('./terrainTile', () => ({ drawTerrainMotion: art.motion, drawTerrainSprite: art.sprite, spriteLight: art.light }));
const debris: WorldFind = { id: 'debris', find_key: 'meteor', kind: 'debris', title: 'Debris', visibility: 'visible', sprite_key: 'debris_glowing', x: 10, y: 10, layer: 0 };
const ink = { gold: 'gold', text: 'light', muted: 'muted' } as TerrainInk;
const camera = { x: 400, y: 400 };
function context() {
  const alphas: number[] = [];
  const stops = vi.fn(), stack: number[] = [];
  const ctx = { globalAlpha: 1, fillStyle: '',
    save() { stack.push(this.globalAlpha); }, restore() { this.globalAlpha = stack.pop() ?? 1; },
    fillRect: vi.fn(), createRadialGradient: vi.fn(() => ({ addColorStop: stops })) };
  art.sprite.mockImplementation(() => { alphas.push(ctx.globalAlpha); return true; });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, alphas, stops };
}
beforeEach(() => { vi.clearAllMocks(); });
describe('meteor debris presentation', () => {
  it('animates the visible cold quest fire with shared smoke', () => {
    const { ctx } = context();
    const terrain = { key: 'campfire_cold', moves: 'smoke' } as Terrain;
    drawFinds(ctx, [{ ...debris, kind: 'quest_object', sprite_key: terrain.key }], new Set(), debris, new Map([[terrain.key, terrain]]), camera, 400, 400, 1000, ink, false);
    expect(art.motion).toHaveBeenCalledWith(ctx, terrain, 10, 10, 0, 0, 1000, ink, false, undefined, 1000, 40, false);
  });
  it.each(['glow', 'smoke', 'glint'])('animates visible %s debris with the shared drawer', moves => {
    const { ctx } = context();
    const terrain = { key: debris.sprite_key, moves } as Terrain;
    drawFinds(ctx, [debris], new Set(), { x: 14, y: 10 }, new Map([[terrain.key, terrain]]), camera, 400, 400, 1000, ink, false);
    expect(art.sprite).toHaveBeenCalledOnce();
    expect(art.motion).toHaveBeenCalledWith(ctx, terrain, 10, 10, 0, 0, 1000, ink, false, undefined, 1000, 40, false);
  });
  it('retains looted debris at 45% opacity without motion, sparkle or light', () => {
    const { ctx, alphas } = context();
    const terrain = { key: 'debris_glowing', moves: 'glow', light_radius: 4 } as Terrain;
    const types = new Map([[terrain.key, terrain]]), claimed = new Set(['debris']);
    drawFinds(ctx, [debris], claimed, debris, types, camera, 400, 400, 1000, ink, false);
    expect(alphas).toEqual([.45]); expect(ctx.globalAlpha).toBe(1);
    expect(art.motion).not.toHaveBeenCalled(); expect(ctx.fillRect).not.toHaveBeenCalled();
    drawFindLight(ctx, [debris], claimed, types, camera, ink, 'night');
    expect(ctx.createRadialGradient).not.toHaveBeenCalled();
  });
  it('sparkles only unclaimed debris within three cells, never visible decor', () => {
    const { ctx } = context();
    const types = new Map([['debris_glowing', { key: 'debris_glowing' } as Terrain]]);
    const draw = (find: WorldFind, distance: number) => drawFinds(ctx, [find], new Set(), { x: 10 + distance, y: 10 }, types, camera, 400, 400, 1000, ink, true);
    draw(debris, 3); expect(ctx.fillRect).toHaveBeenCalledTimes(3);
    vi.mocked(ctx.fillRect).mockClear(); draw(debris, 4); draw({ ...debris, kind: 'landmark' }, 0);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });
  it('blocked debris can be approached by bump without reopening looted husks', () => {
    expect(bumpedFind([debris], new Set(), debris)).toBe(debris);
    expect(bumpedFind([debris], new Set(['debris']), debris)).toBeNull();
  });
  it('uses the debris search action and server loot name including resource grants', () => {
    expect(findButton('debris')).toBe('Search it');
    expect(findReceipt({ granted: true, kind: 'debris', drop_name: '150 steps' })).toBe('Found: 150 steps');
  });
  it.each(['dusk', 'night'])('lights unclaimed visible glowing debris at %s using the bright pixel', phase => {
    const { ctx, stops } = context();
    const terrain = { key: 'debris_glowing', moves: 'glow', light_radius: 4 } as Terrain;
    drawFindLight(ctx, [debris], new Set(), new Map([[terrain.key, terrain]]), camera, ink, phase);
    expect(ctx.createRadialGradient).toHaveBeenCalledWith(20, 20, 0, 20, 20, 160);
    expect(art.light).toHaveBeenCalledWith(terrain, 10, 10, ink, false);
    expect(stops).toHaveBeenCalledWith(0, 'green');
  });
  it('does not light day, hidden finds or unauthored glow radii', () => {
    const { ctx } = context();
    const terrain = { key: 'debris_glowing', moves: 'glow', light_radius: 4 } as Terrain;
    drawFindLight(ctx, [debris], new Set(), new Map([[terrain.key, terrain]]), camera, ink, 'day');
    drawFindLight(ctx, [{ ...debris, visibility: 'hidden' }], new Set(), new Map([[terrain.key, terrain]]), camera, ink, 'night');
    drawFindLight(ctx, [debris], new Set(), new Map([[terrain.key, { ...terrain, light_radius: 0 }]]), camera, ink, 'night');
    expect(ctx.createRadialGradient).not.toHaveBeenCalled();
  });
});