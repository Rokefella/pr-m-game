import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import SamCard from './SamCard';
const f = vi.hoisted(() => ({ flag: 0, run: vi.fn(), load: vi.fn() }));
vi.mock('@/components/NpcPortrait', () => ({ default: () => null }));
vi.mock('@/lib/worldSam', async original => {
  const actual = await original<typeof import('@/lib/worldSam')>();
  return { ...actual, loadSam: f.load, samStageFlag: async () => f.flag, currentStage: async () => ({ id: `stage-${f.flag}`, text: `Stage ${f.flag}`, button_label: f.flag === 0 ? 'Thank you' : "I'll go" }), runStage: f.run, dropNames: async () => ({}) };
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('topics respond and actions advance through stage zero without remounting on world updates', async () => {
  f.flag = 0;
  f.load.mockResolvedValue({ npc: { name: 'Sam' }, stages: [], book: [{ node_key: 'bg_root_a', topic: 'background', text: 'My story' }] });
  f.run.mockImplementation(async () => { f.flag++; return { ok: true }; });
  const props = { userId: 'self', npcKey: 'bernard', playerName: 'Rob', fallbackName: 'Sam' };
  const view = render(<SamCard {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Where you came from' })); await screen.findByText('My story');
  view.rerender(<SamCard {...props} onRewarded={() => {}} />); expect(screen.getByText('My story')).toBeInTheDocument(); expect(f.load).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Back' })); fireEvent.click(screen.getByRole('button', { name: 'Thank you' }));
  fireEvent.click(await screen.findByRole('button', { name: "I'll go" })); await screen.findByText('Stage 2');
  expect(f.run.mock.calls).toEqual([['stage-0'], ['stage-1']]); expect(f.flag).toBe(2);
});