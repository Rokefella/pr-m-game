import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FragmentOverlay from './FragmentOverlay';

const state = vi.hoisted(() => ({ line: 'A'.repeat(40), pending: false }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/lib/supabase', () => ({ supabase: { from: () => ({ select: () => ({ order: () => ({ limit: () => ({ single: () => state.pending ? new Promise(() => {}) : Promise.resolve({ data: { text: state.line }, error: null }) }) }) }) }) } }));
let reduced = false;
beforeEach(() => {
  vi.useFakeTimers(); reduced = false; state.pending = false; state.line = 'A'.repeat(40);
  vi.stubGlobal('matchMedia', () => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('fragment reveal readiness', () => {
  it('waits for both typing and the 500ms reveal flash', async () => {
    render(<FragmentOverlay prime={23} index={0} registrationNumber={1} onContinue={vi.fn()} />);
    await act(async () => {});
    const button = screen.getByRole('button', { name: 'SAVE TO FOLDER' });
    act(() => vi.advanceTimersByTime(800));
    act(() => vi.advanceTimersByTime(1300));
    expect(button).toBeDisabled();
    act(() => vi.advanceTimersByTime(499));
    expect(button).toBeDisabled();
    act(() => vi.advanceTimersByTime(1));
    expect(button).toBeEnabled();
  });
  it('enables after 300ms under reduced motion even if the voice fetch is pending', () => {
    reduced = true; state.pending = true;
    render(<FragmentOverlay prime={999983} index={0} registrationNumber={2} onContinue={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'SAVE TO FOLDER' });
    act(() => vi.advanceTimersByTime(299));
    expect(button).toBeDisabled();
    act(() => vi.advanceTimersByTime(1));
    expect(button).toBeEnabled();
  });
  it('preserves the save confirmation and the 800ms + 400ms continuation', async () => {
    reduced = true;
    const continueFlow = vi.fn();
    render(<FragmentOverlay prime={7} index={0} registrationNumber={2} onContinue={continueFlow} />);
    await act(async () => {});
    act(() => vi.advanceTimersByTime(300));
    fireEvent.click(screen.getByRole('button', { name: 'SAVE TO FOLDER' }));
    act(() => vi.advanceTimersByTime(1199));
    expect(continueFlow).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(continueFlow).toHaveBeenCalledTimes(1);
  });
});