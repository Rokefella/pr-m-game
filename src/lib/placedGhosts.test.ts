import { describe, expect, it } from 'vitest';
import { GHOST_COOLDOWN, SPAWN_RADIUS, nearbyGhostLine, placedGhosts, randomSpawnCell, ghostPositions } from './placedGhosts';

describe('Authored spawn cells', () => {
  it('limits all candidates to Euclidean radius four and the existing free test', () => {
    const checked: [number, number][] = [];
    expect(SPAWN_RADIUS).toBe(4);
    const pick = randomSpawnCell({ col: 10, row: 10 }, (c, r) => { checked.push([c, r]); return c === 14 && r === 10; }, () => 0);
    expect(pick).toEqual({ col: 14, row: 10 });
    expect(checked.every(([c, r]) => Math.hypot(c - 10, r - 10) <= 4)).toBe(true);
    expect(checked).not.toContainEqual([14, 14]);
  });
  it('rerolls per arrival and returns null for the existing fallback when no cell qualifies', () => {
    const free = (c: number, r: number) => r === 0 && (c === 0 || c === 1);
    expect(randomSpawnCell({ col: 0, row: 0 }, free, () => 0)).toEqual({ col: 0, row: 0 });
    expect(randomSpawnCell({ col: 0, row: 0 }, free, () => .99)).toEqual({ col: 1, row: 0 });
    expect(randomSpawnCell({ col: 0, row: 0 }, () => false)).toBeNull();
  });
});
describe('Ghost proximity lines', () => {
  const ghosts = placedGhosts([{ type: 'GHOST', col: 4, row: 4, line: 'Remember.' }, { type: 'NPC', col: 5, row: 5 }]);
  it('whispers within one cell only', () => {
    expect(nearbyGhostLine(ghosts, 5, 5, new Map(), 0)).toBeNull();
    expect(nearbyGhostLine(ghosts, 5, 4, new Map(), 0)).toBe('Remember.');
  });
  it('blocks repeats for exactly thirty seconds', () => {
    const cooldowns = new Map<string, number>();
    expect(GHOST_COOLDOWN).toBe(30_000);
    expect(nearbyGhostLine(ghosts, 4, 4, cooldowns, 0)).toBe('Remember.');
    expect(nearbyGhostLine(ghosts, 4, 4, cooldowns, 29_999)).toBeNull();
    expect(nearbyGhostLine(ghosts, 4, 4, cooldowns, 30_000)).toBe('Remember.');
  });
  it('measures proximity to the wandering position instead of home', () => {
    const ghost = { type: 'GHOST' as const, col: 4, row: 4, line: 'Remember.' };
    ghostPositions.set(ghost, { col: 7, row: 4 });
    expect(nearbyGhostLine([ghost], 4, 4, new Map(), 0)).toBeNull();
    expect(nearbyGhostLine([ghost], 7, 4, new Map(), 0)).toBe('Remember.');
    ghostPositions.delete(ghost);
  });
});