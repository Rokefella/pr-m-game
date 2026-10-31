import { beforeEach, expect, it, vi } from 'vitest';
import { readWorldPlayers } from './worldPlayers';
import { publicPlayers } from './publicPlayers';
const f = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: f }));
beforeEach(() => {
  const chain = { select: () => chain, eq: () => chain, gte: async () => ({ data: [{ user_id: 'other', x: 1, y: 2, avatar_body: 'stale', username: 'stale' }], error: null }) };
  f.from.mockReset().mockImplementation((table) => { if (table !== 'player_positions') throw Error('private read'); return chain; });
  f.rpc.mockReset().mockResolvedValue({ data: [{ id: 'other', username: 'Public name', title: 'Explorer', avatar_body: 'visitor', orb_dye: null }], error: null });
});
it('uses public_players for labels AND appearance, never users', async () => {
  expect(await readWorldPlayers()).toEqual([expect.objectContaining({ user_id: 'other', username: 'Public name', title: 'Explorer', avatar_body: 'visitor' })]);
  expect(f.rpc).toHaveBeenCalledWith('public_players', { p_ids: ['other'] });
  expect(f.from.mock.calls).toEqual([['player_positions']]);
});
it('does not expose a presence identity when public_players refuses it', async () => {
  f.rpc.mockResolvedValue({ error: Error('denied'), data: null });
  expect(await readWorldPlayers()).toEqual([]);
});
it('deduplicates Exchange seller IDs and never requests an unbounded player list', async () => {
  await publicPlayers(['seller', 'seller']);
  expect(f.rpc).toHaveBeenCalledWith('public_players', { p_ids: ['seller'] });
  f.rpc.mockClear(); expect(await publicPlayers([])).toEqual([]); expect(f.rpc).not.toHaveBeenCalled();
});