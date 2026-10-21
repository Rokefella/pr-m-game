import { describe, expect, it } from 'vitest';
import { advanceGhost, corridorCell, createGhostMotion, ghostPatrol, ghostShortestPath, reachableGhostCells, GHOST_RANGE, GHOST_SPEED } from './ghostMotion';

describe('Ghost home range and collision', () => {
  it('uses five BFS steps and never crosses blocked cells', () => {
    const cells = reachableGhostCells({ col: 0, row: 0 }, (c, r) => c >= 0 && r >= 0 && c !== 2);
    expect(GHOST_RANGE).toBe(5);
    expect(cells.has('1,4')).toBe(true);
    expect(cells.has('1,5')).toBe(false);
    expect(cells.has('2,0')).toBe(false);
    expect(cells.has('3,0')).toBe(false);
  });
  it('chooses shortest reachable routes around an obstacle', () => {
    const cells = reachableGhostCells({ col: 0, row: 0 }, (c, r) => c >= 0 && c <= 2 && r >= 0 && r <= 1 && !(c === 1 && r === 0));
    expect(ghostShortestPath({ col: 0, row: 0 }, { col: 2, row: 0 }, cells)).toEqual([
      { col: 0, row: 0 }, { col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 2, row: 0 },
    ]);
  });
});
describe('Path patrol classification', () => {
  it('distinguishes narrow corridors and junctions from open ground', () => {
    expect(corridorCell(0, 0, (_c, r) => r === 0)).toBe(true);
    expect(corridorCell(0, 0, (c, r) => r === 0 || c === 0)).toBe(true);
    expect(corridorCell(0, 0, () => true)).toBe(false);
  });
  it('uses the longer straight run at a corner/junction, capped five cells each side', () => {
    const free = () => true;
    const street = (c: number, r: number) => r === 0 || (c === 0 && Math.abs(r) <= 2);
    const run = ghostPatrol({ col: 0, row: 0 }, free, street);
    expect(run?.length).toBe(11);
    expect(run?.[0]).toEqual({ col: -5, row: 0 });
    expect(run?.[10]).toEqual({ col: 5, row: 0 });
    expect(ghostPatrol({ col: 1, row: 1 }, free, street)).toBeNull();
  });
});
describe('Ref-owned ghost movement', () => {
  it('moves at 1.2 cells per second, pauses 1.5s at patrol ends and reverses', () => {
    const m = createGhostMotion({ col: 0, row: 0 }, (_c, r) => r === 0, (_c, r) => r === 0, () => 0);
    expect(GHOST_SPEED).toBe(1.2);
    m.remaining = 0;
    advanceGhost(m, .5, () => 0);
    expect(m.position.col).toBeCloseTo(.6);
    advanceGhost(m, 4, () => 0);
    expect(m.position.col).toBe(5);
    expect(m.remaining).toBe(1.5);
    advanceGhost(m, 1.5, () => 0);
    advanceGhost(m, 1, () => 0);
    expect(m.position.col).toBeCloseTo(3.8);
  });
  it('wanders at least two cells away and waits one to three seconds on arrival', () => {
    const m = createGhostMotion({ col: 0, row: 0 }, () => true, undefined, () => 0);
    expect(m.remaining).toBe(2);
    m.remaining = 0;
    advanceGhost(m, .01, () => 0);
    const end = m.route.at(-1);
    expect(Math.hypot(end?.col ?? 0, end?.row ?? 0)).toBeGreaterThanOrEqual(2);
    advanceGhost(m, 10, () => .5);
    expect(m.remaining).toBe(2);
    expect(Math.abs(m.position.col) + Math.abs(m.position.row)).toBeLessThanOrEqual(5);
  });
});