import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PraemWall from './PraemWall';
import PraemMarket from './PraemMarket';
import { PraemTreasure } from './PraemTreasure';
import type { Praem } from '@/lib/praems';
const api = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: api.rpc } }));
vi.mock('@/lib/worldDiscovery', () => ({ WorldDiscovery: class { ready = Promise.resolve(); reveal() {} async flush() {} dispose() {} } }));
const items: Praem[] = [{ maze: 1, state: 'asleep', name: 'Ember', icon_svg: null }, { maze: 2, state: 'set', name: 'Spark', icon_svg: null, sell_price: 20 }, { maze: 3, state: 'sold', name: 'Ash', icon_svg: null }, { maze: 30, state: 'set', name: 'Threshold', icon_svg: null, sell_price: 99 }];
beforeEach(() => { api.rpc.mockReset(); }); afterEach(cleanup);
it('treasure does not mount beyond two cells', () => {
  const view = render(<PraemTreasure cell={{ col: 5, row: 5 }} player={{ col: 2, row: 5 }} tone="Fire" />);
  expect(screen.queryByLabelText('Præm treasure')).toBeNull();
  view.rerender(<PraemTreasure cell={{ col: 5, row: 5 }} player={{ col: 3, row: 5 }} tone="Fire" />);
  expect(screen.getByLabelText('Præm treasure')).toBeInTheDocument();
});
it('Wall renders thirty sockets with sleeping, set, sold and unnamed empty states', () => {
  render(<PraemWall items={items} userId="player" onClose={() => undefined} onTravel={() => undefined} />);
  expect(screen.getAllByRole('button', { name: /Empty socket|, asleep|, set|, sold/ })).toHaveLength(30);
  fireEvent.click(screen.getByRole('button', { name: 'Ember, asleep' })); screen.getByText('Bank it to set it.');
  fireEvent.click(screen.getByRole('button', { name: 'Ash, sold' })); screen.getByText('Sold to the Banker');
});
it('Wall gives a quiet closed-rift message and never leaves on not_set', async () => {
  api.rpc.mockResolvedValue({ data: { ok: false, reason: 'not_set' }, error: null }); const leave = vi.fn();
  render(<PraemWall items={items} userId="player" onClose={() => undefined} onTravel={leave} />);
  fireEvent.click(screen.getByRole('button', { name: 'Spark, set' })); fireEvent.click(screen.getByRole('button', { name: 'Step through' }));
  await screen.findByText('The way is closed.'); expect(leave).not.toHaveBeenCalled();
});
it('sale requires confirmation, updates credits/catalogue and Threshold has no sell button', async () => {
  let sold = false; api.rpc.mockImplementation(async (fn: string) => ({ error: null, data: fn === 'my_praems' ? items.map(p => sold && p.maze === 2 ? { ...p, state: 'sold' } : p) : fn === 'praem_market_list' ? [] : (sold = true, { ok: true, earned: 20, credits: 70 }) }));
  const credits = vi.fn(); render(<PraemMarket userId="player" credits={50} onCredits={credits} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sell for 20' }));
  expect(api.rpc).not.toHaveBeenCalledWith('sell_praem', expect.anything());
  expect(screen.queryByRole('button', { name: 'Sell for 99' })).toBeNull();
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /^Sell$/ }));
  await waitFor(() => expect(credits).toHaveBeenCalledWith(70));
  expect(api.rpc).toHaveBeenCalledWith('sell_praem', { p_maze: 2 });
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Sell for 20' })).toBeNull());
});
it('buy updates credits and refetches the already-set Præm', async () => {
  let bought = false; api.rpc.mockImplementation(async (fn: string) => ({ error: null, data: fn === 'my_praems' ? bought ? items : [] : fn === 'praem_market_list' ? [{ id: 'offer', maze: 2, name: 'Spark', icon_svg: null, price: 30, owned: bought }] : (bought = true, { ok: true, paid: 30, credits: 20 }) }));
  const credits = vi.fn(); render(<PraemMarket userId="player" credits={50} onCredits={credits} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Buy' })); await waitFor(() => expect(credits).toHaveBeenCalledWith(20));
  expect(api.rpc).toHaveBeenCalledWith('buy_praem', { p_listing: 'offer' });
  expect(await screen.findByRole('button', { name: 'You have one' })).toBeDisabled();
});