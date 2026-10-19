import type { ExitDir } from '../objects';

export type Run = { row: number; col: number; n: number };
type Cell = { col: number; row: number; type: string };

/** Merges a set of "col,row" keys into horizontal runs (one div per run). */
export function toRuns(keys: Iterable<string>): Run[] {
  const byRow = new Map<number, number[]>();
  for (const k of keys) { const [c, r] = k.split(',').map(Number); (byRow.get(r) ?? byRow.set(r, []).get(r)!).push(c); }
  const runs: Run[] = [];
  for (const [row, cols] of byRow) {
    cols.sort((a, b) => a - b);
    let start = cols[0], prev = cols[0];
    for (let i = 1; i <= cols.length; i++) {
      const c = cols[i];
      if (c === prev + 1) { prev = c; continue; }
      runs.push({ row, col: start, n: prev - start + 1 });
      start = prev = c;
    }
  }
  return runs;
}

/**
 * Floor = every present non-wall cell. Implicit walls = absent in-grid cells touching
 * (8 neighbours) a present non-wall cell; they render and collide like WALL.
 */
export function roomGeometry(cells: Cell[], gridSize: number) {
  const present = new Map<string, string>();
  for (const c of cells) if (c && typeof c.col === 'number' && typeof c.row === 'number') present.set(`${c.col},${c.row}`, c.type);
  const floor: string[] = [], walls: string[] = [], implicit = new Set<string>();
  for (const [k, t] of present) {
    if (t === 'WALL') { walls.push(k); continue; }
    floor.push(k);
    const [c, r] = k.split(',').map(Number);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nc = c + dc, nr = r + dr, nk = `${nc},${nr}`;
      if (nc < 0 || nr < 0 || nc >= gridSize || nr >= gridSize || present.has(nk)) continue;
      implicit.add(nk);
    }
  }
  return {
    floorRuns: toRuns(floor),
    wallRuns: toRuns([...walls, ...implicit]),
    implicitWalls: [...implicit].map(k => { const [c, r] = k.split(',').map(Number); return { col: c, row: r }; }),
  };
}

export function exitDir(col: number, row: number, gridSize: number): ExitDir {
  if (row <= 1) return 'up';
  if (row >= gridSize - 2) return 'down';
  if (col <= 1) return 'left';
  if (col >= gridSize - 2) return 'right';
  return 'down';
}
