import { FLOOR_STYLES, WALL_STYLES, STREET_STYLES, TREE_STYLES } from './svgSources';
import { DIMENSION_GLOW, type Dimension } from './tokens';

const cache = new Map<string, string>();

export function patternUri(kind: 'wall' | 'floor' | 'street' | 'tree', key: string, dimension: Dimension | string): string {
  const cacheKey = `${kind}:${key}:${dimension}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;
  const sources: Record<string, string> = { wall: WALL_STYLES, floor: FLOOR_STYLES, street: STREET_STYLES, tree: TREE_STYLES }[kind];
  const source = Object.prototype.hasOwnProperty.call(sources, key) ? sources[key] : '';
  const glow = DIMENSION_GLOW[dimension as Dimension] ?? dimension;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" shape-rendering="crispEdges">${source.replace(/\$G/g, glow)}</svg>`;
  const uri = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  cache.set(cacheKey, uri);
  return uri;
}