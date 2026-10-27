import { beforeEach, describe, expect, it, vi } from 'vitest';
import { stackDrops, carriedDropCount, readOwnedDrops, refreshDrops, DROPS_REFRESHED, type OwnedDrop } from './carriedDrops';

const api = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), eq: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { from: api.from } }));
beforeEach(() => {
  vi.clearAllMocks();
  api.from.mockReturnValue({ select: api.select });
  api.select.mockReturnValue({ eq: api.eq });
});
describe('carried drops', () => {
  it('counts only carried drops from the current level, not permanent or other-run drops', () => {
    const drops = [{ carried: true, run_level: 2 }, { carried: false, run_level: 2 }, { carried: true, run_level: 1 }] as OwnedDrop[];
    expect(carriedDropCount(drops, 2)).toBe(1);
    expect(carriedDropCount(drops, 3)).toBe(0);
  });
  it('reads carry state and the player-owned metadata without changing any table', async () => {
    api.eq.mockResolvedValue({ data: [{ id: 'oil', carried: true, run_level: 2, drop_types: { name: 'Lantern Oil', category: 'mechanic' } }], error: null });
    const drops = await readOwnedDrops('player');
    expect(drops[0]).toMatchObject({ id: 'oil', carried: true, run_level: 2, name: 'Lantern Oil', category: 'mechanic' });
    expect(api.eq).toHaveBeenCalledWith('user_id', 'player');
    expect(api.select).toHaveBeenCalledWith(expect.stringContaining('carried, run_level'));
  });
  it('publishes the refetched permanent state after banking', async () => {
    api.eq.mockResolvedValue({ data: [{ id: 'oil', carried: false, run_level: 2 }], error: null });
    const event = vi.fn(); window.addEventListener(DROPS_REFRESHED, event);
    await refreshDrops('player');
    expect(event.mock.calls[0][0].detail).toMatchObject({ userId: 'player', drops: [{ id: 'oil', carried: false }] });
    window.removeEventListener(DROPS_REFRESHED, event);
  });
});
it('groups 99 copies of a drop once without losing instance IDs', () => { const drops = Array.from({ length: 99 }, (_, i) => ({ id: String(i), drop_key: 'moss', name: 'Moss bundle', carried: false } as OwnedDrop)); const stacks = stackDrops(drops); expect(stacks).toHaveLength(1); expect(stacks[0].count).toBe(99); expect(stacks[0].ids).toHaveLength(99); });
