import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMinLoading } from './LoadingScreen';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('minimum loading visibility', () => {
  it('does not hold a load ending before 150ms', () => {
    const { result, rerender } = renderHook(({ loading }) => useMinLoading(loading), { initialProps: { loading: true } });
    act(() => vi.advanceTimersByTime(149));
    rerender({ loading: false });
    expect(result.current).toBe(false);
  });
  it('holds a visible loader for 500ms from its 150ms appearance', () => {
    const { result, rerender } = renderHook(({ loading }) => useMinLoading(loading), { initialProps: { loading: true } });
    act(() => vi.advanceTimersByTime(200));
    rerender({ loading: false });
    act(() => vi.advanceTimersByTime(449));
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);
  });
  it('does not delay a load already visible longer than 500ms', () => {
    const { result, rerender } = renderHook(({ loading }) => useMinLoading(loading), { initialProps: { loading: true } });
    act(() => vi.advanceTimersByTime(900));
    rerender({ loading: false });
    expect(result.current).toBe(false);
  });
  it('supports a custom minimum and another loading cycle', () => {
    const { result, rerender } = renderHook(({ loading }) => useMinLoading(loading, 800), { initialProps: { loading: false } });
    expect(result.current).toBe(false);
    rerender({ loading: true });
    act(() => vi.advanceTimersByTime(160));
    rerender({ loading: false });
    act(() => vi.advanceTimersByTime(789));
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);
    rerender({ loading: true });
    act(() => vi.advanceTimersByTime(100));
    rerender({ loading: false });
    expect(result.current).toBe(false);
  });
});