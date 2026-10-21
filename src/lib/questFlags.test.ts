import { beforeEach, describe, expect, it, vi } from 'vitest';
import { _resetQuestFlagCache, getFlag, reconcileBernardAfterShadow, subscribeQuestFlags } from './questFlags';

const state = vi.hoisted(() => ({
  flags: {} as Record<string, string>, library: [] as { id: string }[],
  calls: [] as { table: string; method: string; args: unknown[] }[], failWrite: false,
}));
vi.mock('@/lib/supabase', () => ({ supabase: { from: (table: string) => {
  let write: { flag_key: string; flag_value: string } | undefined;
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'limit', 'upsert']) chain[method] = (...args: unknown[]) => {
    state.calls.push({ table, method, args });
    if (method === 'upsert') write = args[0] as typeof write;
    return chain;
  };
  chain.then = (resolve: (value: unknown) => void) => {
    if (write && !state.failWrite) state.flags[write.flag_key] = write.flag_value;
    return Promise.resolve({
      data: table === 'quest_flags' ? Object.entries(state.flags).map(([flag_key, flag_value]) => ({ flag_key, flag_value })) : state.library,
      error: write && state.failWrite ? { message: 'write failed' } : null,
    }).then(resolve);
  };
  return chain;
} } }));

beforeEach(() => { _resetQuestFlagCache(); state.flags = {}; state.library = []; state.calls = []; state.failWrite = false; });
describe('Bernard persisted Shadow recovery', () => {
  it('repairs a stuck stage 3 account with shadow_visited on village load', async () => {
    state.flags = { bernard_stage: '3', shadow_visited: 'true' };
    expect(await reconcileBernardAfterShadow('player')).toBe(true);
    expect(state.flags.bernard_stage).toBe('4');
    expect(getFlag('bernard_stage')).toBe('4');
  });
  it('advances stage 3 immediately after a saved transfer without session markers', async () => {
    state.flags = { bernard_stage: '3' };
    expect(await reconcileBernardAfterShadow('player', true)).toBe(true);
    expect(state.flags.bernard_stage).toBe('4');
  });
  it('recovers stage 3 from this player’s Library when shadow_visited is absent', async () => {
    state.flags = { bernard_stage: '3' }; state.library = [{ id: 'banked-prime' }];
    expect(await reconcileBernardAfterShadow('player')).toBe(true);
    expect(state.flags.bernard_stage).toBe('4');
    expect(state.calls).toContainEqual({ table: 'library', method: 'eq', args: ['user_id', 'player'] });
  });
  it('keeps stage 3 when neither persisted completion signal exists', async () => {
    state.flags = { bernard_stage: '3', shadow_visited: 'false' };
    expect(await reconcileBernardAfterShadow('player')).toBe(false);
    expect(state.flags.bernard_stage).toBe('3');
  });
  it.each(['0', '1', '2', '4', '5', '6'])('never skips or regresses stage %s', async stage => {
    state.flags = { bernard_stage: stage, shadow_visited: 'true' };
    expect(await reconcileBernardAfterShadow('player', true)).toBe(false);
    expect(state.flags.bernard_stage).toBe(stage);
  });
  it('publishes stage 4 immediately to dialogue and marker subscribers', async () => {
    state.flags = { bernard_stage: '3', shadow_visited: 'true' };
    const seen: (string | null)[] = []; const unsubscribe = subscribeQuestFlags(() => seen.push(getFlag('bernard_stage')));
    await reconcileBernardAfterShadow('player'); unsubscribe();
    expect(seen).toEqual(['3', '4']);
  });
  it('does not fail banking or claim success on a failed stage write, and retries on the next visit', async () => {
    state.flags = { bernard_stage: '3', shadow_visited: 'true' }; state.failWrite = true;
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await reconcileBernardAfterShadow('player', true)).toBe(false);
    expect(getFlag('bernard_stage')).toBe('3');
    state.failWrite = false;
    expect(await reconcileBernardAfterShadow('player')).toBe(true);
    expect(state.flags.bernard_stage).toBe('4'); log.mockRestore();
  });
});