import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { abandonRunDrops, endRun, forfeitUnbanked, getActiveRun, RUN_MAX_AGE_MS, startRun, STRICT_FORFEIT } from './runState';

const api = vi.hoisted(() => ({ from: vi.fn(), delete: vi.fn(), eq: vi.fn(), rpc: vi.fn(), refresh: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { from: api.from, rpc: api.rpc } }));
vi.mock('@/lib/carriedDrops', () => ({ refreshDrops: api.refresh }));

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-19T10:23:00Z'));
  vi.clearAllMocks();
  api.from.mockReturnValue({ delete: api.delete });
  api.delete.mockReturnValue({ eq: api.eq });
  api.eq.mockReturnValue({ eq: api.eq });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('maze run lifecycle', () => {
  it('abandons only the exited level and refetches drops after deletion', async () => {
    api.rpc.mockResolvedValue({ data: 2, error: null });
    expect(await abandonRunDrops('player', 3)).toBe(true);
    expect(api.rpc).toHaveBeenCalledWith('abandon_run_drops', { p_level: 3 });
    expect(api.refresh).toHaveBeenCalledWith('player');
    expect(api.refresh.mock.invocationCallOrder[0]).toBeGreaterThan(api.rpc.mock.invocationCallOrder[0]);
  });
  it('reports abandonment failure rather than completing a real exit', async () => {
    api.rpc.mockResolvedValue({ error: { message: 'offline' } });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await abandonRunDrops('player', 3)).toBe(false);
    expect(api.refresh).not.toHaveBeenCalled();
  });
  it('stores the user, level and original entry time under praem_run', () => {
    startRun('player', 2);
    expect(JSON.parse(localStorage.getItem('praem_run') ?? '{}')).toEqual({ userId: 'player', level: 2, startedAt: Date.now() });
  });
  it('resumes an interrupted run younger than 12 hours with strict forfeiture disabled', () => {
    expect(STRICT_FORFEIT).toBe(false);
    expect(RUN_MAX_AGE_MS).toBe(12 * 60 * 60 * 1000);
    startRun('player', 1);
    vi.advanceTimersByTime(12 * 60 * 60 * 1000 - 1);
    expect(getActiveRun('player', 1)?.level).toBe(1);
  });
  it('does not resume at or beyond 12 hours', () => {
    startRun('player', 1);
    vi.advanceTimersByTime(12 * 60 * 60 * 1000);
    expect(getActiveRun('player', 1)).toBeNull();
    vi.advanceTimersByTime(1);
    expect(getActiveRun('player', 1)).toBeNull();
  });
  it('never restores another user or another level', () => {
    startRun('player', 1);
    expect(getActiveRun('other', 1)).toBeNull();
    expect(getActiveRun('player', 2)).toBeNull();
  });
  it('ends a run for either deliberate leaving or successful banking', () => {
    startRun('player', 1);
    endRun();
    expect(localStorage.getItem('praem_run')).toBeNull();
    expect(getActiveRun('player', 1)).toBeNull();
  });
  it.each(['bad json', 'null', '{}', '{"userId":"player","level":1,"startedAt":"invalid"}'])('ignores invalid records: %s', (value) => {
    localStorage.setItem('praem_run', value);
    expect(getActiveRun('player', 1)).toBeNull();
  });
  it('ignores timestamps in the future', () => {
    localStorage.setItem('praem_run', JSON.stringify({ userId: 'player', level: 1, startedAt: Date.now() + 1 }));
    expect(getActiveRun('player', 1)).toBeNull();
  });
  it('forfeits unbanked fragments only through the server', async () => {
    api.rpc.mockResolvedValue({ data: { ok: true }, error: null });
    expect(await forfeitUnbanked('player')).toBe(true);
    expect(api.rpc).toHaveBeenCalledWith('forfeit_unbanked_fragments', {});
    expect(api.from).not.toHaveBeenCalled();
  });
  it('keeps the run on a refused forfeiture', async () => {
    api.rpc.mockResolvedValue({ data: { ok: false, reason: 'denied' }, error: null });
    expect(await forfeitUnbanked('player')).toBe(false);
  });
  it('reports network failure', async () => {
    api.rpc.mockRejectedValue(new Error('offline'));
    expect(await forfeitUnbanked('player')).toBe(false);
  });
});
import { markRunComplete } from './runState';
describe('completed runs', () => {
  it('markRunComplete flags the stored run and endRun clears it', () => {
    localStorage.clear();
    startRun('u1', 2);
    markRunComplete('u1', 2);
    expect(getActiveRun('u1', 2)?.completed).toBe(true);
    endRun();
    expect(getActiveRun('u1', 2)).toBeNull();
  });
  it('markRunComplete creates a completed record when none exists', () => {
    localStorage.clear();
    markRunComplete('u1', 1);
    expect(getActiveRun('u1', 1)?.completed).toBe(true);
  });
});
