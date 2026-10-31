import { describe, expect, it, vi } from 'vitest';
import { merchantItems, loadTraderItems } from './merchantItems';
const api = vi.hoisted(() => ({ stock: vi.fn(), buy: vi.fn(), refresh: vi.fn(), changed: vi.fn() }));
vi.mock('./serverGame', () => ({ traderStock: api.stock, buyTraderItem: api.buy }));
vi.mock('./carriedDrops', () => ({ refreshDrops: api.refresh }));
vi.mock('./inventoryEvents', () => ({ inventoryChanged: api.changed }));
describe('shared merchant', () => {
  it('keeps only 500 steps for 5 credits in World at any level', () => {
    const buy = vi.fn(); const items = merchantItems(20, 'world', buy);
    expect(items.map(i => [i.key, i.label, i.cost])).toEqual([['steps', '500 Steps', 5]]);
    items[0].onPurchase?.(1); expect(buy).toHaveBeenCalledOnce();
  });
  it('retains Village level-gated items', () => {
    expect(merchantItems(1, 'village', vi.fn()).map(i => i.key)).toEqual(['steps', 'visibility']);
    expect(merchantItems(15, 'village', vi.fn()).map(i => i.key)).toEqual(['steps', 'visibility', 'detector', 'primemap', 'pastmaze']);
  });
});
describe('conditional trader stock', () => {
  it('does not invent stock when the server list is empty', async () => {
    api.stock.mockResolvedValue([]);
    expect(await loadTraderItems('player')).toEqual([]);
  });
  it('buys stock by key, uses returned credits and refreshes Folder', async () => {
    api.stock.mockResolvedValue([{ key: 'traded_spice', label: "Trader's spice", cost: 40 }]);
    api.buy.mockResolvedValue({ ok: true, credits: 83, name: "Trader's spice" });
    const items = await loadTraderItems('player');
    expect(items.map(i => [i.key, i.cost, i.serverSide])).toEqual([['traded_spice', 40, true]]);
    expect(await items[0].onPurchase?.(1)).toEqual({ receipt: "Trader's spice. He wraps it in paper.", credits: 83 });
    expect(api.buy).toHaveBeenCalledWith('traded_spice');
    expect(api.refresh).toHaveBeenCalledWith('player');
    expect(api.changed).toHaveBeenCalled();
  });
  it.each([
    ['not_sold', 'Not today.'], ['not_now', 'Not today.'],
    ['already_have', 'You have one already.'], ['not_enough_credits', 'Not enough credits.'],
  ])('handles %s without refreshing inventory', async (reason, failure) => {
    api.refresh.mockClear(); api.changed.mockClear();
    api.stock.mockResolvedValue([{ key: 'traded_spice', label: "Trader's spice", cost: 40 }]);
    api.buy.mockResolvedValue({ ok: false, reason });
    const items = await loadTraderItems('player');
    expect(await items[0].onPurchase?.(1)).toEqual({ failure });
    expect(api.refresh).not.toHaveBeenCalled(); expect(api.changed).not.toHaveBeenCalled();
  });
});
