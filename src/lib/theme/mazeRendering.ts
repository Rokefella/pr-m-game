export type GridCell = { col: number; row: number };

export const MAZE_VIGNETTE = 0.35;
export const SHOW_SPAWN_GLIMMER = true;
export const MAZE_CULL_MARGIN = 400;

/** Deterministic fixtures; reset spacing only at a break in a wall run. */
export function pylonCells(cols: number, rows: number, walls: Set<string>, open: Set<string>): Set<string> {
  const result = new Set<string>();
  for (let row = 0; row < rows; row++) {
    let previous = -Infinity;
    for (let col = 0; col < cols; col++) {
      const key = `${col},${row}`;
      if (!walls.has(key)) { previous = -Infinity; continue; }
      if (row + 1 < rows && open.has(`${col},${row + 1}`) && (col * 7 + row * 13) % 11 === 0 && col - previous >= 5) {
        result.add(key);
        previous = col;
      }
    }
  }
  return result;
}

export function visibleBounds(cell: GridCell, width: number, height: number, size: number) {
  const x = cell.col * size + size / 2;
  const y = cell.row * size + size / 2;
  return {
    minCol: Math.floor((x - width / 2 - MAZE_CULL_MARGIN) / size) - 1,
    maxCol: Math.ceil((x + width / 2 + MAZE_CULL_MARGIN) / size),
    minRow: Math.floor((y - height / 2 - MAZE_CULL_MARGIN) / size) - 1,
    maxRow: Math.ceil((y + height / 2 + MAZE_CULL_MARGIN) / size),
  };
}