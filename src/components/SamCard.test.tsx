import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import SamCard, { NOTE_ERROR } from './SamCard';
const f = vi.hoisted(() => ({ flag: 0, run: vi.fn(), load: vi.fn(), rpc: vi.fn(), noStage: false, extra: {} as Record<string, string>, stages: null as null | import('@/lib/worldSam').SamStage[] }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: f.rpc } }));
vi.mock('@/components/NellSets', () => ({ default: () => <div>SETS PANEL</div> }));
vi.mock('@/components/NpcPortrait', () => ({ default: () => null }));
vi.mock('@/lib/worldSam', async original => {
  const actual = await original<typeof import('@/lib/worldSam')>();
  return { ...actual, loadSam: f.load, samFlags: async () => ({ sam_stage: String(f.flag), ...f.extra }), currentStage: async () => f.noStage ? null : f.stages ? f.stages[f.flag] : ({ id: `stage-${f.flag}`, text: `Stage ${f.flag}`, button_label: f.flag === 0 ? 'Thank you' : "I'll go" }), runStage: f.run, dropNames: async () => ({ map_scrap: 'Map Scrap', recipe_scrap: 'Recipe scrap' }) };
});
afterEach(() => { cleanup(); vi.clearAllMocks(); f.noStage = false; f.stages = null; f.extra = {}; });
const props = { userId: 'self', npcKey: 'bernard', playerName: 'Rob', fallbackName: 'Sam', onClose: vi.fn() };
const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
afterEach(() => errorSpy.mockClear());

it('keeps topics hidden and actions advance without remounting on world updates', async () => {
  f.flag = 0;
  f.load.mockResolvedValue({ npc: { name: 'Sam' }, stages: [], book: [{ node_key: 'bg_root_a', topic: 'background', text: 'My story' }] });
  f.run.mockImplementation(async () => { f.flag++; return { ok: true }; });
  const view = render(<SamCard {...props} />);
  await screen.findByRole('button', { name: 'Thank you' });
  expect(screen.queryByRole('button', { name: 'Where you came from' })).toBeNull();
  view.rerender(<SamCard {...props} onRewarded={() => {}} />); expect(f.load).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Thank you' }));
  fireEvent.click(await screen.findByRole('button', { name: "I'll go" })); await screen.findByText('Stage 2');
  expect(f.run.mock.calls).toEqual([['stage-0', 'self'], ['stage-1', 'self']]); expect(f.flag).toBe(2);
});
it('runs Chef conversations twice and presents the server recipe receipt', async () => {
  f.flag = 0;
  f.load.mockResolvedValue({ npc: { name: 'The Chef' }, stages: [], book: [] });
  f.run.mockImplementation(async () => { f.flag++; return { ok: true, given: f.flag === 2 ? [{ drop: 'recipe_scrap' }] : [] }; });
  render(<SamCard {...props} npcKey="chef" fallbackName="The Chef" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Thank you' }));
  fireEvent.click(await screen.findByRole('button', { name: "I'll go" }));
  expect(await screen.findByText('Kept: Recipe scrap')).toBeInTheDocument();
  expect(f.load).toHaveBeenCalledWith('chef');
  expect(f.run.mock.calls).toEqual([['stage-0', 'self'], ['stage-1', 'self']]);
});

it('shows the error line and logs the stage id when the stage rpc fails', async () => {
  f.flag = 1;
  f.load.mockResolvedValue({ npc: { name: 'Sam' }, stages: [], book: [] });
  f.run.mockResolvedValue({ ok: false, reason: 'rpc unavailable' });
  render(<SamCard {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: "I'll go" }));
  expect(await screen.findByText(NOTE_ERROR)).toBeInTheDocument();
  expect(errorSpy).toHaveBeenCalledWith('run_npc_stage failed for stage stage-1', 'rpc unavailable');
});

it('shows the same error line when the stage rpc throws', async () => {
  f.flag = 1;
  f.load.mockResolvedValue({ npc: { name: 'Sam' }, stages: [], book: [] });
  f.run.mockRejectedValue(new Error('HTTP 400'));
  render(<SamCard {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: "I'll go" }));
  expect(await screen.findByText(NOTE_ERROR)).toBeInTheDocument();
  expect(errorSpy).toHaveBeenCalledWith('run_npc_stage failed for stage stage-1', expect.any(Error));
});

