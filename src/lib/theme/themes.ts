import { WALL_STYLES, type StyleKey } from './svgSources';

export type ThemeDef = { wall: StyleKey; floor: StyleKey; primeGlow: boolean };

export const THEME_PRESETS: Record<string, ThemeDef> = {
  calm: { wall: 'calm', floor: 'calm', primeGlow: true },
  instrument: { wall: 'gold', floor: 'ulam', primeGlow: true },
  plated: { wall: 'plated', floor: 'plated', primeGlow: true },
  chevron: { wall: 'chevron', floor: 'chevron', primeGlow: true },
  hex: { wall: 'hex', floor: 'hex', primeGlow: true },
  lightstrip: { wall: 'lightstrip', floor: 'lightstrip', primeGlow: true },
  gold: { wall: 'gold', floor: 'gold', primeGlow: true },
  ulam: { wall: 'ulam', floor: 'ulam', primeGlow: true },
};

export const LEVEL_THEMES = ['plated'];

function isStyleKey(value: string): value is StyleKey {
  return Object.prototype.hasOwnProperty.call(WALL_STYLES, value);
}

export function getThemeForLevel(level: number, override?: string | null): ThemeDef {
  if (override && Object.prototype.hasOwnProperty.call(THEME_PRESETS, override)) {
    return THEME_PRESETS[override];
  }
  if (override) {
    const parts = override.split('+');
    if (parts.length === 2 && isStyleKey(parts[0]) && isStyleKey(parts[1])) {
      return { wall: parts[0], floor: parts[1], primeGlow: true };
    }
  }
  const index = Number.isFinite(level) ? ((Math.trunc(level) - 1) % LEVEL_THEMES.length + LEVEL_THEMES.length) % LEVEL_THEMES.length : 0;
  return THEME_PRESETS[LEVEL_THEMES[index]];
}