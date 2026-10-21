import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useRoomGhostWhisper } from './RoomGhosts';

afterEach(() => vi.useRealTimers());
it('keeps a nearby ghost whisper for four seconds and suppresses repeats for thirty seconds', () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  const { result } = renderHook(() => useRoomGhostWhisper([{ type: 'GHOST', col: 4, row: 4, line: 'Remember.' }]));
  act(() => result.current.check(90, 90));
  expect(result.current.whisper).not.toBeNull();
  act(() => vi.advanceTimersByTime(3999));
  expect(result.current.whisper).not.toBeNull();
  act(() => vi.advanceTimersByTime(1));
  expect(result.current.whisper).toBeNull();
  act(() => result.current.check(90, 90));
  expect(result.current.whisper).toBeNull();
  act(() => vi.advanceTimersByTime(26000));
  act(() => result.current.check(90, 90));
  expect(result.current.whisper).not.toBeNull();
});