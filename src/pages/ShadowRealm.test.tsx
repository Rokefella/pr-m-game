import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ShadowRealm from './ShadowRealm';
vi.mock('@/hooks/useNpcQuestStates', () => ({ useNpcQuestStates: () => () => 'none', useNpcDisplayName: (key: string) => key }));

const state = vi.hoisted(() => ({
  size: 5, library: 12,
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
    data: table === 'fragments' ? Array.from({ length: state.size }, (_, i) => ({ id: `f${i}`, prime_number: i + 2, level: 1, image_data: null })) : null,
    count: countQuery ? state.library : null, error: null,
  }).then(resolve);
  return chain;
} } }));

beforeEach(() => {
  vi.useFakeTimers(); state.size = 5; state.library = 12; state.calls = []; state.slots = [];
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