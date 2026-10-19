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