import { describe, expect, it } from 'vitest';
import { paletteFromColor } from './PlayerAvatar';

describe('player palette rules', () => {
  it('keeps registration number 1 red regardless of aura', () => {
    expect(paletteFromColor('#1a9e7a', 1)).toBe('red');
    expect(paletteFromColor(null, 1)).toBe('red');
  });
  it('preserves other players’ chosen palette mapping', () => {
    expect(paletteFromColor('#5b4fd4', 2)).toBe('purple');
    expect(paletteFromColor('#c8963a', 2)).toBe('amber');
    expect(paletteFromColor('#1a9e7a', 2)).toBe('teal');
  });
  it('preserves the purple default for missing or invalid aura colours', () => {
    expect(paletteFromColor(null, 2)).toBe('purple');
    expect(paletteFromColor('invalid', 2)).toBe('purple');
  });
});