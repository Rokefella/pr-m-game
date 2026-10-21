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

export const BUILDING_TONES = { terracotta: '#c8603a', sand: '#d4b078', slate: '#6a86a8', sage: '#7a9a6a', plum: '#8a5a8a', stone: '#8a8a96' } as const;
export type BuildingTone = keyof typeof BUILDING_TONES;
export type BuildingLook = { tone: BuildingTone; age: 1 | 2 | 3 | 4 };
export type BuildingPalette = { wall: string; roof: string; litRatio: number };
const AGE_SHADE = [0.45, 0.62, 0.8, 1];
const AGE_GREY = [0.12, 0.08, 0.04, 0];
const paletteCache = new Map<string, BuildingPalette>();
const hex = (n: number[]) => '#' + n.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

/** Valid tone+age pair from raw cell data, else undefined (keeps the legacy look). */
export function buildingLook(tone: unknown, age: unknown): BuildingLook | undefined {
  if (typeof tone !== 'string' || !(tone in BUILDING_TONES)) return undefined;
  const a = Number(age);
  if (!Number.isInteger(a) || a < 1 || a > 4) return undefined;
  return { tone: tone as BuildingTone, age: a as BuildingLook['age'] };
}

/** Cached per tone+age (at most 24 entries). */
export function buildingPalette({ tone, age }: BuildingLook): BuildingPalette {
  const key = `${tone}-${age}`;
  const hit = paletteCache.get(key);
  if (hit) return hit;
  const b = BUILDING_TONES[tone].slice(1).match(/../g)!.map(h => parseInt(h, 16));
  const k = AGE_SHADE[age - 1], g = AGE_GREY[age - 1];
  const shaded = b.map(v => v * k);
  const grey = (shaded[0] + shaded[1] + shaded[2]) / 3;
  const wall = shaded.map(v => v * (1 - g) + grey * g);
  const p = { wall: hex(wall), roof: hex(wall.map(v => v * 0.65)), litRatio: age <= 2 ? 0.5 : 1 };
  paletteCache.set(key, p);
  return p;
}
