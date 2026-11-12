import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import KeepCard, { keptOnContact } from './KeepCard';
import { FindContact } from '@/lib/worldFinds';
import { notebookPages } from './FolderCollections';

it('fragments, keys and Præms are kept straight away; other items ask', () => {
  expect(keptOnContact({ kind: 'key' })).toBe(true);
  expect(keptOnContact({ kind: 'drop', praem: true })).toBe(true);
  expect(keptOnContact({ kind: 'drop' })).toBe(false);
});
it('Keep it / Enter keeps; Leave it / Esc leaves', () => {
  const keep = vi.fn(), leave = vi.fn();
  render(<KeepCard name="A few coins" line="Old and warm." onKeep={keep} onLeave={leave} />);
  fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
  fireEvent.keyDown(window, { key: 'Enter' });
  fireEvent.click(screen.getByRole('button', { name: 'Leave it' }));
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(keep).toHaveBeenCalledTimes(2); expect(leave).toHaveBeenCalledTimes(2);
});
it('a left item is only offered again after stepping off and back on', () => {
  const c = new FindContact(), find = { id: 'f', x: 1, y: 1 } as never;
  expect(c.begin('f')).toBe(true); c.finish('f');
  c.step([find], { x: 1, y: 1 }); expect(c.begin('f')).toBe(false);
  c.step([find], { x: 2, y: 1 }); expect(c.begin('f')).toBe(true);
});
it('notebook pages hold at most four entries, oldest first', () => {
  expect(notebookPages([1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual([[1, 2, 3, 4], [5, 6, 7, 8], [9]]);
});
