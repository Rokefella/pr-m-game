import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DecodeNumber from './DecodeNumber';

let reduced = false;
beforeEach(() => {
  vi.useFakeTimers();
  reduced = false;
  vi.stubGlobal('matchMedia', () => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('left-to-right prime decoding', () => {
  it.each([7, 23, 997, 1009, 10007, 999983])('finishes %s once, at 260ms per digit', value => {
    const done = vi.fn();
    render(<DecodeNumber value={value} run glow="teal" onDone={done} />);
    act(() => vi.advanceTimersByTime(String(value).length * 260 - 1));
    expect(done).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(done).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(3000));
    expect(done).toHaveBeenCalledTimes(1);
  });
  it('does not start while waiting for the eye and voice fetch', () => {
    const done = vi.fn();
    render(<DecodeNumber value={23} run={false} glow="teal" onDone={done} />);
    act(() => vi.advanceTimersByTime(5000));
    expect(done).not.toHaveBeenCalled();
  });
  it('completes immediately with reduced motion', () => {
    reduced = true;
    const done = vi.fn();
    render(<DecodeNumber value={999983} run={false} glow="teal" onDone={done} />);
    expect(done).toHaveBeenCalledTimes(1);
  });
});