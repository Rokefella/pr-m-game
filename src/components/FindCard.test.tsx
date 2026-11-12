import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import FindCard from './FindCard';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase', () => ({ supabase: { rpc } }));
afterEach(cleanup);
it('reading the full claimed note never grants another item', async () => {
  render(<FindCard find={{ id: 'note', find_key: 'note', x: 1, y: 1, layer: 0, kind: 'words', title: 'A note', text: 'All of the carved words.', visibility: 'glint' }} />);
  await screen.findByText('All of the carved words.');
  expect(rpc).not.toHaveBeenCalled();
});
