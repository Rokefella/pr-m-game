import { describe, expect, it } from 'vitest';
import { canLetGo, canSell, clampCount, letGoQuestion, saleReceipt } from './letGo';
import { isHiddenPlace, shouldMarkMerchantMet, showWhenMatches, visiblePlaces } from './worldSam';

describe('letting go and selling', () => {
  it('refuses key, tool, words, skin and sigil items', () => {
    for (const category of ['key', 'tool', 'words', 'skin', 'sigil']) expect(canLetGo({ category })).toBe(false);
    expect(canLetGo({ category: 'mechanic' })).toBe(true);
  });
  it('sells only valued, releasable items', () => {
    expect(canSell({ category: 'mechanic', value: 3 })).toBe(true);
    expect(canSell({ category: 'mechanic', value: 0 })).toBe(false);
    expect(canSell({ category: 'tool', value: 9 })).toBe(false);
  });
  it('counts stay between 1 and the stack size', () => { expect(clampCount(0, 5)).toBe(1); expect(clampCount(9, 5)).toBe(5); });
  it('asks and receipts in plain words', () => {
    expect(letGoQuestion(3, 'Moss bundle')).toBe('Leave 3 × Moss bundle behind?');
    expect(saleReceipt(6)).toBe('+6 credits');
  });
});

describe('show_when flags and the wandering trader', () => {
  const trader = { name: 'Wandering trader', action: 'merchant', npc_key: null, show_when: { min_completed_level: 1, flag_absent: 'met_lumen_merchant' } };
  it('flag_absent hides the place once the flag has any value', () => {
    expect(showWhenMatches(trader.show_when, 1, {})).toBe(true);
    expect(showWhenMatches(trader.show_when, 1, { met_lumen_merchant: '1' })).toBe(false);
    expect(showWhenMatches(trader.show_when, 0, {})).toBe(false);
  });
  it('flag shows the place only when set', () => {
    expect(showWhenMatches({ flag: 'x' }, 0, {})).toBe(false);
    expect(showWhenMatches({ flag: 'x' }, 0, { x: '1' })).toBe(true);
  });
  it('the trader leaves the world after meeting the Lumen merchant', () => {
    expect(visiblePlaces([trader], 1, 0, {})).toHaveLength(1);
    expect(visiblePlaces([trader], 1, 0, { met_lumen_merchant: '1' })).toHaveLength(0);
  });
  it('only the Lumen merchant marks the meeting, once', () => {
    expect(shouldMarkMerchantMet({ name: 'Lumen: merchant', action: 'merchant' }, {})).toBe(true);
    expect(shouldMarkMerchantMet({ name: 'Lumen: merchant', action: 'merchant' }, { met_lumen_merchant: '1' })).toBe(false);
    expect(shouldMarkMerchantMet(trader, {})).toBe(false);
    expect(isHiddenPlace(trader)).toBe(true);
  });
});
