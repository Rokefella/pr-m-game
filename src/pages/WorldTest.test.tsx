import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import WorldTest from './WorldTest';
const f = vi.hoisted(() => ({ registration: 1, level: 1, signedIn: true, reads: [] as string[], rpc: vi.fn(), mutation: vi.fn() }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: f.signedIn ? { id: 'player' } : null, loading: false }) }));
vi.mock('@/components/Thumbstick', () => ({ default: ({ onMove }: { onMove: (x: number, y: number) => void }) => <button onClick={() => onMove(1, 0)}>Walk east</button> }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: f.rpc, from: (table: string) => {
  f.reads.push(table);
  const result = () => ({ error: null, data: table === 'users' ? { registration_number: f.registration, aura_color: null, level: f.level } : table === 'world_terrain_types' ? [{ key: 'path', name: 'Path', grp: 'ground', walkable: true, enabled: true, steps: null }] : table === 'world_eras' ? [{ order_index: 1, name: 'Fire', ring_from: 0, ring_to: 500, step_cost: 1.5 }] : table === 'world_places' ? [{ name: 'Start', kind: 'start', x: 25, y: 25 }, { name: 'Cinder Hollow', kind: 'maze_entrance', maze_level: 1, x: 300, y: 31, notes: 'Ash' }] : { day_night: {} } });
  const chain = { select: () => chain, eq: () => chain, order: () => chain, maybeSingle: async () => result(), then: (r: (v: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(r), insert: f.mutation, update: f.mutation, delete: f.mutation, upsert: f.mutation };
  return chain;
} } }));
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); f.registration = 1; f.level = 1; f.signedIn = true; f.reads = []; f.mutation.mockReset();
  f.rpc.mockReset().mockImplementation(async (_name, args) => ({ error: null, data: { x0: args.p_x0, y0: args.p_y0, w: 64, h: 64, keys: ['path'], rows: Array.from({ length: 64 }, () => Array(64).fill(0)) } }));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const Location = () => <output aria-label="Current URL">{useLocation().pathname}</output>;
const open = (path = '/world') => render(<MemoryRouter initialEntries={[path]}><Location /><Routes><Route path="/world" element={<WorldTest />} /><Route path="/world-test" element={<Navigate to="/world" replace />} /><Route path="/login" element={<p>Login</p>} /><Route path="/village" element={<p>Village</p>} /></Routes></MemoryRouter>);
describe('world sandbox access and read-only movement', () => {
  it('allows any signed-in player regardless of registration number', async () => {
    f.registration = 2; open(); await screen.findByText('25,25 · A 0,0 · Fire');
    expect(f.reads).toContain('world_places'); expect(f.mutation).not.toHaveBeenCalled();
  });
  it('redirects signed-out players to login without reading world data', async () => {
    f.signedIn = false; open(); await screen.findByText('Login');
    expect(f.reads).toEqual([]); expect(f.rpc).not.toHaveBeenCalled();
  });
  it('redirects the old URL to /world', async () => {
    open('/world-test'); await screen.findByText('25,25 · A 0,0 · Fire');
    expect(screen.getByLabelText('Current URL').textContent).toBe('/world');
  });
  it('reopens at the last position with a fresh session counter, and can restart at the start', async () => {
    const view = open(); await screen.findByText('25,25 · A 0,0 · Fire');
    await waitFor(() => expect(f.rpc).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Walk east' }));
    await screen.findByText('26,25 · A 0,0 · Fire'); view.unmount();
    open(); await screen.findByText('26,25 · A 0,0 · Fire');
    expect(screen.getByText(/SPENT 0/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^JUMP$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'RESTART AT START' }));
    await screen.findByText('25,25 · A 0,0 · Fire');
    expect(f.mutation).not.toHaveBeenCalled();
  });
  it('starts at 25,25, spends session-only tile cost and jumps without writes', async () => {
    open(); await screen.findByText('25,25 · A 0,0 · Fire');
    await waitFor(() => expect(f.rpc).toHaveBeenCalledWith('world_window', { p_x0: 0, p_y0: 0, p_w: 64, p_h: 64 }));
    fireEvent.click(screen.getByRole('button', { name: 'Walk east' }));
    await screen.findByText('26,25 · A 0,0 · Fire');
    expect(screen.getByText(/SPENT 1.5/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^JUMP$/ }));
    fireEvent.click(screen.getByRole('button', { name: /Cinder Hollow/ }));
    await screen.findByText('300,31 · A 6,0 · Fire');
    expect(screen.queryByRole('dialog', { name: 'Cinder Hollow' })).toBeNull();
    expect(f.mutation).not.toHaveBeenCalled();
    expect(f.rpc.mock.calls.every(([name]) => name === 'world_window')).toBe(true);
  });
});
describe('world return', () => {
  it('opens at a pending world return once, then clears it', async () => {
    localStorage.setItem('praem.worldReturn', JSON.stringify({ layer: 0, x: 40, y: 30 }));
    open(); await screen.findByText('40,30 · A 0,0 · Fire');
    expect(localStorage.getItem('praem.worldReturn')).toBeNull();
  });
  it('walking onto a completed maze entrance shows Completed for a higher-level player', async () => {
    localStorage.setItem('praem.worldPos', JSON.stringify({ layer: 0, x: 299, y: 31 }));
    f.level = 3; open(); await screen.findByText('299,31 · A 5,0 · Fire');
    await waitFor(() => expect(f.rpc).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 200));
    fireEvent.click(screen.getByRole('button', { name: 'Walk east' }));
    await screen.findByRole('dialog', { name: 'Cinder Hollow, Level 1' });
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ENTER' })).toBeNull();
  });
});
