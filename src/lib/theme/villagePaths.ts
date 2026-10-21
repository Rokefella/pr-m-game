import type { VillageStreetStyle } from './tokens';
import { streetStyle } from './villageRendering';

export type PathEdge = { side: 'n' | 's' | 'w' | 'e'; x: number; y: number; w: number; h: number };
export type PathLamp = { x: number; y: number };
const CELL = 20;

/** Merge only exposed sides, using the complete layout rather than the culled view. */
export function pathEdges(paths: ReadonlySet<string>): PathEdge[] {
  const groups = new Map<string, number[]>();
  for (const key of paths) {
    const [col, row] = key.split(',').map(Number);
    for (const [side, dc, dr] of [['n', 0, -1], ['s', 0, 1], ['w', -1, 0], ['e', 1, 0]] as const) {
      if (paths.has(`${col + dc},${row + dr}`)) continue;
      const horizontal = side === 'n' || side === 's';
      const group = `${side}:${horizontal ? row : col}`;
      const values = groups.get(group) ?? [];
      values.push(horizontal ? col : row); groups.set(group, values);
    }
  }
  const edges: PathEdge[] = [];
  for (const [key, values] of groups) {
    const [rawSide, rawFixed] = key.split(':');
    const side = rawSide as PathEdge['side'], fixed = Number(rawFixed);
    values.sort((a, b) => a - b);
    let start = values[0], end = start;
    const push = () => {
      const horizontal = side === 'n' || side === 's';
      edges.push({ side, x: horizontal ? start * CELL : fixed * CELL + (side === 'e' ? CELL - 4 : 0), y: horizontal ? fixed * CELL + (side === 's' ? CELL - 4 : 0) : start * CELL, w: horizontal ? (end - start + 1) * CELL : 4, h: horizontal ? 4 : (end - start + 1) * CELL });
    };
    for (const value of values.slice(1)) { if (value === end + 1) end = value; else { push(); start = value; end = value; } }
    push();
  }
  return edges;
}

/** Brick lamps are spaced eight cells apart along exposed straight edges. */
export function pathLamps(paths: ReadonlySet<string>, style: VillageStreetStyle): PathLamp[] {
  if (style !== 'brick') return [];
  const lamps: PathLamp[] = [];
  for (const edge of pathEdges(paths)) {
    if (edge.side !== 'n' && edge.side !== 'w') continue;
    const horizontal = edge.side === 'n', count = (horizontal ? edge.w : edge.h) / CELL;
    for (let i = 4; i < count; i += 8) {
      const col = edge.x / CELL + (horizontal ? i : 0), row = edge.y / CELL + (horizontal ? 0 : i);
      if (streetStyle(col, row, paths) !== (horizontal ? 'h' : 'v')) continue;
      // Skip ends and junctions: both neighbours along the straight axis must exist.
      if (!paths.has(`${col - (horizontal ? 1 : 0)},${row - (horizontal ? 0 : 1)}`) || !paths.has(`${col + (horizontal ? 1 : 0)},${row + (horizontal ? 0 : 1)}`)) continue;
      lamps.push({ x: col * CELL + (horizontal ? CELL / 2 : -6), y: row * CELL + (horizontal ? -6 : CELL / 2) });
    }
  }
  return lamps;
}

const fringeCache = new Map<PathEdge['side'], string>();
export function fringeUri(side: PathEdge['side']) {
  const cached = fringeCache.get(side); if (cached) return cached;
  const horizontal = side === 'n' || side === 's';
  const transform = side === 'n' ? '' : side === 's' ? 'translate(0 4) scale(1 -1)' : side === 'w' ? 'translate(0 24) rotate(-90)' : 'translate(4 0) rotate(90)';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${horizontal ? '24 4' : '4 24'}" shape-rendering="crispEdges"><g transform="${transform}"><rect y="1" width="24" height="3" fill="#4f8f5a"/><path d="M2 0h1v2H2zM8 1h2v1H8zM15 0h1v3h-1zM21 1h1v2h-1z" fill="#7bd68a"/></g></svg>`;
  const uri = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`; fringeCache.set(side, uri); return uri;
}