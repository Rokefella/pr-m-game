import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import DevMenu from './DevMenu';
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