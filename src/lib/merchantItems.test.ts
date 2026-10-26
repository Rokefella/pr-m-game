import { describe, expect, it, vi } from 'vitest';
import { merchantItems } from './merchantItems';
describe('shared merchant', () => {
  it('keeps only 500 steps for 5 credits in World at any level', () => {
    const buy = vi.fn(); const items = merchantItems(20, 'world', buy);
    expect(items.map(i => [i.key, i.label, i.cost])).toEqual([['steps', '500 Steps', 5]]);
    items[0].onPurchase?.(); expect(buy).toHaveBeenCalledOnce();
  });
  it('retains Village level-gated items', () => {
    expect(merchantItems(1, 'village', vi.fn()).map(i => i.key)).toEqual(['steps', 'visibility']);
    expect(merchantItems(15, 'village', vi.fn()).map(i => i.key)).toEqual(['steps', 'visibility', 'detector', 'primemap', 'pastmaze']);
  });
});
