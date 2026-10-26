import { describe, expect, it, vi } from 'vitest';
import { chunkOrigin, eraAt, isWading, nearbyChunks, nearestWorldWalkable, tileCost, worldArea, worldMoveDuration, worldPhase, WorldChunkCache, type Terrain, type Era } from './worldTest';
import { worldObjectGround } from './worldTestRender';
import { saveWorldPos, WORLD_LAYOUT_VERSION, WORLD_LAYOUT_VERSION_KEY } from './worldReturn';
describe('read-only world rules', () => {
  it('aligns chunks to 64-cell boundaries', () => { expect(chunkOrigin(25)).toBe(0); expect(chunkOrigin(300)).toBe(256); expect(chunkOrigin(999)).toBe(960); });
  it('prefetches within sixteen cells of an edge', () => { expect(nearbyChunks({ x: 48, y: 32 })).toContainEqual({ x: 64, y: 0 }); expect(nearbyChunks({ x: 47, y: 32 })).toEqual([{ x: 0, y: 0 }]); });
  it('does not request chunks beyond world bounds', () => expect(nearbyChunks({ x: 999, y: 999 })).toEqual([{ x: 960, y: 960 }]));
  it('uses fifty-cell areas', () => expect(worldArea({ x: 300, y: 31 })).toEqual({ x: 6, y: 0 }));
  it('uses Chebyshev rings around 500,500', () => { const era = { ring_from: 400, ring_to: 499 } as Era; expect(eraAt({ x: 25, y: 25 }, [era])).toBe(era); expect(eraAt({ x: 500, y: 500 }, [era])).toBeUndefined(); });
  it('counts null steps as one multiplied by era cost', () => expect(tileCost({ steps: null } as Terrain, { step_cost: 1.5 } as Era)).toBe(1.5));
  it.each([['shallow_water', 3, 450], ['stream', 2, 300], ['swamp_channel', 3, 450], ['mud', .5, 150], ['path', null, 150]])('paces %s by terrain steps without era multiplier', (_key, steps, duration) => {
    expect(worldMoveDuration({ steps: steps as number | null })).toBe(duration);
  });
  it('wades only in enabled walkable water', () => {
    expect(isWading({ grp: 'water', walkable: true, enabled: true } as Terrain)).toBe(true);
    expect(isWading({ grp: 'water', walkable: false } as Terrain)).toBe(false);
    expect(isWading({ grp: 'ground', walkable: true } as Terrain)).toBe(false);
  });
  it('borrows ground left, up, right, down, skips objects and falls back to the era', () => {
    const ground = (key: string) => ({ key, render_layer: 'ground', icon_svg: '<svg/>' } as Terrain);
    const left = ground('grass'), up = ground('mud'), right = ground('sand'), down = ground('path');
    const object = { key: 'tree', render_layer: 'object' } as Terrain;
    const types = new Map([left, up, right, down, object].map(t => [t.key, t]));
    const cache = new WorldChunkCache(async () => { throw Error(); });
    const cells = new Map([['0,1', 'grass'], ['1,0', 'mud'], ['2,1', 'sand'], ['1,2', 'path']]);
    vi.spyOn(cache, 'terrainKey').mockImplementation((x, y) => cells.get(`${x},${y}`));
    for (const expected of [left, up, right, down]) {
      expect(worldObjectGround(cache, types, 1, 1, right)).toBe(expected);
      cells.set([...cells].find(([, key]) => key === expected.key)?.[0] ?? '', 'tree');
    }
    expect(worldObjectGround(cache, types, 1, 1, right)).toBe(right);
    cells.set('0,1', 'legacy'); const legacy = { key: 'legacy' } as Terrain; types.set('legacy', legacy);
    expect(worldObjectGround(cache, types, 1, 1, right)).toBe(legacy);
  });
  it('searches across a chunk edge for the nearest walkable saved-position recovery', async () => {
    const cache = new WorldChunkCache(async (x0, y0) => ({ x0, y0, w: 64, h: 64, keys: ['wall', 'path'], rows: Array.from({ length: 64 }, () => Array.from({ length: 64 }, (_, x) => x0 + x === 64 ? 1 : 0)) }));
    const types = new Map([['wall', { walkable: false } as Terrain], ['path', { walkable: true } as Terrain]]);
    expect(await nearestWorldWalkable(cache, types, { x: 63, y: 25 })).toEqual({ x: 64, y: 25 });
  });
  it('follows the 17-minute real-clock day dusk night dawn cycle', () => { expect(worldPhase(0).phase).toBe('day'); expect(worldPhase(10 * 60000).phase).toBe('dusk'); expect(worldPhase(11 * 60000).phase).toBe('night'); expect(worldPhase(16 * 60000).phase).toBe('dawn'); expect(worldPhase(17 * 60000).phase).toBe('day'); expect(worldPhase(15 * 60000).minutesLeft).toBe(1); });
  it('caches and deduplicates chunks, evicting beyond three chunks', async () => {
    const fetch = vi.fn(async (x0: number, y0: number) => ({ x0, y0, w: 64, h: 64, keys: ['sand'], rows: [[0]] }));
    const cache = new WorldChunkCache(fetch);
    await Promise.all([cache.load(25, 25), cache.load(26, 26)]);
    expect(fetch).toHaveBeenCalledTimes(1); expect(cache.terrainKey(0, 0)).toBe('sand');
    cache.maintain({ x: 300, y: 300 }); expect(cache.chunks.has('0,0')).toBe(false);
  });
});import { eraPointFor as _eraPointFor, mazeOutcome as _mazeOutcome, placesOn as _placesOn } from './worldTest';
import { exitDestination as _exit, saveWorldReturn as _saveReturn, takeWorldOpening as _take } from './worldReturn';
describe('world layers and returns', () => {
  it('maze entrances: current level enters, lower is completed, higher is locked', () => {
    expect(_mazeOutcome(3, 3)).toBe('enter'); expect(_mazeOutcome(1, 3)).toBe('completed'); expect(_mazeOutcome(4, 3)).toBe('locked');
  });
  it('underground era comes from surface cell (ux*4+2, uy*4+2)', () => { expect(_eraPointFor({ x: 24, y: 13 }, 1)).toEqual({ x: 98, y: 54 }); });
  it('places filter by layer, missing layer is surface', () => {
    const ps = [{ name: 'a', layer: 1 }, { name: 'b' }] as never[];
    expect(_placesOn(ps, 1).length).toBe(1); expect(_placesOn(ps, 0).length).toBe(1);
  });
  it('exits go to /world only while a world return is stored', () => {
    localStorage.clear(); saveWorldPos({ layer: 0, x: 25, y: 25 }); expect(_exit()).toBe('/village');
    _saveReturn({ layer: 0, x: 97, y: 60 }); expect(_exit()).toBe('/world');
    expect(_take()).toEqual({ layer: 0, x: 97, y: 60 }); expect(_exit()).toBe('/village');
  });
  it.each([null, '1', '2'])('ignores obsolete layout %s, then writes version 3', version => {
    localStorage.clear(); if (version) localStorage.setItem(WORLD_LAYOUT_VERSION_KEY, version);
    localStorage.setItem('praem.worldPos', JSON.stringify({ layer: 0, x: 99, y: 99 }));
    expect(_take()).toBeNull(); expect(WORLD_LAYOUT_VERSION).toBe(3);
    expect(localStorage.getItem(WORLD_LAYOUT_VERSION_KEY)).toBe('3');
  });
});
