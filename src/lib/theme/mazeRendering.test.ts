import { describe, expect, it } from 'vitest';
import { pylonCells } from './mazeRendering';

describe('Maze rendering rules', () => {
  it('places pylons only at the deterministic formula with walkable cells below', () => {
    const walls = new Set(Array.from({ length: 60 }, (_, col) => `${col},2`));
    const open = new Set(Array.from({ length: 60 }, (_, col) => `${col},3`));
    expect([...pylonCells(60, 5, walls, open)]).toEqual(['17,2', '46,2']);
    open.delete('17,3');
    expect(pylonCells(60, 5, walls, open).has('17,2')).toBe(false);
  });
  it('has at most one pylon per eight consecutive wall cells', () => {
    const walls = new Set(Array.from({ length: 80 }, (_, col) => `${col},0`));
    const open = new Set(Array.from({ length: 80 }, (_, col) => `${col},1`));
    const fixtures = pylonCells(80, 2, walls, open);
    for (let start = 0; start <= 72; start++) {
      const count = Array.from({ length: 8 }, (_, offset) => fixtures.has(`${start + offset},0`)).filter(Boolean).length;
      expect(count).toBeLessThanOrEqual(1);
    }
  });
});