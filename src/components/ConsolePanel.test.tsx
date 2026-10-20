import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ConsolePanel from './ConsolePanel';
import { consoleLevel } from '@/lib/console';

const api = vi.hoisted(() => ({ rpc: vi.fn(), maybeSingle: vi.fn(), eq: vi.fn(), drops: vi.fn() }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'player' } }) }));
vi.mock('@/lib/supabase', () => ({ supabase: {
  rpc: api.rpc,
  from: (table: string) => ({ select: () => ({ eq: (...args: unknown[]) => { api.eq(...args); return table === 'drops' ? api.drops() : { maybeSingle: api.maybeSingle }; } }) }),
} }));
beforeEach(() => { vi.resetAllMocks(); api.maybeSingle.mockResolvedValue({ data: null, error: null }); api.drops.mockResolvedValue({ data: [], error: null }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
async function open(level = 4, onRift = vi.fn(), onClose = vi.fn()) {
  render(<ConsolePanel open level={level} onClose={onClose} onRift={onRift} />);
  await waitFor(() => expect(screen.getByRole('button', { name: '2' })).not.toBeDisabled());
  return { onRift, onClose };
}
function digit(n = '2') { fireEvent.click(screen.getByRole('button', { name: n })); }
function enter() { fireEvent.click(screen.getByRole('button', { name: 'ENTER' })); }

describe('console server interaction rules', () => {
  it('uses a positive integer query level or defaults to 1', () => {
    expect(consoleLevel('7')).toBe(7);
    for (const input of [null, '', 'bad', '1.5', '0', '-2']) expect(consoleLevel(input)).toBe(1);
  });
  it('sends the originating level and digits once and clears a wrong code', async () => {
    api.rpc.mockResolvedValue({ data: { ok: false, reason: 'wrong', attempts_left: 2 }, error: null });
    await open(); digit(); enter(); enter();
    await waitFor(() => expect(screen.getByRole('button', { name: 'ENTER' })).toBeDisabled());
    expect(api.rpc).toHaveBeenCalledExactlyOnceWith('use_console', { p_level: 4, p_code: '2', p_drop_id: null });
  });
  it('caps input at 8 digits and supports deletion and clearing', async () => {
    api.rpc.mockResolvedValue({ data: { ok: false, reason: 'silent' }, error: null });
    await open(); for (let i = 0; i < 9; i++) digit();
    fireEvent.click(screen.getByRole('button', { name: 'DEL' })); enter();
    await waitFor(() => expect(api.rpc).toHaveBeenCalledWith('use_console', { p_level: 4, p_code: '2222222', p_drop_id: null }));
    fireEvent.click(screen.getByRole('button', { name: 'CLEAR' }));
    expect(screen.getByRole('button', { name: 'ENTER' })).toBeDisabled();
  });
  it('blocks keypad and submissions until the server lockout ends', async () => {
    api.rpc.mockResolvedValue({ data: { ok: false, reason: 'locked', retry_in_seconds: 3 }, error: null });
    await open(); vi.useFakeTimers(); digit(); enter();
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('button', { name: '2' })).toBeDisabled();
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(screen.getByRole('button', { name: '2' })).not.toBeDisabled();
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
    expect(api.rpc).toHaveBeenCalledExactlyOnceWith('use_console', { p_level: 6, p_code: '0', p_drop_id: null });
    fireEvent.click(screen.getByRole('button', { name: 'ENTER THE RIFT' }));
    expect(onRift).toHaveBeenCalledExactlyOnceWith('amber');
  });
  it('ignores an in-flight answer after closing', async () => {
    let resolve: (answer: unknown) => void = () => {};
    api.rpc.mockImplementation(() => new Promise(done => { resolve = done; }));
    const onRift = vi.fn(); const onClose = vi.fn();
    const view = render(<ConsolePanel open level={2} onClose={onClose} onRift={onRift} />);
    await waitFor(() => expect(screen.getByRole('button', { name: '2' })).not.toBeDisabled());
    digit(); enter();
    fireEvent.click(screen.getByRole('button', { name: 'Close console' })); expect(onClose).toHaveBeenCalledTimes(1);
    view.rerender(<ConsolePanel open={false} level={2} onClose={onClose} onRift={onRift} />);
    await act(async () => { resolve({ data: { ok: true, rift: 'purple' }, error: null }); });
    expect(onRift).not.toHaveBeenCalled();
  });
  it('sends a selected carried drop UUID and removes it on wrong_key without using a try', async () => {
    api.drops.mockResolvedValue({ data: [
      { id: 'spice-id', drop_types: { name: 'Spice', category: 'spice' } },
      { id: 'key-id', drop_types: [{ name: 'Copper key', category: 'key' }] },
    ], error: null });
    api.rpc.mockResolvedValue({ data: { ok: false, reason: 'wrong_key' }, error: null });
    await open(); fireEvent.click(screen.getByRole('button', { name: 'Insert key' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copper key' })).toBeEnabled());
    const carried = screen.getByLabelText('Carried drops');
    expect(Array.from(carried.querySelectorAll('button')).map(button => button.textContent)).toEqual(['Copper key', 'Spice']);
    fireEvent.click(screen.getByRole('button', { name: 'Copper key' })); digit(); enter();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Insert key' })).toBeEnabled());
    expect(api.rpc).toHaveBeenCalledExactlyOnceWith('use_console', { p_level: 4, p_code: '2', p_drop_id: 'key-id' });
    enter();
    await waitFor(() => expect(api.rpc).toHaveBeenLastCalledWith('use_console', { p_level: 4, p_code: '2', p_drop_id: null }));
  });
  it('allows removing an inserted key without submitting it', async () => {
    api.drops.mockResolvedValue({ data: [{ id: 'key-id', drop_types: { name: 'Key', category: 'key' } }], error: null });
    await open(); fireEvent.click(screen.getByRole('button', { name: 'Insert key' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Key' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Key' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove inserted key' }));
    digit(); api.rpc.mockResolvedValue({ data: { ok: false, reason: 'no_key' }, error: null }); enter();
    await waitFor(() => expect(api.rpc).toHaveBeenCalledExactlyOnceWith('use_console', { p_level: 4, p_code: '2', p_drop_id: null }));
  });
});