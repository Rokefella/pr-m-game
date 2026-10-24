import { beforeEach, describe, expect, it } from 'vitest';
import { cellDistance, emptyRunEffects, inReveal, isStepMechanic, mechanicBlocked, nearestFragment, normalizeRunEffects, restoreChalk } from './mechanics';
describe('mechanic rules', () => {
  beforeEach(() => sessionStorage.clear());
  it.each(['Step Pouch', 'Spare Lace', 'Second Wind'])('%s is usable outside a run', name => {
    expect(isStepMechanic({ name })).toBe(true);
    expect(mechanicBlocked(isStepMechanic({ name }), 4999)).toBe('');
  });
  it('blocks steps at the 5000 cap', () => { expect(mechanicBlocked(true, 5000)).toBeTruthy(); expect(mechanicBlocked(true, 4999)).toBe(''); });
  it.each(['Lantern Oil', 'Trail Chalk', 'Echo Pebble', 'Lucky Coin', 'Map Scrap', 'Compass Shard', 'Magnet Charm'])('%s requires a maze run', name => {
    expect(isStepMechanic({ name })).toBe(false);
    expect(mechanicBlocked(false, 100)).toBeTruthy();
    expect(mechanicBlocked(false, 100, { level: 2, position: () => ({ col: 1, row: 1 }) })).toBe('');
  });
  it('caps lantern bonuses at four additional cells', () => expect(normalizeRunEffects({ lantern_bonus: 9 }).lantern_bonus).toBe(4));
  it('reveals exactly a nine by nine square for radius four', () => {
    let count = 0;
    for (let row = 0; row < 20; row++) for (let col = 0; col < 20; col++) if (inReveal({ col, row }, [{ col: 10, row: 10, r: 4 }])) count++;
    expect(count).toBe(81);
    expect(inReveal({ col: 15, row: 10 }, [{ col: 10, row: 10, r: 4 }])).toBe(false);
  });
  it('finds only the nearest uncollected fragment', () => expect(nearestFragment([{ col: 0, row: 1, prime: 2 }, { col: 0, row: 2, prime: 3 }, { col: 0, row: 3, prime: 5 }], new Set([2]), { col: 0, row: 0 })?.prime).toBe(3));
  it('uses a three-cell radial proximity', () => { expect(cellDistance({ col: 0, row: 0 }, { col: 3, row: 0 })).toBe(3); expect(cellDistance({ col: 0, row: 0 }, { col: 3, row: 3 })).toBeGreaterThan(3); });
  it('restores chalk only on resume and clears it on fresh entry', () => {
    sessionStorage.setItem('praem_chalk_2', '["1,1","2,1"]');
    expect([...restoreChalk(2, true)]).toEqual(['1,1', '2,1']);
    expect(restoreChalk(2, false).size).toBe(0);
    expect(sessionStorage.getItem('praem_chalk_2')).toBeNull();
  });
  it('starts with every run effect cleared', () => expect(normalizeRunEffects(null)).toEqual(emptyRunEffects()));
});