import { describe, expect, it } from 'vitest';
import { fragmentInventory } from './carriedFragments';

describe('carried Folder inventory', () => {
  it('counts one carried row separately from five banked rows', () => {
    const rows = [
      ...Array.from({ length: 5 }, (_, i) => ({ id: `banked-${i}`, banked: true })),
      { id: 'carried', banked: false },
    ];
    const inventory = fragmentInventory(rows);
    expect(inventory.carried.map(row => row.id)).toEqual(['carried']);
    expect(inventory.bankedCount).toBe(5);
    expect(rows).toHaveLength(6);
  });
  it('does not treat unknown banking status as carried or banked', () => {
    expect(fragmentInventory([{ banked: null }, {}])).toEqual({ carried: [], bankedCount: 0 });
  });
});