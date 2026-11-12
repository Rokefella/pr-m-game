import { beforeEach, expect, it, vi } from 'vitest';
import { canSellPraem, praemSockets, praemVisible, praemNearby, travelPraem } from './praems';
const api = vi.hoisted(() => ({ rpc: vi.fn(), reveal: vi.fn(), flush: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: api.rpc } }));
vi.mock('./worldDiscovery', () => ({ WorldDiscovery: class { ready = Promise.resolve(); reveal = api.reveal; flush = api.flush; dispose() {} } }));
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.clearAllMocks(); api.flush.mockResolvedValue(undefined); });
it('Præm crate is hidden beyond two cells and shows within two; hum stops beyond four', () => {
  expect(praemVisible({ col: 1, row: 1 }, { col: 4, row: 1 })).toBe(false);
  expect(praemVisible({ col: 1, row: 1 }, { col: 3, row: 3 })).toBe(true);
  expect(praemNearby({ col: 1, row: 1 }, { col: 5, row: 1 })).toBe(true);
  expect(praemNearby({ col: 1, row: 1 }, { col: 6, row: 1 })).toBe(false);
});
it('always supplies thirty sockets without losing any of the four states', () => {
  const states = ['none', 'asleep', 'set', 'sold'] as const;
  const items = praemSockets(states.map((state, i) => ({ maze: i + 1, state, name: 'Way', icon_svg: null })));
  expect(items).toHaveLength(30); expect(items.slice(0, 4).map(p => p.state)).toEqual(states);
});
it('Threshold can never be sold', () => {
  expect(canSellPraem({ maze: 30, state: 'set', name: 'Threshold', icon_svg: null, sell_price: 100 })).toBe(false);
  expect(canSellPraem({ maze: 29, state: 'set', name: 'Way', icon_svg: null, sell_price: 100 })).toBe(true);
});
it('rift travel saves the returned world position and discovers twelve tiles around the entrance', async () => {
  api.rpc.mockResolvedValue({ data: { ok: true, x: 300, y: 31, layer: 0 }, error: null });
  expect((await travelPraem(1, 'player')).ok).toBe(true);
  expect(api.rpc).toHaveBeenCalledWith('rift_travel', { p_maze: 1 });
  expect(JSON.parse(localStorage.getItem('praem.worldReturn') ?? '{}')).toEqual({ x: 300, y: 31, layer: 0 });
  expect(api.reveal).toHaveBeenCalledWith(300, 31, 12);
});
it('closed rift never changes the saved position', async () => {
  api.rpc.mockResolvedValue({ data: { ok: false, reason: 'not_set' }, error: null });
  expect(await travelPraem(1, 'player')).toEqual({ ok: false, reason: 'not_set' });
  expect(localStorage.getItem('praem.worldPos')).toBeNull();
});