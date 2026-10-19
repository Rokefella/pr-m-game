import { describe, expect, it } from 'vitest';
import { generateGarden } from './generateGarden';
import { GARDEN_SIZE, type GardenConfig } from './gardenConfig';

const cfg: GardenConfig = { season: 'autumn', seed: 1010, size: GARDEN_SIZE, special: null };

describe('generateGarden', () => {
  it('is deterministic for the same config', () => {
    const a = generateGarden(cfg);
    const b = generateGarden(cfg);
    expect(a.cells).toEqual(b.cells);
    expect(a.trees).toEqual(b.trees);
    expect(a.flowers).toEqual(b.flowers);
  });

  it('rings the garden with hedge except a 3-wide entrance gap at the bottom', () => {
    const g = generateGarden(cfg);
    const N = g.size;
    const c0 = Math.floor(N / 2);
    const ringSet = new Set(g.ring.map((h) => `${h.col},${h.row}`));
    expect(ringSet.has('0,0')).toBe(true);
    expect(ringSet.has(`${N - 1},${N - 1}`)).toBe(true);
    for (const col of [c0 - 1, c0, c0 + 1]) {
      expect(ringSet.has(`${col},${N - 1}`)).toBe(false);
      expect(ringSet.has(`${col},${N - 2}`)).toBe(false);
    }
  });

  it('places three ROOM_EXIT cells to the shadow realm at the entrance', () => {
    const g = generateGarden(cfg);
    const exits = g.cells.filter((c) => c.type === 'ROOM_EXIT');
    expect(exits).toHaveLength(3);
    for (const e of exits) {
      expect(e.row).toBe(g.size - 1);
      expect(e.exit?.destination).toBe('shadow_realm');
    }
  });

  it('keeps trees off the path, circle and start, and spaced apart', () => {
    const g = generateGarden(cfg);
    const pathSet = new Set(g.path.map((p) => `${p.col},${p.row}`));
    for (const t of g.trees) {
      expect(pathSet.has(`${t.col},${t.row}`)).toBe(false);
      expect(Math.hypot(t.col - g.circle.cx, t.row - g.circle.cy)).toBeGreaterThan(g.circle.r + 3 - 1e-9);
      expect(Math.hypot(t.col - g.start.col, t.row - g.start.row)).toBeGreaterThan(4 - 1e-9);
    }
    for (let i = 0; i < g.trees.length; i++) {
      for (let j = i + 1; j < g.trees.length; j++) {
        const d = Math.max(Math.abs(g.trees[i].col - g.trees[j].col), Math.abs(g.trees[i].row - g.trees[j].row));
        expect(d).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('spawns the player near the entrance, on an open cell', () => {
    const g = generateGarden(cfg);
    expect(g.start).toEqual({ col: Math.floor(g.size / 2), row: g.size - 5 });
    const solid = new Set(g.cells.filter((c) => c.type === 'TREE').map((c) => `${c.col},${c.row}`));
    expect(solid.has(`${g.start.col},${g.start.row}`)).toBe(false);
  });

  it('overrides lights and particle for the christmas special', () => {
    const g = generateGarden({ ...cfg, season: 'winter', special: 'christmas' });
    const allowed = new Set(['#ff3b3b', '#2fe07a', '#ffd24a', '#ffffff']);
    for (const bs of g.bulbs) for (const b of bs) expect(allowed.has(b.color)).toBe(true);
  });
});
