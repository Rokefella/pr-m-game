import { describe, expect, it } from 'vitest';
import { exitDir, roomGeometry, toRuns } from './roomGeometry';
import { roomCamAxis } from './roomConfig';

describe('room geometry', () => {
  it('keeps the console footprint on deck floor', () => {
    expect(roomGeometry([{ col: 7, row: 5, type: 'CONSOLE' }], 15).floorRuns).toEqual([{ row: 5, col: 7, n: 1 }]);
  });
  it('merges consecutive cells of a row into one run', () => {
    expect(toRuns(['0,0', '1,0', '2,0', '4,0'])).toEqual([{ row: 0, col: 0, n: 3 }, { row: 0, col: 4, n: 1 }]);
  });
  it('rings absent in-grid cells around non-wall cells with implicit walls', () => {
    const g = roomGeometry([{ col: 1, row: 1, type: 'OPEN' }], 3);
    expect(g.implicitWalls).toHaveLength(8);
    expect(g.floorRuns).toEqual([{ row: 1, col: 1, n: 1 }]);
  });
  it('adds no implicit walls when the grid is complete', () => {
    const cells = [] as { col: number; row: number; type: string }[];
    for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) cells.push({ col: c, row: r, type: c === 1 && r === 1 ? 'OPEN' : 'WALL' });
    expect(roomGeometry(cells, 3).implicitWalls).toEqual([]);
  });
  it('never places implicit walls outside the grid', () => {
    expect(roomGeometry([{ col: 0, row: 0, type: 'OPEN' }], 2).implicitWalls).toHaveLength(3);
  });
  it('points exits toward their edge', () => {
    expect(exitDir(5, 0, 12)).toBe('up'); expect(exitDir(5, 11, 12)).toBe('down');
    expect(exitDir(0, 5, 12)).toBe('left'); expect(exitDir(11, 5, 12)).toBe('right'); expect(exitDir(5, 5, 12)).toBe('down');
  });
  it('centres a small zoomed room and clamps a large one', () => {
    expect(roomCamAxis(200, 100, 812, 1.5)).toBe((812 - 300) / 2);
    expect(roomCamAxis(1000, 0, 375, 1.5)).toBe(0);
    expect(roomCamAxis(1000, 1000, 375, 1.5)).toBe(375 - 1500);
  });
});
