import { GARDEN_SIZE, SEASONS, type GardenConfig } from './gardenConfig';

export type GardenRoomCell = {
  col: number;
  row: number;
  type: string;
  color?: string | null;
  exit?: { destination?: string } | null;
};

export type GardenTree = { col: number; row: number; tint: string };
export type GardenFlower = { col: number; row: number; color: string };
export type GardenLamp = { col: number; row: number };
export type GardenString = { row: number; c1: number; c2: number; sag: number };
export type GardenBulb = { x: number; y: number; color: string };

export type GeneratedGarden = {
  size: number;
  cells: GardenRoomCell[];
  trees: GardenTree[];
  ring: { col: number; row: number }[];
  flowers: GardenFlower[];
  lamps: GardenLamp[];
  strings: GardenString[];
  bulbs: GardenBulb[][];
  path: { col: number; row: number }[];
  circle: { cx: number; cy: number; r: number };
  start: { col: number; row: number };
};

/** Deterministic PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CELL = 20;

export function generateGarden(config: GardenConfig): GeneratedGarden {
  const N = config.size || GARDEN_SIZE;
  const rand = mulberry32(config.seed);
  const season = SEASONS[config.season];
  const c0 = Math.floor(N / 2);

  // Hedge ring: two cells thick on every edge, with a 3-wide entrance gap at the bottom.
  const ring: { col: number; row: number }[] = [];
  const ringSet = new Set<string>();
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      const onRing = col < 2 || col >= N - 2 || row < 2 || row >= N - 2;
      if (!onRing) continue;
      const isGap = row >= N - 2 && col >= c0 - 1 && col <= c0 + 1;
      if (isGap) continue;
      ring.push({ col, row });
      ringSet.add(`${col},${row}`);
    }
  }

  const start = { col: c0, row: N - 5 };
  const circle = { cx: c0, cy: Math.floor(N * 0.45), r: 8 };

  // Path: 2 wide, from below the circle down to the entrance.
  const path: { col: number; row: number }[] = [];
  const pathSet = new Set<string>();
  for (let row = circle.cy + circle.r; row <= N - 3; row++) {
    for (const col of [c0 - 1, c0]) {
      path.push({ col, row });
      pathSet.add(`${col},${row}`);
    }
  }

  const dist = (c: number, r: number, cc: number, cr: number) => Math.hypot(c - cc, r - cr);

  // Interior trees, well spaced, kept off the path, circle and start.
  const trees: GardenTree[] = [];
  const treeSet = new Set<string>();
  const treeTarget = Math.round((N * N) / 36);
  for (let attempt = 0; attempt < treeTarget * 20 && trees.length < treeTarget; attempt++) {
    const col = 3 + Math.floor(rand() * (N - 6));
    const row = 3 + Math.floor(rand() * (N - 6));
    const key = `${col},${row}`;
    if (treeSet.has(key)) continue;
    // Path rectangle expanded by 1.
    if (col >= c0 - 2 && col <= c0 + 1 && row >= circle.cy + circle.r - 1 && row <= N - 2) continue;
    if (dist(col, row, circle.cx, circle.cy) <= circle.r + 3) continue;
    if (dist(col, row, start.col, start.row) <= 4) continue;
    if (trees.some((t) => Math.max(Math.abs(t.col - col), Math.abs(t.row - row)) < 3)) continue;
    const tint = season.trees[Math.floor(rand() * season.trees.length)];
    trees.push({ col, row, tint });
    treeSet.add(key);
  }

  // Flowers: non-solid decoration.
  const flowers: GardenFlower[] = [];
  const flowerSet = new Set<string>();
  const flowerTarget = Math.round((N * N) / 10);
  for (let attempt = 0; attempt < flowerTarget * 20 && flowers.length < flowerTarget; attempt++) {
    const col = 2 + Math.floor(rand() * (N - 4));
    const row = 2 + Math.floor(rand() * (N - 4));
    const key = `${col},${row}`;
    if (flowerSet.has(key) || treeSet.has(key) || pathSet.has(key)) continue;
    if (dist(col, row, circle.cx, circle.cy) <= circle.r + 1) continue;
    if (dist(col, row, start.col, start.row) <= 2) continue;
    const color = season.flowers[Math.floor(rand() * season.flowers.length)];
    flowers.push({ col, row, color });
    flowerSet.add(key);
  }

  // Lamps: 8 around the circle, plus pairs along the path.
  const lamps: GardenLamp[] = [];
  const lampSet = new Set<string>();
  const addLamp = (col: number, row: number) => {
    const key = `${col},${row}`;
    if (col < 2 || row < 2 || col >= N - 2 || row >= N - 2 || lampSet.has(key)) return;
    lampSet.add(key);
    lamps.push({ col, row });
  };
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    addLamp(Math.round(circle.cx + Math.cos(a) * (circle.r + 2)), Math.round(circle.cy + Math.sin(a) * (circle.r + 2)));
  }
  for (const off of [4, 10, 16]) {
    const row = circle.cy + circle.r + off;
    if (row >= N - 3) continue;
    addLamp(c0 - 3, row);
    addLamp(c0 + 2, row);
  }

  // String lights: three swags across the garden.
  const strings: GardenString[] = [
    { row: Math.round(N * 0.15), c1: 3, c2: N - 4, sag: 3 },
    { row: Math.round(N * 0.3), c1: c0 - 14, c2: c0 + 14, sag: 3 },
    { row: Math.round(N * 0.78), c1: 3, c2: N - 4, sag: 3 },
  ];
  const lights = config.special === 'christmas'
    ? ['#ff3b3b', '#2fe07a', '#ffd24a', '#ffffff']
    : season.lights;
  const bulbs: GardenBulb[][] = strings.map((s) => {
    const x1 = s.c1 * CELL + 10;
    const x2 = s.c2 * CELL + 10;
    const y = s.row * CELL;
    const cy = y + s.sag * 40;
    const out: GardenBulb[] = [];
    const count = Math.max(1, Math.round((x2 - x1) / 60));
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const bx = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * ((x1 + x2) / 2) + t * t * x2;
      const by = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * y;
      out.push({ x: bx, y: by, color: lights[i % lights.length] });
    }
    return out;
  });

  // Collision/render cells: hedge ring + interior trees as TREE, entrance as ROOM_EXIT.
  const cells: GardenRoomCell[] = [];
  for (const h of ring) {
    cells.push({ col: h.col, row: h.row, type: 'TREE', color: season.trees[Math.floor(h.col / 4) % season.trees.length] });
  }
  for (const t of trees) {
    cells.push({ col: t.col, row: t.row, type: 'TREE', color: t.tint });
  }
  for (const col of [c0 - 1, c0, c0 + 1]) {
    cells.push({ col, row: N - 1, type: 'ROOM_EXIT', exit: { destination: 'shadow_realm' } });
  }

  return { size: N, cells, trees, ring, flowers, lamps, strings, bulbs, path, circle, start };
}
