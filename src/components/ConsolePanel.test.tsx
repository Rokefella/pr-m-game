import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ConsolePanel from './ConsolePanel';
import { consoleLevel } from '@/lib/console';

const api = vi.hoisted(() => ({ rpc: vi.fn(), maybeSingle: vi.fn(), eq: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: {
  rpc: api.rpc,
  from: () => ({ select: () => ({ eq: (...args: unknown[]) => { api.eq(...args); return { maybeSingle: api.maybeSingle }; } }) }),
} }));
beforeEach(() => { vi.resetAllMocks(); api.maybeSingle.mockResolvedValue({ data: null, error: null }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
async function open(level = 4, onRift = vi.fn(), onClose = vi.fn()) {
  render(<ConsolePanel open level={level} onClose={onClose} onRift={onRift} />);
  await waitFor(() => expect(screen.getByRole('button', { name: '2', exact: true })).not.toBeDisabled());
  return { onRift, onClose };
}
function digit(n = '2') { fireEvent.click(screen.getByRole('button', { name: n, exact: true })); }
function enter() { fireEvent.click(screen.getByRole('button', { name: 'ENTER', exact: true })); }

describe('console server interaction rules', () => {
  it('uses a positive integer query level or defaults to 1', () => {
    expect(consoleLevel('7')).toBe(7);
    for (const input of [null, '', 'bad', '1.5', '0', '-2']) expect(consoleLevel(input)).toBe(1);
  });
  it('sends the originating level and digits once and clears a wrong code', async () => {
    api.rpc.mockResolvedValue({ data: { ok: false, reason: 'wrong', attempts_left: 2 }, error: null });
    await open(); digit(); enter(); enter();
    await waitFor(() => expect(screen.getByRole('button', { name: 'ENTER', exact: true })).toBeDisabled());
    expect(api.rpc).toHaveBeenCalledExactlyOnceWith('use_console', { p_level: 4, p_code: '2' });
  });
  it('caps input at 12 digits and supports deletion and clearing', async () => {
    api.rpc.mockResolvedValue({ data: { ok: false, reason: 'silent' }, error: null });
    await open(); for (let i = 0; i < 13; i++) digit();
    fireEvent.click(screen.getByRole('button', { name: 'DEL', exact: true })); enter();
    await waitFor(() => expect(api.rpc).toHaveBeenCalledWith('use_console', { p_level: 4, p_code: '22222222222' }));
    fireEvent.click(screen.getByRole('button', { name: 'CLEAR', exact: true }));
    expect(screen.getByRole('button', { name: 'ENTER', exact: true })).toBeDisabled();
  });
  it('blocks keypad and submissions until the server lockout ends', async () => {
    api.rpc.mockResolvedValue({ data: { ok: false, reason: 'locked', retry_in_seconds: 3 }, error: null });
    await open(); vi.useFakeTimers(); digit(); enter();
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('button', { name: '2', exact: true })).toBeDisabled();
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(screen.getByRole('button', { name: '2', exact: true })).not.toBeDisabled();
    expect(api.rpc).toHaveBeenCalledTimes(1);
  });
  it('waits 500ms before sending a successful rift target to the room', async () => {
    api.rpc.mockResolvedValue({ data: { ok: true, rift: 'teal' }, error: null });
    const { onRift } = await open(); vi.useFakeTimers(); digit(); enter();
    await act(async () => { await Promise.resolve(); });
    await act(async () => { vi.advanceTimersByTime(499); });
    expect(onRift).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(onRift).toHaveBeenCalledExactlyOnceWith('teal');
  });
  it('reads a previous unlock and retrieves its rift once using code 0', async () => {
    api.maybeSingle.mockResolvedValue({ data: { level_number: 6 }, error: null });
    api.rpc.mockResolvedValue({ data: { ok: true, already: true, rift: 'amber' }, error: null });
    const onRift = vi.fn();
    render(<ConsolePanel open level={6} onClose={vi.fn()} onRift={onRift} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'ENTER THE RIFT' })).not.toBeDisabled());
    expect(api.eq).toHaveBeenCalledWith('level_number', 6);
    expect(api.rpc).toHaveBeenCalledExactlyOnceWith('use_console', { p_level: 6, p_code: '0' });
    fireEvent.click(screen.getByRole('button', { name: 'ENTER THE RIFT' }));
    expect(onRift).toHaveBeenCalledExactlyOnceWith('amber');
  });
  it('ignores an in-flight answer after closing', async () => {
    let resolve: (answer: unknown) => void = () => {};
    api.rpc.mockImplementation(() => new Promise(done => { resolve = done; }));
    const onRift = vi.fn(); const onClose = vi.fn();
    const view = render(<ConsolePanel open level={2} onClose={onClose} onRift={onRift} />);
    await waitFor(() => expect(screen.getByRole('button', { name: '2', exact: true })).not.toBeDisabled());
    digit(); enter();
    fireEvent.click(screen.getByRole('button', { name: 'Close console' })); expect(onClose).toHaveBeenCalledTimes(1);
    view.rerender(<ConsolePanel open={false} level={2} onClose={onClose} onRift={onRift} />);
    await act(async () => { resolve({ data: { ok: true, rift: 'purple' }, error: null }); });
    expect(onRift).not.toHaveBeenCalled();
  });
});