import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FindCard from './FindCard';
import type { WorldFind } from '@/lib/worldFinds';
const api = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: api.rpc } }));
vi.mock('@/lib/skins', () => ({ useSkins: () => [], skinForDrop: () => null, isPlayerSkin: () => true }));
const find: WorldFind = { id: 'n-count', find_key: 'n_count', x: 211, y: 27, layer: 0, kind: 'words', title: 'A note under a stone', text: 'Counted steps.', visibility: 'glint', drop_key: 'words_note_count' };
afterEach(cleanup);
beforeEach(() => api.rpc.mockReset());
describe('find claims', () => {
  it('Read it claims n_count from the adjacent approach cell and refreshes the Folder', async () => {
    api.rpc.mockResolvedValue({ data: { ok: true, kind: 'words' }, error: null });
    const claimed = vi.fn(), rewarded = vi.fn();
    render(<FindCard find={find} reading={false} at={() => ({ x: 210, y: 27 })} onClaimed={claimed} onRewarded={rewarded} />);
    fireEvent.click(screen.getByRole('button', { name: 'Read it' }));
    await waitFor(() => expect(claimed).toHaveBeenCalledWith('n-count'));
    expect(api.rpc).toHaveBeenCalledWith('claim_find', { p_find: 'n-count', p_x: 210, p_y: 27 });
    expect(rewarded).toHaveBeenCalledTimes(1);
  });
  it('reopening a claimed note never grants it again', () => {
    render(<FindCard find={find} reading={true} at={() => ({ x: 210, y: 27 })} onClaimed={vi.fn()} />);
    expect(api.rpc).not.toHaveBeenCalled();
  });
  it.each(['too_far', 'needs', 'error'])('does not mark a refused %s claim and permits retry', async reason => {
    api.rpc.mockResolvedValue({ data: { ok: false, reason }, error: null });
    const claimed = vi.fn(), rewarded = vi.fn();
    render(<FindCard find={find} reading={false} at={() => ({ x: 210, y: 27 })} onClaimed={claimed} onRewarded={rewarded} />);
    fireEvent.click(screen.getByRole('button', { name: 'Read it' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Read it' })).not.toBeDisabled());
    expect(claimed).not.toHaveBeenCalled(); expect(rewarded).not.toHaveBeenCalled();
    api.rpc.mockResolvedValue({ data: { ok: true }, error: null });
    fireEvent.click(screen.getByRole('button', { name: 'Read it' }));
    await waitFor(() => expect(claimed).toHaveBeenCalledTimes(1));
  });
  it('cairn success refreshes owned words through the same claim flow', async () => {
    api.rpc.mockResolvedValue({ data: { ok: true, kind: 'landmark', drop_name: 'Stones counted: two' }, error: null });
    const rewarded = vi.fn();
    render(<FindCard find={{ ...find, kind: 'landmark' }} reading={false} at={() => ({ x: 210, y: 27 })} onClaimed={vi.fn()} onRewarded={rewarded} />);
    fireEvent.click(screen.getByRole('button', { name: 'Look closer' }));
    await waitFor(() => expect(rewarded).toHaveBeenCalledTimes(1));
  });
});