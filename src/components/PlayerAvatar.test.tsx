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
import { orbLook, paletteFromHex } from './PlayerAvatar';
describe('dyed orb palette', () => {
  it('keeps the original rule when no dye is active', () => {
    expect(orbLook('#1a9e7a', null, 1)).toBe('red');
    expect(orbLook('#1a9e7a', null, 2)).toBe('teal');
  });
  it('uses the dye hex and prism when a dye is active', () => {
    expect(orbLook('#4a7bd8', 'dye_blue', 1)).toEqual({ hex: '#4a7bd8' });
    expect(orbLook('#4a7bd8', 'dye_prism', 2)).toMatchObject({ prism: true });
  });
  it('derives the palette from the hex with white and black outlines', () => {
    const p = paletteFromHex('#4a7bd8');
    expect(p.dark).toBe('#4a7bd8');
    expect(p.aura).toBe('#4a7bd8');
    expect(paletteFromHex('#f4f4ff').outline).toBe('#6a6a90');
    expect(paletteFromHex('#15151c')).toMatchObject({ outline: '#5a5a7a', light: '#4a4a66', rim: true });
  });
});
