import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: f.rpc } }));
import NellSets from './NellSets';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const sets = [
  { set_key: 'a', name: 'Shells', pays: 30, complete: true, items: [{ drop_key: 's', name: 'Shell', icon_svg: null, need: 2, have: 2 }] },
  { set_key: 'b', name: 'Stones', pays: 50, complete: false, items: [{ drop_key: 't', name: 'Stone', icon_svg: null, need: 2, have: 1 }] },
];
it('offers Hand them over only on complete sets and sells through sell_set', async () => {
  f.rpc.mockImplementation(async (fn: string) => fn === 'my_sets' ? { data: sets, error: null } : { data: { ok: true, earned: 30, credits: 130 }, error: null });
  const heard = vi.fn(); window.addEventListener('praem:user-credits-refreshed', heard);
  render(<NellSets userId="u" />);
  await screen.findByText('Shells');
  expect(screen.getAllByRole('button', { name: 'Hand them over' })).toHaveLength(1);
  expect(screen.getByText('1/2')).toBeInTheDocument(); expect(screen.getByText('30 credits')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Hand them over' }));
  await screen.findByText('+30 credits');
  expect(f.rpc).toHaveBeenCalledWith('sell_set', { p_set: 'a' });
  await waitFor(() => expect(f.rpc.mock.calls.filter(c => c[0] === 'my_sets')).toHaveLength(2));
  expect(heard).toHaveBeenCalled();
});
