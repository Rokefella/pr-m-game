export const VILLAGE_BG = 'var(--village-background)';
export const VILLAGE_VIGNETTE = 'var(--village-vignette)';

export function streetStyle(col: number, row: number, roads: ReadonlySet<string>): 'h' | 'v' | 'x' {
  const horizontal = roads.has(`${col - 1},${row}`) || roads.has(`${col + 1},${row}`);
  const vertical = roads.has(`${col},${row - 1}`) || roads.has(`${col},${row + 1}`);
  return horizontal && vertical ? 'x' : vertical ? 'v' : 'h';
}

export function treeStyle(col: number, row: number, trees: ReadonlySet<string>): 'tree' | 'dense' {
  return [[-1, 0], [1, 0], [0, -1], [0, 1]].filter(([dc, dr]) => trees.has(`${col + dc},${row + dr}`)).length >= 3 ? 'dense' : 'tree';
}
export const treeTint = (col: number, row: number): number => (((col * 7 + row * 13) % 3) + 3) % 3;

/** Lamp side for a road cell, or null when none: north edge for horizontal streets, west for vertical; junctions skipped. */
export function lampSide(col: number, row: number, roads: ReadonlySet<string>): 'n' | 'w' | null {
  if ((((col * 5 + row * 11) % 13) + 13) % 13 !== 0) return null;
  const s = streetStyle(col, row, roads);
  if (s === 'x') return null;
  if (s === 'h') return roads.has(`${col},${row - 1}`) ? null : 'n';
  return roads.has(`${col - 1},${row}`) ? null : 'w';
}

/** Centre cells of SQUARE clusters whose bounding box is at least 4x4 cells. */
export function plazaEmblems(squares: ReadonlySet<string>): { col: number; row: number }[] {
  const seen = new Set<string>(); const out: { col: number; row: number }[] = [];
  for (const start of squares) {
    if (seen.has(start)) continue;
    seen.add(start);
    const stack = [start]; let minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
    while (stack.length) {
      const k = stack.pop()!; const [c, r] = k.split(',').map(Number);
      minC = Math.min(minC, c); maxC = Math.max(maxC, c); minR = Math.min(minR, r); maxR = Math.max(maxR, r);
      for (const n of [`${c - 1},${r}`, `${c + 1},${r}`, `${c},${r - 1}`, `${c},${r + 1}`]) if (squares.has(n) && !seen.has(n)) { seen.add(n); stack.push(n); }
    }
    if (maxC - minC + 1 >= 4 && maxR - minR + 1 >= 4) out.push({ col: Math.floor((minC + maxC) / 2), row: Math.floor((minR + maxR) / 2) });
  }
  return out;
}
