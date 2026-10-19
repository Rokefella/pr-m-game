export const GARDEN_LEVEL = 1;
export const GARDEN_SIZE = 60;

export type GardenSeason = 'spring' | 'summer' | 'autumn' | 'winter';
export type GardenSpecial = 'christmas' | null;

export type GardenConfig = {
  season: GardenSeason;
  seed: number;
  size: number;
  special: GardenSpecial;
};

export type SeasonPalette = {
  ground: string;
  alt: string;
  specks: string;
  leaf: string;
  veins: string;
  trees: string[];
  flowers: string[];
  lights: string[];
  glow: string;
  particle: 'petals' | 'fireflies' | 'leaves' | 'snow';
};

export const SEASONS: Record<GardenSeason, SeasonPalette> = {
  spring: { ground: '#4f9a5a', alt: '#3f8a52', specks: '#7bd68a', leaf: '#bfffd0', veins: '#bfffd0', trees: ['#f4a6c8', '#7bd68a', '#ffd9e8'], flowers: ['#ffffff', '#ffd24a', '#ff7aa8', '#c070e0', '#4aa8ff'], lights: ['#ffb6d9', '#bfffd0', '#ffd24a', '#9fe8ff'], glow: '#ffd9e8', particle: 'petals' },
  summer: { ground: '#7cb342', alt: '#6aa03a', specks: '#c8e06a', leaf: '#fff59d', veins: '#fff59d', trees: ['#2fbf6a', '#3fd07a', '#f0c040'], flowers: ['#ffd24a', '#4aa8ff', '#ff8a3a', '#ffffff', '#ff5a6a'], lights: ['#ffd24a', '#62e6f0', '#ff8a3a', '#ffffff'], glow: '#fff3a0', particle: 'fireflies' },
  autumn: { ground: '#86702f', alt: '#6e5a24', specks: '#a88a3a', leaf: '#c8602a', veins: '#ffd27a', trees: ['#e0993a', '#c8602a', '#f0c040'], flowers: ['#e8503a', '#c070e0', '#f5a03a', '#ffffff', '#ff7aa8'], lights: ['#ffb347', '#ff5a6a', '#62e6f0', '#ff9ad0'], glow: '#ffd27a', particle: 'leaves' },
  winter: { ground: '#d8e6f0', alt: '#c4d6e4', specks: '#ffffff', leaf: '#ffffff', veins: '#9fe8ff', trees: ['#cfe6ff', '#e8f2ff', '#b8d8f0'], flowers: ['#9fe8ff', '#ffffff', '#c9b8ff'], lights: ['#ff5a6a', '#5cff9a', '#ffd24a', '#ffffff'], glow: '#bfe8ff', particle: 'snow' },
};

/** The christmas special overrides the lights and the particle of its season. */
export function seasonPalette(config: GardenConfig): SeasonPalette {
  const base = SEASONS[config.season];
  if (config.special === 'christmas') {
    return { ...base, lights: ['#ff3b3b', '#2fe07a', '#ffd24a', '#ffffff'], particle: 'snow' };
  }
  return base;
}
