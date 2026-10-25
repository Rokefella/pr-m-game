import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WorldTest from './WorldTest';
const f = vi.hoisted(() => ({ registration: 1, reads: [] as string[], rpc: vi.fn(), mutation: vi.fn() }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'player' }, loading: false }) }));
vi.mock('@/components/Thumbstick', () => ({ default: ({ onMove }: { onMove: (x: number, y: number) => void }) => <button onClick={() => onMove(1, 0)}>Walk east</button> }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: f.rpc, from: (table: string) => {
  f.reads.push(table);
  const result = () => ({ error: null, data: table === 'users' ? { registration_number: f.registration, aura_color: null } : table === 'world_terrain_types' ? [{ key: 'path', name: 'Path', grp: 'ground', walkable: true, enabled: true, steps: null }] : table === 'world_eras' ? [{ order_index: 1, name: 'Fire', ring_from: 0, ring_to: 500, step_cost: 1.5 }] : table === 'world_places' ? [{ name: 'Start', kind: 'start', x: 25, y: 25 }, { name: 'Cinder Hollow', kind: 'maze_entrance', maze_level: 1, x: 300, y: 31, notes: 'Ash' }] : { day_night: {} } });
  const chain = { select: () => chain, eq: () => chain, order: () => chain, maybeSingle: async () => result(), then: (r: (v: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(r), insert: f.mutation, update: f.mutation, delete: f.mutation, upsert: f.mutation };
  return chain;
} } }));
beforeEach(() => {
  f.registration = 1; f.reads = []; f.mutation.mockReset();
  f.rpc.mockReset().mockImplementation(async (_name, args) => ({ error: null, data: { x0: args.p_x0, y0: args.p_y0, w: 64, h: 64, keys: ['path'], rows: Array.from({ length: 64 }, () => Array(64).fill(0)) } }));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const open = () => render(<MemoryRouter initialEntries={['/world-test']}><Routes><Route path="/world-test" element={<WorldTest />} /><Route path="/village" element={<p>Village</p>} /></Routes></MemoryRouter>);
describe('world sandbox access and read-only movement', () => {
  it('rejects non-dev direct navigation before loading any world data', async () => {
    f.registration = 2; open(); await screen.findByText('Village');
    expect(f.reads).toEqual(['users']); expect(f.rpc).not.toHaveBeenCalled();
  });
  it('starts at 25,25, spends session-only tile cost and jumps without writes', async () => {
    open(); await screen.findByText('25,25 · A 0,0 · Fire');
    await waitFor(() => expect(f.rpc).toHaveBeenCalledWith('world_window', { p_x0: 0, p_y0: 0, p_w: 64, p_h: 64 }));
    fireEvent.click(screen.getByRole('button', { name: 'Walk east' }));
    await screen.findByText('26,25 · A 0,0 · Fire');
    expect(screen.getByText(/SPENT 1.5/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^JUMP$/ }));
    fireEvent.click(screen.getByRole('button', { name: /Cinder Hollow/ }));
    await screen.findByRole('dialog', { name: 'Cinder Hollow' });
    expect(screen.getByText('300,31 · A 6,0 · Fire')).toBeInTheDocument();
    expect(f.mutation).not.toHaveBeenCalled();
    expect(f.rpc.mock.calls.every(([name]) => name === 'world_window')).toBe(true);
  });
});