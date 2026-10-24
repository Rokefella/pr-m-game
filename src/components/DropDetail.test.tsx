import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DropDetail } from './DropDetail';

const f = vi.hoisted(() => ({ rpc: vi.fn(), read: vi.fn() }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'player' } }) }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: f.rpc, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: f.read }) }) }) } }));
afterEach(cleanup);
beforeEach(() => {
  f.rpc.mockReset().mockResolvedValue({ data: { ok: true, dye_key: 'dye_blue', name: 'Blue', color: '#4a7bd8' }, error: null });
  f.read.mockReset().mockResolvedValue({ data: { aura_color: '#4a7bd8', orb_dye: 'dye_blue' }, error: null });
});
const dye = { id: 'first', name: 'Blue', description: 'A blue dye.', category: 'dye', icon_svg: null };

describe('consumable dyes', () => {
  it('consumes each instance even when the same colour is already applied', async () => {
    const onUsed = vi.fn();
    const view = render(<DropDetail drop={dye} onClose={() => {}} onUsed={onUsed} />);
    fireEvent.click(screen.getByRole('button', { name: 'USE' }));
    await waitFor(() => expect(onUsed).toHaveBeenCalledTimes(1));
    view.rerender(<DropDetail drop={{ ...dye, id: 'second' }} onClose={() => {}} onUsed={onUsed} />);
    fireEvent.click(screen.getByRole('button', { name: 'USE' }));
    await waitFor(() => expect(onUsed).toHaveBeenCalledTimes(2));
    expect(f.rpc.mock.calls).toEqual([['use_dye', { p_drop_id: 'first' }], ['use_dye', { p_drop_id: 'second' }]]);
    expect(onUsed).toHaveBeenLastCalledWith('Your orb turns Blue.', { aura_color: '#4a7bd8', orb_dye: 'dye_blue' });
    expect(f.read).toHaveBeenCalledTimes(2);
  });
  it('uses the refreshed saved colour rather than a stale response', async () => {
    f.read.mockResolvedValue({ data: { aura_color: '#f4f4ff', orb_dye: 'dye_white' }, error: null });
    const onUsed = vi.fn();
    render(<DropDetail drop={dye} onClose={() => {}} onUsed={onUsed} />);
    fireEvent.click(screen.getByRole('button', { name: 'USE' }));
    await waitFor(() => expect(onUsed).toHaveBeenCalledWith('Your orb turns Blue.', { aura_color: '#f4f4ff', orb_dye: 'dye_white' }));
  });
  it('keeps successful consumption successful if the refresh fails', async () => {
    f.read.mockRejectedValue(new Error('offline'));
    const onUsed = vi.fn();
    render(<DropDetail drop={dye} onClose={() => {}} onUsed={onUsed} />);
    fireEvent.click(screen.getByRole('button', { name: 'USE' }));
    await waitFor(() => expect(onUsed).toHaveBeenCalledWith('Your orb turns Blue.', { aura_color: '#4a7bd8', orb_dye: 'dye_blue' }));
  });
  it('does not remove the drop or change colour when consumption fails', async () => {
    f.rpc.mockResolvedValue({ error: new Error('failed'), data: null });
    const onUsed = vi.fn();
    render(<DropDetail drop={dye} onClose={() => {}} onUsed={onUsed} />);
    fireEvent.click(screen.getByRole('button', { name: 'USE' }));
    await screen.findByText('No signal. Try again.');
    expect(onUsed).not.toHaveBeenCalled();
    expect(f.read).not.toHaveBeenCalled();
  });
});

describe('mechanic consumption', () => {
  const maze = { level: 2, position: () => ({ col: 11, row: 12 }) };
  const mechanic = (name: string) => ({ ...dye, name, category: 'mechanic' });
  it.each([
    ['Step Pouch', 'steps'], ['Spare Lace', 'steps'], ['Second Wind', 'steps'],
    ['Lantern Oil', 'lantern'], ['Trail Chalk', 'chalk'], ['Echo Pebble', 'pulse'],
    ['Lucky Coin', 'lucky'], ['Map Scrap', 'reveal'], ['Compass Shard', 'compass'], ['Magnet Charm', 'magnet'],
  ])('consumes %s with the server effect', async (name, effect) => {
    f.rpc.mockResolvedValue({ data: { ok: true, effect, amount: 100, steps_remaining: 200 }, error: null });
    const onUsed = vi.fn(), onRefresh = vi.fn();
    render(<DropDetail drop={mechanic(name)} maze={maze} steps={100} onClose={() => {}} onUsed={onUsed} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByRole('button', { name: 'USE' }));
    await waitFor(() => expect(onUsed).toHaveBeenCalledTimes(1));
    expect(f.rpc).toHaveBeenCalledWith('use_mechanic', { p_drop_id: 'first', p_level: effect === 'steps' ? null : 2, p_col: effect === 'steps' ? null : 11, p_row: effect === 'steps' ? null : 12 });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
  it('does not call for a run-only mechanic outside the maze', () => {
    render(<DropDetail drop={mechanic('Map Scrap')} onClose={() => {}} onUsed={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'USE' }));
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it('does not call at the 5000 step cap', () => {
    render(<DropDetail drop={mechanic('Step Pouch')} steps={5000} onClose={() => {}} onUsed={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'USE' }));
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it('keeps an already-active drop and refreshes after the attempt', async () => {
    f.rpc.mockResolvedValue({ data: { ok: false, reason: 'already_active' }, error: null });
    const onUsed = vi.fn(), onRefresh = vi.fn();
    render(<DropDetail drop={mechanic('Lucky Coin')} maze={maze} onClose={() => {}} onUsed={onUsed} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByRole('button', { name: 'USE' }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    expect(onUsed).not.toHaveBeenCalled();
  });
  it('waits for earlier movement saves before the server grant', async () => {
    let release: (() => void) | undefined;
    const beforeUse = () => new Promise<void>(resolve => { release = resolve; });
    render(<DropDetail drop={mechanic('Step Pouch')} maze={{ ...maze, beforeUse }} onClose={() => {}} onUsed={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'USE' }));
    expect(f.rpc).not.toHaveBeenCalled();
    release?.();
    await waitFor(() => expect(f.rpc).toHaveBeenCalledTimes(1));
  });
});