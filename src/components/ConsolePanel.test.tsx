import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ConsolePanel from './ConsolePanel';
import { consoleLevel } from '@/lib/console';
import { INVENTORY_CHANGED } from '@/lib/inventoryEvents';
import { PRAEMS_CHANGED } from '@/lib/praems';
const api = vi.hoisted(() => ({ rpc: vi.fn(), chime: vi.fn(), unlock: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: api.rpc } }));
vi.mock('@/lib/praems', () => ({ PRAEMS_CHANGED: 'praem:praems-changed', praemTone: api.chime, unlockPraemAudio: api.unlock }));
const puzzle = { ok: true, done: false, target: -195, primes: [4483, 181, 1499, 2917, 4297], have: 5, need: 5, has_key: true, key_drop_id: 'key-id', key_name: 'Copper key', locked: false, retry_in_seconds: 0, attempts_left: 3 };
beforeEach(() => { vi.resetAllMocks(); api.rpc.mockResolvedValue({ data: puzzle, error: null }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
async function open(state = puzzle) {
  api.rpc.mockResolvedValueOnce({ data: state, error: null });
  const onClose = vi.fn();
  const view = render(<ConsolePanel open level={4} onClose={onClose} />);
  await waitFor(() => expect(api.rpc).toHaveBeenCalledWith('console_state', { p_level: 4 }));
  await act(async () => { await Promise.resolve(); });
  return { ...view, onClose };
}
const speak = () => fireEvent.click(screen.getByRole('button', { name: 'Speak' }));
describe('console Præm puzzle', () => {
  it('uses positive integer levels, defaulting to one', () => {
    expect(consoleLevel('7')).toBe(7);
    for (const value of [null, '', 'bad', '1.5', '0', '-2']) expect(consoleLevel(value)).toBe(1);
  });
  it('silent closes without showing a card', async () => {
    const onClose = vi.fn();
    api.rpc.mockResolvedValue({ data: { ok: false, reason: 'silent' }, error: null });
    render(<ConsolePanel open level={4} onClose={onClose} />);
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('done is dark and cannot submit', async () => {
    await open({ ...puzzle, done: true });
    expect(screen.getByRole('status').textContent).toContain('It has nothing more to give.');
    expect(screen.queryByRole('button', { name: 'Speak' })).toBeNull();
    expect(screen.queryByLabelText('Target: -195')).toBeNull();
  });
  it('no key shows its name and blocks the puzzle', async () => {
    await open({ ...puzzle, has_key: false, key_drop_id: null });
    expect(screen.getByRole('status').textContent).toContain("It wants something you don't have yet.");
    expect(screen.getByRole('status').textContent).toContain('Key: Copper key');
    expect(screen.queryByRole('button', { name: 'Speak' })).toBeNull();
  });
  it('missing fragments displays carried primes and the server counter', async () => {
    await open({ ...puzzle, have: 3, primes: [181, 1499, 2917] });
    expect(screen.getByRole('status').textContent).toContain('3 / 5');
    expect(screen.getByRole('status').textContent).toContain('Something is still missing in here.');
    expect(screen.getByRole('button', { name: 'Plus 181' })).toBeDisabled();
  });
  it('starts ascending positive terms; flips signs and sends exactly the chosen terms once', async () => {
    await open();
    expect(screen.getAllByRole('button', { name: /Plus/ }).map(b => b.getAttribute('aria-label'))).toEqual(['Plus 181', 'Plus 1499', 'Plus 2917', 'Plus 4297', 'Plus 4483']);
    fireEvent.click(screen.getByRole('button', { name: 'Plus 1499' }));
    fireEvent.click(screen.getByRole('button', { name: 'Plus 4297' }));
    api.rpc.mockResolvedValue({ data: { ok: false, reason: 'wrong', attempts_left: 2 }, error: null });
    speak(); speak();
    await waitFor(() => expect(api.rpc).toHaveBeenCalledWith('console_praem', { p_level: 4, p_terms: [181, -1499, 2917, -4297, 4483], p_drop_id: 'key-id' }));
    expect(api.rpc.mock.calls.filter(([fn]) => fn === 'console_praem')).toHaveLength(1);
    expect(screen.getByRole('status').textContent).toContain('Not that. 2 left.');
  });
  it('never exposes the all-positive or flipped running total', async () => {
    await open();
    expect(screen.queryByText('13377')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Plus 1499' }));
    expect(screen.queryByText('10379')).toBeNull();
    expect(screen.queryByLabelText(/total/i)).toBeNull();
    expect(screen.getByLabelText('Target: -195').textContent).toBe('−195');
  });
  it('locked counts down and reloads server state before allowing another attempt', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    await open({ ...puzzle, locked: true, retry_in_seconds: 3 });
    expect(screen.getByRole('status').textContent).toContain('00:03');
    expect(screen.queryByRole('button', { name: 'Speak' })).toBeNull();
    vi.setSystemTime(Date.now() + 3000);
    await waitFor(() => expect(api.rpc).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: 'Speak' })).toBeEnabled();
  });
  it('success publishes both persisted refreshes, chimes, shows the receipt then closes', async () => {
    const inventory = vi.fn(), praems = vi.fn();
    window.addEventListener(INVENTORY_CHANGED, inventory); window.addEventListener(PRAEMS_CHANGED, praems);
    const { onClose } = await open();
    vi.useFakeTimers();
    api.rpc.mockResolvedValue({ data: { ok: true, praem: 'Cinder', icon_svg: '<svg/>', icon_lit: '<svg/>' }, error: null });
    speak();
    await act(async () => { await Promise.resolve(); });
    expect(inventory).toHaveBeenCalledOnce(); expect(praems).toHaveBeenCalledOnce(); expect(api.chime).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status').textContent).toContain('Cinder — it sleeps. Carry it home to the Shadow Realm.');
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(4500); });
    expect(onClose).toHaveBeenCalledOnce();
    window.removeEventListener(INVENTORY_CHANGED, inventory); window.removeEventListener(PRAEMS_CHANGED, praems);
  });
  it.each(['no_key', 'missing_fragments', 'done', 'locked'])('handles submission reply %s without awarding anything', async reason => {
    await open();
    api.rpc.mockImplementation(async fn => ({ data: fn === 'console_state' ? puzzle : { ok: false, reason, retry_in_seconds: 60 }, error: null }));
    speak();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Speak' })).toBeNull());
    expect(api.chime).not.toHaveBeenCalled();
  });
  it('zero attempts enters the server lockout', async () => {
    await open();
    api.rpc.mockImplementation(async fn => ({ data: fn === 'console_state' ? { ...puzzle, locked: true, retry_in_seconds: 90 } : { ok: false, reason: 'wrong', attempts_left: 0 }, error: null }));
    speak();
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('01:30'));
    expect(screen.queryByRole('button', { name: 'Speak' })).toBeNull();
  });
  it('reopens with a fresh target and all signs reset', async () => {
    const view = await open();
    fireEvent.click(screen.getByRole('button', { name: 'Plus 1499' }));
    view.rerender(<ConsolePanel open={false} level={4} onClose={view.onClose} />);
    api.rpc.mockResolvedValue({ data: { ...puzzle, target: 801 }, error: null });
    view.rerender(<ConsolePanel open level={4} onClose={view.onClose} />);
    await waitFor(() => expect(screen.getByLabelText('Target: 801')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Plus 1499' })).toHaveAttribute('aria-pressed', 'false');
    expect(api.rpc).not.toHaveBeenCalledWith('use_console', expect.anything());
  });
});
