import { describe, expect, it } from 'vitest';
import { ICE_MOVE_MS, iceNext, isIce, npcTerrainSafe } from './worldIce';
import { tileCost, WORLD_MOVE_MS, type Terrain } from './worldTest';
const ice = { key: 'ice', walkable: true, enabled: true, steps: 2, grp: 'ground' } as Terrain;
describe('ice movement', () => {
  it('slides three times faster than normal walking', () => expect(ICE_MOVE_MS).toBe(WORLD_MOVE_MS / 3));
  it('stops on the last walkable cell before an obstruction', () => {
    const at = (p: { x: number; y: number }) => p.x < 4 ? ice : { ...ice, walkable: false };
    let point = { x: 1, y: 1 }, moves = 0, cost = 0;
    while (moves < 10) { const next = iceNext(point, { x: 1, y: 0 }, at); if (!next) break; point = next; moves++; cost += tileCost(at(point)); }
    expect(point).toEqual({ x: 3, y: 1 }); expect(cost).toBe(4);
  });
  it('NPCs reject ice but keep ordinary safe paths', () => { expect(npcTerrainSafe(ice)).toBe(false); expect(npcTerrainSafe({ ...ice, key: 'snow_path' })).toBe(true); });
  it('ends ice mode on non-ice terrain', () => { expect(isIce(ice)).toBe(true); expect(isIce({ key: 'snow_path' })).toBe(false); });
});