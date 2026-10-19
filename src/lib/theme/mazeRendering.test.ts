import { describe, expect, it } from 'vitest';
import { MAZE_VIGNETTE, pylonCells } from './mazeRendering';

describe('Maze rendering rules', () => {
  it('caps edge darkness at 35 percent', () => expect(MAZE_VIGNETTE).toBe(0.35));
  it('places pylons only at the deterministic formula with walkable cells below', () => {
    const walls = new Set(Array.from({ length: 60 }, (_, col) => `${col},2`));
    const open = new Set(Array.from({ length: 60 }, (_, col) => `${col},3`));
    expect([...pylonCells(60, 5, walls, open)]).toEqual(['1,2', '12,2', '23,2', '34,2', '45,2', '56,2']);
    open.delete('23,3');
    expect(pylonCells(60, 5, walls, open).has('23,2')).toBe(false);
  });
  it('has at most one pylon per five consecutive wall cells', () => {
    const walls = new Set(Array.from({ length: 80 }, (_, col) => `${col},0`));
    const open = new Set(Array.from({ length: 80 }, (_, col) => `${col},1`));
    const fixtures = pylonCells(80, 2, walls, open);
    for (let start = 0; start <= 75; start++) {
      const count = Array.from({ length: 5 }, (_, offset) => fixtures.has(`${start + offset},0`)).filter(Boolean).length;
      expect(count).toBeLessThanOrEqual(1);
    }
  });
});