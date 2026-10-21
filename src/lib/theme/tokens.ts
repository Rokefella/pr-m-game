export type Dimension = 'purple' | 'amber' | 'teal';

export const DIMENSION_GLOW: Record<Dimension, string> = {
  purple: '#b79bff',
  amber: '#f5c060',
  teal: '#62e6f0',
};
export const VILLAGE_GLOW = '#f5c060';
export type VillageStreetStyle = 'cobble' | 'plates' | 'brick';
export const VILLAGE_STREET_STYLE: VillageStreetStyle = 'cobble';
/** Maze rendering glow per level (presentation only; does not change the dimension). */
export const MAZE_GLOW_BY_LEVEL: Record<number, Dimension> = { 1: 'teal', 2: 'purple', 3: 'amber' };
export const mazeGlowForLevel = (level: number): Dimension => MAZE_GLOW_BY_LEVEL[level] ?? 'teal';
