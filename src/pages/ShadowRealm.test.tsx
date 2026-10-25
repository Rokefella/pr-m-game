import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ShadowRealm from './ShadowRealm';
vi.mock('@/hooks/useNpcQuestStates', () => ({ useNpcQuestStates: () => () => 'none', useNpcDisplayName: (key: string) => key }));

const state = vi.hoisted(() => ({
  size: 5, library: 12,
  carriedDrops: 2, failLibrary: false,
  calls: [] as { table: string; method: string; args: unknown[] }[],
  slots: [] as { total: number; filled: number; revealed: boolean }[],
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'player' }, loading: false }) }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/lib/userData', () => ({
  fetchOrCreateUser: async () => ({ level: 1, registration_number: 2 }),
  updateUser: async () => { state.calls.push({ table: 'users', method: 'save', args: [] }); },
}));
vi.mock('@/lib/questFlags', () => ({ getAllFlags: async () => ({}), setFlag: vi.fn(), reconcileBernardAfterShadow: async (...args: unknown[]) => { state.calls.push({ table: 'bernard', method: 'recover', args }); return true; } }));
vi.mock('@/lib/runState', () => ({ endRun: vi.fn() }));
vi.mock('@/components/Thumbstick', () => ({ default: () => null }));
vi.mock('@/components/theme/FolderSlots', () => ({ default: (props: { total: number; filled: number; revealed: boolean }) => { state.slots.push(props); return null; } }));
vi.mock('@/lib/supabase', () => ({ supabase: { from: (table: string) => {
  let countQuery = false;
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order', 'update', 'upsert', 'delete', 'in', 'not', 'maybeSingle']) {
    chain[method] = (...args: unknown[]) => {
      state.calls.push({ table, method, args });
      if (method === 'select' && (args[1] as { count?: string } | undefined)?.count) countQuery = true;
      return chain;
    };
  }
  chain.then = (resolve: (value: unknown) => void) => Promise.resolve({
    data: table === 'fragments' ? Array.from({ length: state.size }, (_, i) => ({ id: `f${i}`, prime_number: i + 2, level: 1, image_data: null })) : table === 'drops' ? [...Array.from({ length: state.carriedDrops }, (_, i) => ({ id: `d${i}`, carried: true, run_level: 1 })), { id: 'permanent', carried: false, run_level: 1 }, { id: 'other-level', carried: true, run_level: 2 }] : null,
    count: countQuery ? state.library : null, error: table === 'library' && state.failLibrary ? { message: 'offline' } : null,
  }).then(resolve);
  return chain;
} } }));

beforeEach(() => {
  vi.useFakeTimers(); state.size = 5; state.library = 12; state.carriedDrops = 2; state.failLibrary = false; state.calls = []; state.slots = [];
  sessionStorage.setItem('praem_shadow_entry', JSON.stringify({ ts: Date.now() }));
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); sessionStorage.clear(); });

async function beginTransfer() {
  render(<ShadowRealm />);
  await act(async () => {});
  fireEvent.keyDown(window, { key: 'ArrowUp' });
  fireEvent.keyDown(window, { key: 'ArrowUp' });
  await act(async () => {});
}

describe('Shadow transfer counts', () => {
  it('snapshots current-level carried drops before fragment banking and refreshes only after success', async () => {
    const { DROPS_REFRESHED } = await import('@/lib/carriedDrops');
    const refreshed = vi.fn(); window.addEventListener(DROPS_REFRESHED, refreshed);
    await beginTransfer();
    const bank = state.calls.findIndex(c => c.table === 'fragments' && c.method === 'update');
    const reads = state.calls.map((c, i) => c.table === 'drops' && c.method === 'select' ? i : -1).filter(i => i >= 0);
    expect(reads).toHaveLength(2);
    expect(reads[0]).toBeLessThan(bank);
    expect(reads[1]).toBeGreaterThan(state.calls.findIndex(c => c.table === 'users' && c.method === 'save'));
    expect(refreshed).toHaveBeenCalledTimes(1);
    const { carriedDropCount } = await import('@/lib/carriedDrops');
    expect(carriedDropCount(refreshed.mock.calls[0][0].detail.drops, 1)).toBe(2);
    window.removeEventListener(DROPS_REFRESHED, refreshed);
  });
  it('preserves the original carried-drop snapshot across a failed-transfer retry', async () => {
    state.failLibrary = true;
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await beginTransfer();
    expect(state.calls.filter(c => c.table === 'drops' && c.method === 'select')).toHaveLength(1);
    state.failLibrary = false; state.carriedDrops = 0;
    fireEvent.click(document.querySelector('button') as HTMLButtonElement);
    await act(async () => {});
    expect(state.calls.filter(c => c.table === 'drops' && c.method === 'select')).toHaveLength(2);
    expect(state.calls.filter(c => c.table === 'users' && c.method === 'save')).toHaveLength(1);
    log.mockRestore();
  });
  it('does not bank drops or advance levels when no fragments are transferred', async () => {
    state.size = 0;
    await beginTransfer();
    expect(state.calls.some(c => c.method === 'update' || c.method === 'upsert' || c.method === 'save')).toBe(false);
  });
  it('repairs Bernard only after banking and level-up have been saved', async () => {
    await beginTransfer();
    const recovery = state.calls.findIndex(c => c.table === 'bernard');
    expect(recovery).toBeGreaterThan(state.calls.findIndex(c => c.table === 'users' && c.method === 'save'));
    expect(state.calls[recovery].args).toEqual(['player', true]);
  });
  it('fills only five current-transfer slots, never earlier banked rows', async () => {
    await beginTransfer();
    for (let i = 0; i < 140; i++) await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    const progress = state.slots.map(p => p.filled + (p.revealed ? 1 : 0));
    expect([...new Set(progress)]).toEqual([0, 1, 2, 3, 4, 5]);
    expect(state.slots.every(p => p.total === 5)).toBe(true);
    expect(state.calls.some(c => c.table === 'fragments' && c.method === 'select' && c.args[1])).toBe(false);
  });
  it('queries the exact player Library row count only after persistence', async () => {
    await beginTransfer();
    const countIndex = state.calls.findIndex(c => c.table === 'library' && c.method === 'select');
    expect(countIndex).toBeGreaterThan(state.calls.findIndex(c => c.table === 'users' && c.method === 'save'));
    expect(state.calls[countIndex].args).toEqual(['id', { count: 'exact', head: true }]);
    expect(state.calls[countIndex + 1]).toEqual({ table: 'library', method: 'eq', args: ['user_id', 'player'] });
  });
  it('keeps a minimum of five slots for a smaller transfer', async () => {
    state.size = 2;
    await beginTransfer();
    expect(state.slots.at(-1)).toEqual({ total: 5, filled: 0, revealed: false });
  });
});