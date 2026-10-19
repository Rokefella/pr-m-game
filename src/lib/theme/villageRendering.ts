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