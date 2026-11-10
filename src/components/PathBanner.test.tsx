import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import PathBanner from './PathBanner';
import type { Path } from '@/lib/paths';

const f = vi.hoisted(() => ({ paths: [] as Path[], seen: vi.fn() }));
vi.mock('@/hooks/usePaths', () => ({ usePaths: () => f.paths, markPathSeen: f.seen }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });
it('holds queued banners and their timers until the first step, then plays in order', () => {
  vi.useFakeTimers();
  f.paths = ['one', 'two'].map(quest_key => ({ quest_key, name: quest_key, colour: 'gold', type: 'side', giver: 'Sam', state: 'active', step_key: 'start', line: null, progress: null, seen: null }));
  const view = render(<PathBanner userId="self" ready={false} />);
  act(() => vi.advanceTimersByTime(20000));
  expect(screen.queryByText('one')).toBeNull(); expect(f.seen).not.toHaveBeenCalled();
  view.rerender(<PathBanner userId="self" ready />);
  expect(screen.getByText('one')).toBeInTheDocument(); expect(screen.queryByText('two')).toBeNull();
  fireEvent.pointerDown(screen.getByText('one'));
  act(() => vi.advanceTimersByTime(600));
  expect(f.seen).toHaveBeenCalledWith('one', 'start');
  expect(screen.getByText('two')).toBeInTheDocument();
});