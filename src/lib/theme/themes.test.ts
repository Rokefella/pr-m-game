import { describe, expect, it } from 'vitest';
import { getThemeForLevel } from './themes';
import { patternUri } from './patterns';
import { DIMENSION_GLOW, VILLAGE_GLOW } from './tokens';

describe('Tile theme selection', () => {
  it('cycles the six specified level themes', () => {
    expect(Array.from({ length: 7 }, (_, i) => getThemeForLevel(i + 1).wall))
      .toEqual(['gold', 'plated', 'hex', 'chevron', 'lightstrip', 'ulam', 'gold']);
  });
  it('uses named overrides', () => expect(getThemeForLevel(1, 'hex')).toEqual({ wall: 'hex', floor: 'hex', primeGlow: true }));
  it('uses valid wall+floor overrides', () => expect(getThemeForLevel(1, 'plated+ulam')).toEqual({ wall: 'plated', floor: 'ulam', primeGlow: true }));
  it('ignores invalid overrides', () => {
    expect(getThemeForLevel(1, 'unknown+ulam').wall).toBe('gold');
    expect(getThemeForLevel(2, 'toString').wall).toBe('plated');
  });
  it('uses the specified dimension and village glows', () => {
    expect(DIMENSION_GLOW).toEqual({ purple: '#b79bff', amber: '#f5c060', teal: '#62e6f0' });
    expect(VILLAGE_GLOW).toBe('#f5c060');
    for (const dimension of ['purple', 'amber', 'teal'] as const) {
      const uri = patternUri('wall', 'plated', dimension);
      expect(decodeURIComponent(uri)).toContain(DIMENSION_GLOW[dimension]);
      expect(decodeURIComponent(uri)).not.toContain('$G');
      expect(patternUri('wall', 'plated', dimension)).toBe(uri);
    }
  });
});