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
    for (const [kind, key] of [['floor', 'ground'], ['floor', 'plaza'], ['street', 'h'], ['street', 'v'], ['street', 'x'], ['tree', 'tree'], ['tree', 'dense']] as const) {
      const uri = patternUri(kind, key, VILLAGE_GLOW);
      expect(patternUri(kind, key, VILLAGE_GLOW)).toBe(uri);
      expect(decodeURIComponent(uri)).not.toContain('$G');
      if (kind === 'street') expect(decodeURIComponent(uri)).toContain('#f5c060');
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
