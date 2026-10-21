import { describe, expect, it } from 'vitest';
import { streetStyle, treeStyle } from './villageRendering';
import { patternUri } from './patterns';
import { VILLAGE_GLOW } from './tokens';

describe('Village neighbour rules', () => {
  it('defaults isolated roads to horizontal', () => expect(streetStyle(5, 5, new Set())).toBe('h'));
  it('uses horizontal roads with only left and right neighbours', () => expect(streetStyle(5, 5, new Set(['4,5', '6,5']))).toBe('h'));
  it('uses vertical roads with only up and down neighbours', () => expect(streetStyle(5, 5, new Set(['5,4', '5,6']))).toBe('v'));
  it('uses junctions when both axes connect', () => expect(streetStyle(5, 5, new Set(['4,5', '5,4', '5,6']))).toBe('x'));
  it('uses dense trees for at least three forest neighbours', () => expect(treeStyle(5, 5, new Set(['4,5', '6,5', '5,4']))).toBe('dense'));
  it('uses ordinary trees for fewer than three forest neighbours', () => expect(treeStyle(5, 5, new Set(['4,5', '6,5']))).toBe('tree'));
  it('caches every added pattern and substitutes Village gold', () => {
    for (const [kind, key] of [['floor', 'ground'], ['floor', 'plaza'], ['street', 'cobble'], ['street', 'plates'], ['street', 'brick'], ['tree', 'tree'], ['tree', 'dense']] as const) {
      const uri = patternUri(kind, key, VILLAGE_GLOW);
      expect(patternUri(kind, key, VILLAGE_GLOW)).toBe(uri);
      expect(decodeURIComponent(uri)).not.toContain('$G');
    }
  });
});
import { lampSide, plazaEmblems, treeTint } from './villageRendering';
describe('Village polish rules', () => {
  it('picks tree tint by (col*7+row*13)%3', () => { expect(treeTint(1, 0)).toBe(1); expect(treeTint(0, 1)).toBe(1); expect(treeTint(3, 0)).toBe(0); });
  it('places lamps only on qualifying non-junction roads', () => {
    expect(lampSide(0, 0, new Set(['1,0']))).toBe('n');
    expect(lampSide(0, 0, new Set(['0,1']))).toBe('w');
    expect(lampSide(0, 0, new Set(['1,0', '0,1']))).toBeNull();
    expect(lampSide(1, 0, new Set(['0,0']))).toBeNull();
  });
  it('adds one emblem per square cluster of at least 4x4', () => {
    const big = new Set<string>(); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) big.add(`${c},${r}`);
    expect(plazaEmblems(big)).toEqual([{ col: 1, row: 1 }]);
    expect(plazaEmblems(new Set(['0,0', '1,0', '2,0']))).toEqual([]);
  });
});
import { buildingLook, buildingPalette } from './villageRendering';
describe('Building tone and age', () => {
  it('ignores missing or invalid fields', () => { expect(buildingLook(undefined, 2)).toBeUndefined(); expect(buildingLook('sand', 5)).toBeUndefined(); });
  it('age 4 is the pure base, roof 35% darker', () => { const p = buildingPalette({ tone: 'terracotta', age: 4 }); expect(p.wall).toBe('#c8603a'); expect(p.roof).toBe('#823e26'); expect(p.litRatio).toBe(1); });
  it('age 1 is darker with half the windows lit and cached', () => { const a = buildingPalette({ tone: 'terracotta', age: 1 }); expect(parseInt(a.wall.slice(1, 3), 16)).toBeLessThan(0x70); expect(a.litRatio).toBe(0.5); expect(buildingPalette({ tone: 'terracotta', age: 1 })).toBe(a); });
});
