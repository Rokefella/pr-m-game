import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: f.rpc } }));
import FindsProgress from './FindsProgress';
afterEach(cleanup);
it('lists rings in order from finds_progress, hides empty rings and golds complete ones', async () => {
  f.rpc.mockResolvedValue({ data: [{ ring: 2, name: 'Water', found: 5, total: 5 }, { ring: 1, name: 'Fire', found: 12, total: 249 }, { ring: 3, name: 'Air', found: 0, total: 0 }], error: null });
  render(<FindsProgress />);
  const items = await screen.findAllByRole('listitem');
  expect(items.map(i => i.textContent)).toEqual(['Fire 12/249', 'Water 5/5']);
  expect(items[1]).toHaveAttribute('data-complete'); expect(items[0]).not.toHaveAttribute('data-complete');
  expect(f.rpc).toHaveBeenCalledWith('finds_progress');
});