it('shows the receipt for what was given, then moves to the next stage', async () => {
  f.flag = 0;
  f.load.mockResolvedValue({ npc: { name: 'Sam' }, stages: [], book: [] });
  f.run.mockImplementation(async () => { f.flag++; return { ok: true, given: [{ drop: 'map_scrap' }, { steps: 50 }, { credits: 10 }] }; });
  render(<SamCard {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Thank you' }));
  expect(await screen.findByText('Kept: Map Scrap · +50 steps · +10 credits')).toBeInTheDocument();
  expect(await screen.findByText('Stage 1')).toBeInTheDocument();
});

it('waits for the world title refresh when Sam reaches stage three', async () => {
  f.flag = 2;
  f.load.mockResolvedValue({ npc: { name: 'Sam' }, stages: [], book: [] });
  f.run.mockImplementation(async () => { f.flag = 3; return { ok: true }; });
  let complete: (() => void) | undefined;
  const refreshed = vi.fn(() => new Promise<void>(resolve => { complete = resolve; }));
  render(<SamCard {...props} onRewarded={refreshed} />);
  fireEvent.click(await screen.findByRole('button', { name: "I'll go" }));
  await screen.findByText('…');
  expect(f.flag).toBe(3);
  expect(refreshed).toHaveBeenCalledOnce();
  complete?.();
  await screen.findByText('Stage 3');
});

const stage = (text: string, button_label: string | null = 'Accept', decline_label: string | null = 'Decline') => ({ id: 'talk', text, button_label, decline_label, condition: {}, order_index: 0 });
const talk = (stages: import('@/lib/worldSam').SamStage[]) => {
  f.flag = 0; f.stages = stages;
  f.load.mockResolvedValue({ npc: { name: 'Sam' }, stages, book: [] });
  f.rpc.mockResolvedValue({ data: { ok: true }, error: null });
  return render(<SamCard {...props} />);
};
it('three pages require Go on twice before accept and decline, then restart on the next talk', async () => {
  talk([stage('Hello {name}.\n\nSecond page.\n\nThird page.'), stage('Next first.\n\nNext last.')]);
  f.run.mockImplementation(async () => { f.flag++; return { ok: true, given: [{ drop: 'recipe_scrap' }] }; });
  await screen.findByText('Hello Rob.');
  expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Go on' }));
  expect(screen.getByText('Second page.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Go on' }));
  expect(screen.getByText('Third page.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
  await screen.findByText('Next first.');
  expect(f.run).toHaveBeenCalledWith('talk', 'self');
  expect(screen.getByText('Kept: Recipe scrap')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Go on' }));
  expect(screen.queryByText('Kept: Recipe scrap')).toBeNull();
});
it('decline calls npc_decline with the stage and closes without accepting', async () => {
  talk([stage('A choice.')]);
  fireEvent.click(await screen.findByRole('button', { name: 'Decline' }));
  await vi.waitFor(() => expect(props.onClose).toHaveBeenCalledOnce());
  expect(f.rpc).toHaveBeenCalledWith('npc_decline', { p_stage: 'talk' });
  expect(f.run).not.toHaveBeenCalled();
});
it('only-decline stage offers one action and saves decline before closing', async () => {
  talk([stage('Just leaving.', null, 'Leave')]);
  fireEvent.click(await screen.findByRole('button', { name: 'Leave' }));
  await vi.waitFor(() => expect(props.onClose).toHaveBeenCalledOnce());
  expect(f.rpc).toHaveBeenCalledWith('npc_decline', { p_stage: 'talk' });
  expect(screen.getAllByRole('button')).toHaveLength(1);
});
it('failed decline stays open with the existing failure line', async () => {
  talk([stage('A choice.')]); f.rpc.mockResolvedValue({ error: null, data: { ok: false } });
  fireEvent.click(await screen.findByRole('button', { name: 'Decline' }));
  await screen.findByText(NOTE_ERROR); expect(props.onClose).not.toHaveBeenCalled();
});
it('no actions offers Goodbye and preserves the no-stage Sam line', async () => {
  f.noStage = true; talk([]);
  await screen.findByText('Sam pokes the fire.');
  fireEvent.click(screen.getByRole('button', { name: 'Goodbye' }));
  expect(props.onClose).toHaveBeenCalledOnce(); expect(f.rpc).not.toHaveBeenCalled();
});

it('shows Nell\'s Sets panel only once nell_met is 1', async () => {
  f.flag = 0; f.load.mockResolvedValue({ npc: { name: 'Nell' }, stages: [], book: [] });
  const view = render(<SamCard {...props} npcKey="nell" fallbackName="Nell" />);
  await screen.findByRole('button', { name: 'Thank you' }); expect(screen.queryByText('SETS PANEL')).toBeNull(); view.unmount();
  f.extra = { nell_met: '1' }; render(<SamCard {...props} npcKey="nell" fallbackName="Nell" />);
  expect(await screen.findByText('SETS PANEL')).toBeInTheDocument();
});
