import { FLOOR_STYLES, WALL_STYLES, type StyleKey } from './svgSources';
import { DIMENSION_GLOW, type Dimension } from './tokens';

const cache = new Map<string, string>();

export function patternUri(kind: 'wall' | 'floor', key: StyleKey, dimension: Dimension): string {
  const cacheKey = `${kind}:${key}:${dimension}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;
  const source = (kind === 'wall' ? WALL_STYLES : FLOOR_STYLES)[key];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" shape-rendering="crispEdges">${source.replace(/\$G/g, DIMENSION_GLOW[dimension])}</svg>`;
  const uri = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  cache.set(cacheKey, uri);
  return uri;
}