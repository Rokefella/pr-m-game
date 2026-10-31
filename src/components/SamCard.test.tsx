import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import SamCard, { NOTE_ERROR } from './SamCard';
const f = vi.hoisted(() => ({ flag: 0, run: vi.fn(), load: vi.fn() }));
vi.mock('@/components/NpcPortrait', () => ({ default: () => null }));
vi.mock('@/lib/worldSam', async original => {
  const actual = await original<typeof import('@/lib/worldSam')>();
  return { ...actual, loadSam: f.load, samFlags: async () => ({ sam_stage: String(f.flag) }), currentStage: async () => ({ id: `stage-${f.flag}`, text: `Stage ${f.flag}`, button_label: f.flag === 0 ? 'Thank you' : "I'll go" }), runStage: f.run, dropNames: async () => ({ map_scrap: 'Map Scrap' }) };
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const props = { userId: 'self', npcKey: 'bernard', playerName: 'Rob', fallbackName: 'Sam' };
const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
afterEach(() => errorSpy.mockClear());

it('topics respond and actions advance through stage zero without remounting on world updates', async () => {
  f.flag = 0;
  f.load.mockResolvedValue({ npc: { name: 'Sam' }, stages: [], book: [{ node_key: 'bg_root_a', topic: 'background', text: 'My story' }] });
  f.run.mockImplementation(async () => { f.flag++; return { ok: true }; });
  const view = render(<SamCard {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Where you came from' })); await screen.findByText('My story');
  view.rerender(<SamCard {...props} onRewarded={() => {}} />); expect(screen.getByText('My story')).toBeInTheDocument(); expect(f.load).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Back' })); fireEvent.click(screen.getByRole('button', { name: 'Thank you' }));
  fireEvent.click(await screen.findByRole('button', { name: "I'll go" })); await screen.findByText('Stage 2');
  expect(f.run.mock.calls).toEqual([['stage-0', 'self'], ['stage-1', 'self']]); expect(f.flag).toBe(2);
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
