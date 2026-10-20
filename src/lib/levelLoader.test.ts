import { describe, expect, it, vi } from 'vitest';
import { loadLevelFromSupabase } from './levelLoader';
vi.mock('@/lib/supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: {
  grid_size: 15, data: { gridSize: 15, corridors: [{ col: 1, row: 1 }], start: { col: 1, row: 1 }, goldenDoor: { col: 2, row: 1 }, extraCells: [{ col: 7, row: 5, type: 'CONSOLE_DOOR' }, { col: 8, row: 5, type: 'DROP' }] },
}, error: null }) }) }) }) } }));
describe('console entrance geometry', () => {
  it.each([['purple', '7,5'], ['amber', '5,7'], ['teal', '9,7']] as const)('makes the authored door walkable in %s without opening decorative drops', async (dimension, key) => {
    const level = await loadLevelFromSupabase(1, dimension);
    expect(level?.openSet.has(key)).toBe(true);
    expect(level?.specialSet.has(key)).toBe(true);
    const door = level?.visualCells?.find(cell => cell.type === 'CONSOLE_DOOR');
    expect(`${door?.col},${door?.row}`).toBe(key);
    const drop = level?.visualCells?.find(cell => cell.type === 'DROP');
    expect(level?.openSet.has(`${drop?.col},${drop?.row}`)).toBe(false);
  });
});