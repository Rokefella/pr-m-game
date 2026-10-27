import { beforeEach, describe, expect, it } from 'vitest';
import { cellDistance, emptyRunEffects, inReveal, isStepMechanic, isCreditMechanic, mechanicBlocked, nearestFragment, normalizeRunEffects, restoreChalk } from './mechanics';
describe('mechanic rules', () => {
  beforeEach(() => sessionStorage.clear());
  it.each([
    ['Cloth bundle', 60], ['Tin box', 80], ['Knotted pouch', 100], ['Moss bundle', 120],
    ['Old pack', 80], ['Satchel', 100], ['High-tied bundle', 150], ['Wax-sealed jar', 100],
  ])('%s uses its authored steps:+%i effect without a run', (name, amount) => {
    expect(isStepMechanic({ name, effect: `steps:+${amount}` })).toBe(true);
    expect(mechanicBlocked(isStepMechanic({ name, effect: `steps:+${amount}` }), 100)).toBe('');
    expect(isStepMechanic({ name, effect: 'lantern:+1' })).toBe(false);
  });
  it.each([['A few old coins', 10], ['Purse', 15]])('%s is usable anywhere even with full steps', (_name, amount) => {
    expect(isCreditMechanic({ effect: `credits:+${amount}` })).toBe(true);
    expect(isCreditMechanic({ effect: 'loot:tier_up' })).toBe(false);
    expect(mechanicBlocked(false, 5000, undefined, true)).toBe('');
  });
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