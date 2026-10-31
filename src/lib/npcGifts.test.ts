import { beforeEach, expect, it, vi } from 'vitest';
import { currentStage, runStage, type SamStage } from './worldSam';
const f = vi.hoisted(() => ({ rpc: vi.fn(), discard: vi.fn(), read: vi.fn(), refresh: vi.fn(), events: [] as string[] }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: f.rpc } }));
vi.mock('./carriedDrops', () => ({ readOwnedDrops: f.read, refreshDrops: f.refresh }));
vi.mock('./letGo', async original => ({ ...await original<typeof import('./letGo')>(), discardDrops: f.discard }));
const whistle: SamStage = { id: 'whistle', text: '', button_label: '', order_index: 98, condition: { flags: { sam_whistle: '0' }, has_drop: 'curio_tin_whistle' }, button_action_key: 'take:curio_tin_whistle;drop:mech_second_wind;flag:sam_whistle=1' };
beforeEach(() => {
  f.events = [];
  f.read.mockReset().mockResolvedValue([]); f.refresh.mockReset().mockResolvedValue([]);
  f.discard.mockReset().mockImplementation(async () => { f.events.push('take'); return { ok: true, removed: 1 }; });
  f.rpc.mockReset().mockImplementation(async (name) => { f.events.push(name); return { data: name === 'npc_stage_matches' ? true : { ok: true }, error: null }; });
});
it('shows the whistle hand-in only with at least one owned whistle', async () => {
  expect(await currentStage('self', [whistle])).toBeNull();
  f.read.mockResolvedValue([{ drop_key: 'curio_tin_whistle' }]);
  expect(await currentStage('self', [whistle])).toEqual(whistle);
});
it('takes exactly one whistle before running remaining rewards and refreshes Folder', async () => {
  expect((await runStage('whistle', whistle, 'self')).ok).toBe(true);
  expect(f.discard).toHaveBeenCalledWith('self', 'curio_tin_whistle', 1, false);
  expect(f.events).toEqual(['take', 'run_npc_stage']);
  expect(f.refresh).toHaveBeenCalledWith('self');
});
it('stops all rewards on a refused hand-in and returns its error', async () => {
  f.discard.mockResolvedValue({ ok: false, reason: 'none_left' });
  expect(await runStage('whistle', whistle, 'self')).toMatchObject({ ok: false, reason: 'There is none left.', handInFailed: true });
  expect(f.rpc).not.toHaveBeenCalled();
});