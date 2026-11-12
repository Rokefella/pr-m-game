import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProfileOverlay from './ProfileOverlay';
const api = vi.hoisted(() => ({ user: { id: 'player' }, rpc: vi.fn(), drops: [
  { id: 'new', drop_key: 'new', name: 'New words', category: 'words', description: 'The full new text.', acquired_at: '2026-11-12', carried: false },
  { id: 'flint', drop_key: 'flint', name: 'Flint chip', category: 'curio', carried: false },
  { id: 'old', drop_key: 'old', name: 'Old words', category: 'words', description: 'The full old text.', acquired_at: '2026-11-11', carried: false },
] }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: api.user, loading: false }) }));
vi.mock('@/lib/carriedDrops', async original => ({ ...await original<object>(), readOwnedDrops: async () => api.drops }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: api.rpc, from: () => {
  const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: { username: 'Rob', credits: 100, level: 1, trade: 0 } }), then: (fn: (v: unknown) => unknown) => Promise.resolve({ data: [] }).then(fn) }; return chain;
} } }));
vi.mock('@/lib/questFlags', () => ({ getFlag: () => '0' }));
vi.mock('@/hooks/usePaths', () => ({ usePaths: () => [] }));
vi.mock('@/components/Wardrobe', () => ({ default: () => null }));
vi.mock('@/components/PlayerAvatar', () => ({ default: () => null, orbLook: () => ({}) }));
beforeEach(() => { localStorage.clear(); api.rpc.mockResolvedValue({ data: [{ maze: 1, found: true, name: 'Fire', icon_svg: null }], error: null }); });
afterEach(cleanup);
const open = async (context: 'maze' | 'village') => {
  render(<MemoryRouter><ProfileOverlay isOpen onClose={() => undefined} context={context} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'FOLDER' }));
  await screen.findByText('Fire');
};
it('Folder has exactly 30 Præm slots from my_praems', async () => {
  await open('village'); expect(api.rpc).toHaveBeenCalledWith('my_praems');
  const section = screen.getByRole('region', { name: 'Præms' });
  expect(within(section).getAllByLabelText(/Empty Præm slot/)).toHaveLength(29);
  expect(within(section).getByLabelText('Fire')).toBeInTheDocument();
});
it('words do not consume drop capacity and appear with their full text in found order', async () => {
  await open('village');
  await waitFor(() => expect(screen.getByText('1 / 20')).toBeInTheDocument());
  expect(screen.queryByRole('button', { name: /words ×/ })).toBeNull();
  const notebook = screen.getByRole('region', { name: 'Notebook' });
  expect(within(notebook).getByText('The full new text.')).toBeInTheDocument();
  expect(within(notebook).getAllByRole('heading').map(h => h.textContent)).toEqual(['Old words', 'New words']);
});
it.each(['village', 'maze'] as const)('fragments and Library are restricted to maze context (%s)', async context => {
  await open(context);
  expect(Boolean(screen.queryByText('FRAGMENTS'))).toBe(context === 'maze');
  expect(Boolean(screen.queryByText(/LIBRARY .* banked/))).toBe(context === 'maze');
});