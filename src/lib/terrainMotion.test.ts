import { describe, expect, it } from 'vitest';
import { canSway, flameFrame, flowOffset, gustStrength, lavaBrightness, leanAmount, terrainDrawInterval, waterDirection } from './terrainMotion';
import type { Terrain } from './worldTest';
const water = { grp: 'water' } as Terrain;
describe('terrain animation rules', () => {
  it('follows a diagonal river rather than the world centre', () => {
    const direction = waterDirection(900, 900, (x, y) => x - 900 === y - 900 ? water : undefined);
    expect(direction.x).toBeCloseTo(Math.SQRT1_2); expect(direction.y).toBeCloseTo(Math.SQRT1_2);
  });
  it('follows horizontal and vertical water and falls back down-right', () => {
    expect(waterDirection(10, 10, (_x, y) => y === 10 ? water : undefined)).toEqual({ x: 1, y: 0 });
    expect(waterDirection(10, 10, (x) => x === 10 ? water : undefined).y).toBeCloseTo(1);
    expect(waterDirection(10, 10)).toEqual({ x: Math.SQRT1_2, y: Math.SQRT1_2 });
  });
  it('uses six-fps ripples with double fast and half slow speed', () => {
    expect(flowOffset('flow', 1000)).toBe(6); expect(flowOffset('flow_fast', 1000)).toBe(12); expect(flowOffset('flow_slow', 1000)).toBe(3);
  });
  it('cycles three flame frames at eight fps', () => {
    const first = flameFrame(0, 2, 3);
    expect(flameFrame(125, 2, 3)).toBe((first + 1) % 3); expect(flameFrame(375, 2, 3)).toBe(first);
  });
  it('lava brightness repeats every two seconds', () => {
    expect(lavaBrightness(500)).toBeCloseTo(.24); expect(lavaBrightness(1500)).toBeCloseTo(0); expect(lavaBrightness(2500)).toBeCloseTo(.24);
  });
  it('wind propagates east at eight cells per second on the shared clock', () => {
    expect(gustStrength(80, 5, 110750)).toBeCloseTo(gustStrength(88, 5, 111750));
    expect(gustStrength(80, 5, 110750)).toBeGreaterThan(.8);
  });
  it('pines skip odd gusts and rocks/buildings never sway', () => {
    expect(gustStrength(0, 5, 10750, true)).toBe(0);
    for (const key of ['boulder', 'rock_field', 'building']) expect(canSway({ key, moves: 'sway' } as Terrain)).toBe(false);
    expect(leanAmount({ key: 'grass', moves: 'sway' } as Terrain, 500, 5, 100)).toBeGreaterThan(0);
  });
  it('caps moving/gusting drawing at thirty fps and idle drawing at ten', () => {
    expect(terrainDrawInterval(true, false)).toBe(1000 / 30); expect(terrainDrawInterval(false, true)).toBe(1000 / 30); expect(terrainDrawInterval(false, false)).toBe(100);
  });
});