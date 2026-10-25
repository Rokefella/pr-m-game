import { describe, expect, it, vi } from 'vitest';
import { chunkCanvas, drawWorldHeight, worldFootprintAnchor, type WorldInk } from './worldTestRender';
import { WorldChunkCache, type Terrain, type WorldChunk } from './worldTest';
const art = vi.hoisted(() => ({ base: vi.fn(), large: vi.fn(() => true) }));
vi.mock('./terrainTile', () => ({ drawTerrainBase: art.base, drawTerrainSprite: art.large, drawTerrainMotion: vi.fn(), isObjectLayer: (t?: Terrain) => t?.render_layer === 'object', spriteVersion: 0 }));
const ink = { gold: 'warm', text: 'light', shadow: 'dark', background: 'background' } as WorldInk;
const terrain = (key: string, extra = {}) => ({ key, grp: 'rock', ...extra } as Terrain);
function context() {
  const rects: unknown[][] = [];
  const ctx = { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), fillStyle: '', globalAlpha: 1,
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fillRect: vi.fn(function(this: { fillStyle: string; globalAlpha: number }, ...args: number[]) { rects.push([this.fillStyle, this.globalAlpha, ...args]); }) };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, rects };
}
describe('world visual terrain layers', () => {
  it('only groups complete even-anchored same-key 2×2 blocks', () => {
    const cache = new WorldChunkCache(async () => { throw Error(); });
    const keys = new Map(['2,4', '3,4', '2,5', '3,5'].map(k => [k, 'boulder_large']));
    vi.spyOn(cache, 'terrainKey').mockImplementation((x, y) => keys.get(`${x},${y}`));
    const large = terrain('boulder_large', { footprint: 2 });
    expect(worldFootprintAnchor(cache, large, 3, 5)).toEqual({ x: 2, y: 4 });
    keys.set('3,5', 'grass');
    expect(worldFootprintAnchor(cache, large, 2, 4)).toBeUndefined();
    expect(worldFootprintAnchor(cache, terrain('boulder'), 2, 4)).toBeUndefined();
  });
  it('uses exact slope bands and ignores water/underground', () => {
    const cache = new WorldChunkCache(async () => { throw Error(); });
    vi.spyOn(cache, 'heightAt').mockImplementation((x, y) => x === 1 && y === 1 ? 3 : 0);
    const { ctx, rects } = context();
    drawWorldHeight(ctx, cache, terrain('grass'), 1, 1, 0, 0, ink, 0);
    expect(rects).toEqual([['warm', .05 * 3, 0, 0, 16, 16], ['dark', .45, 0, 12, 16, 4], ['light', .35, 0, 0, 16, 2], ['dark', .3, 13, 0, 3, 16], ['light', .25, 0, 0, 2, 16]]);
    rects.length = 0;
    drawWorldHeight(ctx, cache, terrain('water', { grp: 'water' }), 1, 1, 0, 0, ink, 0);
    drawWorldHeight(ctx, cache, terrain('grass'), 1, 1, 0, 0, ink, 1);
    expect(rects).toEqual([]);
  });
  it('missing height neighbours match this cell; higher north casts a top-third shadow', () => {
    const cache = new WorldChunkCache(async () => { throw Error(); });
    const height = vi.spyOn(cache, 'heightAt').mockImplementation((x, y) => x === 1 && y === 1 ? 1 : undefined);
    const { ctx, rects } = context();
    drawWorldHeight(ctx, cache, terrain('grass'), 1, 1, 0, 0, ink, 0);
    expect(rects).toEqual([['warm', .05, 0, 0, 16, 16]]);
    height.mockImplementation((_x, y) => y === 0 ? 3 : 1); rects.length = 0;
    drawWorldHeight(ctx, cache, terrain('grass'), 1, 1, 0, 0, ink, 0);
    expect(ctx.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, 16 / 3);
    expect(rects[1]?.slice(1)).toEqual([.25, 0, 0, 16, 16 / 3]);
  });
  it('draws four grounds before one clipped large sprite; incomplete blocks use boulder', () => {
    const cache = new WorldChunkCache(async () => { throw Error(); });
    const chunk: WorldChunk = { x0: 0, y0: 0, w: 2, h: 2, keys: ['boulder_large', 'grass'], rows: [[0, 0], [0, 0]], height: ['11', '11'] };
    cache.chunks.set('0,0', chunk);
    const types = new Map([terrain('boulder_large', { footprint: 2, render_layer: 'object' }), terrain('grass', { render_layer: 'ground' }), terrain('boulder', { render_layer: 'object' })].map(t => [t.key, t]));
    const { ctx } = context();
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
    const eras = [{ ring_from: 0, ring_to: 500, ground_key: 'grass' }] as never;
    try {
      art.base.mockClear(); art.large.mockClear();
      chunkCanvas(cache, chunk, types, eras, ink, 0);
      expect(art.base).toHaveBeenCalledTimes(4);
      expect(art.large).toHaveBeenCalledOnce();
      expect(art.large.mock.calls[0]?.slice(2)).toEqual([0, 0, 0, 0, 32]);
      expect(art.base.mock.invocationCallOrder[3]).toBeLessThan(art.large.mock.invocationCallOrder[0]);
      expect(ctx.clip).toHaveBeenCalled();
      art.base.mockClear(); art.large.mockClear();
      const incomplete = { ...chunk, rows: [[0, 0], [0, 1]] }; cache.chunks.set('0,0', incomplete);
      chunkCanvas(cache, incomplete, types, eras, ink, 0);
      expect(art.large).not.toHaveBeenCalled();
      expect(art.base.mock.calls.filter(c => c[1].key === 'boulder')).toHaveLength(3);
    } finally { spy.mockRestore(); }
  });
  it('reads height digits across cached chunk boundaries, defaulting absent arrays to zero', () => {
    const cache = new WorldChunkCache(async () => { throw Error(); });
    cache.chunks.set('64,0', { x0: 64, y0: 0, w: 2, h: 1, keys: [], rows: [], height: ['23'] });
    expect(cache.heightAt(63, 0)).toBeUndefined(); expect(cache.heightAt(64, 0)).toBe(2); expect(cache.heightAt(65, 0)).toBe(3);
    cache.chunks.set('0,0', { x0: 0, y0: 0, w: 64, h: 1, keys: [], rows: [] });
    expect(cache.heightAt(63, 0)).toBe(0);
  });
});