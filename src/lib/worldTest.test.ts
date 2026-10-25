import { describe, expect, it, vi } from 'vitest';
import { chunkOrigin, eraAt, nearbyChunks, tileCost, worldArea, worldPhase, WorldChunkCache, type Terrain, type Era } from './worldTest';
describe('read-only world rules', () => {
  it('aligns chunks to 64-cell boundaries', () => { expect(chunkOrigin(25)).toBe(0); expect(chunkOrigin(300)).toBe(256); expect(chunkOrigin(999)).toBe(960); });
  it('prefetches within sixteen cells of an edge', () => { expect(nearbyChunks({ x: 48, y: 32 })).toContainEqual({ x: 64, y: 0 }); expect(nearbyChunks({ x: 47, y: 32 })).toEqual([{ x: 0, y: 0 }]); });
  it('does not request chunks beyond world bounds', () => expect(nearbyChunks({ x: 999, y: 999 })).toEqual([{ x: 960, y: 960 }]));
  it('uses fifty-cell areas', () => expect(worldArea({ x: 300, y: 31 })).toEqual({ x: 6, y: 0 }));
  it('uses Chebyshev rings around 500,500', () => { const era = { ring_from: 400, ring_to: 499 } as Era; expect(eraAt({ x: 25, y: 25 }, [era])).toBe(era); expect(eraAt({ x: 500, y: 500 }, [era])).toBeUndefined(); });
  it('counts null steps as one multiplied by era cost', () => expect(tileCost({ steps: null } as Terrain, { step_cost: 1.5 } as Era)).toBe(1.5));
  it('follows the 17-minute real-clock day dusk night dawn cycle', () => { expect(worldPhase(0).phase).toBe('day'); expect(worldPhase(10 * 60000).phase).toBe('dusk'); expect(worldPhase(11 * 60000).phase).toBe('night'); expect(worldPhase(16 * 60000).phase).toBe('dawn'); expect(worldPhase(17 * 60000).phase).toBe('day'); expect(worldPhase(15 * 60000).minutesLeft).toBe(1); });
  it('caches and deduplicates chunks, evicting beyond three chunks', async () => {
    const fetch = vi.fn(async (x0: number, y0: number) => ({ x0, y0, w: 64, h: 64, keys: ['sand'], rows: [[0]] }));
    const cache = new WorldChunkCache(fetch);
    await Promise.all([cache.load(25, 25), cache.load(26, 26)]);
    expect(fetch).toHaveBeenCalledTimes(1); expect(cache.terrainKey(0, 0)).toBe('sand');
    cache.maintain({ x: 300, y: 300 }); expect(cache.chunks.has('0,0')).toBe(false);
  });
});