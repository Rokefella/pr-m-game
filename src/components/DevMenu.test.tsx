import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import DevMenu from './DevMenu';
import { USER_STEPS_REFRESHED, USER_CREDITS_REFRESHED } from '@/lib/mechanics';
import { WorldSteps } from '@/lib/worldSteps';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase', () => ({ supabase: { rpc, from: vi.fn() } }));
afterEach(() => { cleanup(); rpc.mockReset(); });
function Location() { return <output aria-label="Destination">{useLocation().pathname}</output>; }
describe('complete dev restart', () => {
  it('requires in-app confirmation, calls the existing RPC and navigates to intro preserving auth', async () => {
    rpc.mockResolvedValue({ data: { ok: true, rows_cleared: 10 }, error: null });
    localStorage.setItem('praem-auth-token', 'retained'); localStorage.setItem('praem.worldPos', 'old');
    render(<MemoryRouter><Location /><DevMenu open userId="self" home="world" onClose={() => {}} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'GO BACK TO START' })); expect(rpc).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'CANCEL' })); expect(rpc).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'GO BACK TO START' }));
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRM' }));
    await waitFor(() => expect(screen.getByLabelText('Destination').textContent).toBe('/intro'));
    expect(rpc).toHaveBeenCalledExactlyOnceWith('dev_go_back_to_start');
    expect(localStorage.getItem('praem.worldPos')).toBeNull(); expect(localStorage.getItem('praem-auth-token')).toBe('retained');
  });
});
describe('dev top-ups', () => {
  it.each([
    ['+100 CREDITS', 100, 0],
    ['+1000 CREDITS', 1000, 0],
    ['+1000 STEPS', 0, 1000],
    ['STEPS FULL (9,999)', 0, 9999],
    ['CREDITS → 0', -999999, 0],
  ])('%s sends the requested amounts and publishes authoritative balances', async (label, credits, steps) => {
    const updatedSteps = vi.fn(); const updatedCredits = vi.fn();
    window.addEventListener(USER_STEPS_REFRESHED, updatedSteps);
    window.addEventListener(USER_CREDITS_REFRESHED, updatedCredits);
    rpc.mockResolvedValue({ data: { ok: true, credits: 1050, steps_remaining: 9999 }, error: null });
    render(<MemoryRouter><DevMenu open userId="self" onClose={() => {}} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: label }));
    await waitFor(() => expect(updatedSteps).toHaveBeenCalledTimes(1));
    expect(rpc).toHaveBeenCalledExactlyOnceWith('dev_topup', { p_credits: credits, p_steps: steps });
    expect(updatedSteps.mock.calls[0][0].detail).toEqual({ userId: 'self', steps: 9999 });
    expect(updatedCredits.mock.calls[0][0].detail).toEqual({ userId: 'self', credits: 1050 });
    window.removeEventListener(USER_STEPS_REFRESHED, updatedSteps);
    window.removeEventListener(USER_CREDITS_REFRESHED, updatedCredits);
  });
  it('settles an in-flight world spend before topping up and syncing the ledger', async () => {
    let finishSpend: ((value: number) => void) | undefined;
    const ledger = new WorldSteps(50, () => new Promise(resolve => { finishSpend = resolve; }), () => {});
    ledger.move(2); const saving = ledger.flush(); await Promise.resolve();
    const refreshed = (event: Event) => ledger.refresh((event as CustomEvent).detail.steps);
    window.addEventListener(USER_STEPS_REFRESHED, refreshed);
    rpc.mockResolvedValue({ data: { ok: true, credits: 1050, steps_remaining: 1048 }, error: null });
    render(<MemoryRouter><DevMenu open userId="self" onClose={() => {}} onBeforeTopup={() => ledger.flush()} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: '+1000 STEPS' }));
    expect(rpc).not.toHaveBeenCalled();
    finishSpend?.(48); await saving;
    await waitFor(() => expect(ledger.balance).toBe(1048));
    await ledger.flush(); expect(ledger.balance).toBe(1048); expect(ledger.pending).toBe(0);
    window.removeEventListener(USER_STEPS_REFRESHED, refreshed);
  });
  it('does not publish balances on failure', async () => {
    const refreshed = vi.fn(); window.addEventListener(USER_STEPS_REFRESHED, refreshed);
    rpc.mockResolvedValue({ data: { ok: false, reason: 'Dev only.' }, error: null });
    render(<MemoryRouter><DevMenu open userId="self" onClose={() => {}} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: '+100 CREDITS' }));
    await screen.findByText('Dev only.'); expect(refreshed).not.toHaveBeenCalled();
    window.removeEventListener(USER_STEPS_REFRESHED, refreshed);
  });
});