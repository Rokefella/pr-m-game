import { beforeEach, expect, it, vi } from 'vitest';
import { currentStage, MISSING_ITEM_LINE, runStage, type SamStage } from './worldSam';
const f = vi.hoisted(() => ({ rpc: vi.fn(), read: vi.fn(), refresh: vi.fn(), events: [] as Event[] }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: f.rpc } }));
vi.mock('./carriedDrops', () => ({ readOwnedDrops: f.read, refreshDrops: f.refresh }));
const whistle: SamStage = { id: 'whistle', text: '', button_label: '', order_index: 98, condition: { flags: { sam_whistle: '0' }, has_drop: 'curio_tin_whistle' }, button_action_key: 'take:curio_tin_whistle;drop:mech_second_wind;flag:sam_whistle=1' };
const capture = (e: Event) => { f.events.push(e); };
beforeEach(() => {
  f.events = [];
  f.read.mockReset().mockResolvedValue([]); f.refresh.mockReset().mockResolvedValue([]);
  f.rpc.mockReset().mockImplementation(async (name) => ({ data: name === 'npc_stage_matches' ? true : { ok: true, steps_remaining: 420, credits: 77 }, error: null }));
  window.addEventListener('praem:user-steps-refreshed', capture); window.addEventListener('praem:user-credits-refreshed', capture);
  return () => { window.removeEventListener('praem:user-steps-refreshed', capture); window.removeEventListener('praem:user-credits-refreshed', capture); };
});
it('shows the whistle hand-in only with at least one owned whistle', async () => {
  expect(await currentStage('self', [whistle])).toBeNull();
  f.read.mockResolvedValue([{ drop_key: 'curio_tin_whistle' }]);
  expect(await currentStage('self', [whistle])).toEqual(whistle);
});
it('lets the server take the whistle in run_npc_stage2 and never discards on the client', async () => {
  expect((await runStage('whistle', 'self')).ok).toBe(true);
  expect(f.rpc.mock.calls.map(([n]) => n)).toEqual(['run_npc_stage2']);
  expect(f.rpc).toHaveBeenCalledWith('run_npc_stage2', { p_stage: 'whistle' });
  expect(f.refresh).toHaveBeenCalledWith('self');
});
it('updates the HUD from the returned steps and credits', async () => {
  await runStage('whistle', 'self');
  expect(f.events.map(e => (e as CustomEvent).detail)).toEqual([{ userId: 'self', steps: 420 }, { userId: 'self', credits: 77 }]);
});
it('turns missing_item into the in-character line', async () => {
  f.rpc.mockResolvedValue({ data: { ok: false, reason: 'missing_item' }, error: null });
  expect(await runStage('whistle', 'self')).toMatchObject({ ok: false, reason: MISSING_ITEM_LINE, handInFailed: true });
  expect(MISSING_ITEM_LINE).toBe("You don't seem to have it on you.");
});
