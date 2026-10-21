import { FLOOR_STYLES, WALL_STYLES, STREET_STYLES, TREE_STYLES, TREE_TINTS, LARGE_PATTERNS, FLOWER_STYLES } from './svgSources';
import { DIMENSION_GLOW, type Dimension } from './tokens';

const cache = new Map<string, string>();
type Kind = 'wall' | 'floor' | 'street' | 'tree' | 'flower';

/** 96 for large sources (use background-size = cell size * 2), otherwise 48. */
export function patternViewBox(kind: Kind, key: string): 24 | 48 | 96 {
  if (kind === 'street') return 24;
  return LARGE_PATTERNS.has(`${kind}:${key}`) ? 96 : 48;
}

export function patternUri(kind: Kind, key: string, dimension: Dimension | string, tint: string = TREE_TINTS[0], vars?: Record<string, string>): string {
  const cacheKey = `${kind}:${key}:${dimension}:${tint}:${vars ? JSON.stringify(vars) : ''}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;
  const sources: Record<string, string> = { wall: WALL_STYLES, floor: FLOOR_STYLES, street: STREET_STYLES, tree: TREE_STYLES, flower: FLOWER_STYLES }[kind];
  let source = Object.prototype.hasOwnProperty.call(sources, key) ? sources[key] : '';
  if (vars) for (const [k, v] of Object.entries(vars)) source = source.split(`$${k}`).join(v);
  const glow = DIMENSION_GLOW[dimension as Dimension] ?? dimension;
  const vb = kind === 'flower' ? 12 : patternViewBox(kind, key);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}" shape-rendering="crispEdges">${source.replace(/\$G/g, glow).replace(/\$T/g, tint)}</svg>`;
  const uri = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  cache.set(cacheKey, uri);
  return uri;
}
