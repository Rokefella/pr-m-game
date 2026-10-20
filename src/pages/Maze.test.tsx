import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Maze from './Maze';
import { getActiveRun, startRun } from '@/lib/runState';

const fixture = vi.hoisted(() => ({
  level: 2, beta: true, flags: 0, consoleDoor: false,
  dropPoints: false,
  placements: [] as { col: number; row: number; name: string; kind: 'key' | 'drop' }[],
  rpc: vi.fn(),
  rows: [] as { prime_number: number; banked: boolean; level: number }[],
  deletes: [] as unknown[][][],
}));
vi.mock('@/context/AuthContext', () => {
  const user = { id: 'player' };
  return { useAuth: () => ({ user, loading: false }) };
});
vi.mock('@/lib/config', () => ({ get BETA_MODE() { return fixture.beta; } }));
vi.mock('@/lib/userData', () => ({
  fetchOrCreateUser: async () => ({ level: fixture.level, credits: 50, steps_remaining: 100, registration_number: 2, subscription_status: 'trial' }),
  updateUser: vi.fn(),
}));
vi.mock('@/lib/dailySteps', () => ({ waitForDailySteps: async () => {} }));
vi.mock('@/lib/questFlags', () => ({ getAllFlags: async () => {}, getFlag: () => fixture.flags }));
vi.mock('@/lib/levelLoader', () => ({ loadLevelFromSupabase: async () => ({
  cols: 5, rows: 5, spawn: { col: 1, row: 1 },
  openSet: new Set(['1,1', '2,1', '3,1']), specialSet: new Set(),
  fragments: [{ col: 2, row: 1, prime: 23 }, { col: 3, row: 1, prime: 47 }],
  door: { col: 4, row: 4 }, creditDoors: [], eggs: [], fragmentsRequired: 2,
  visualCells: fixture.consoleDoor ? [{ col: 2, row: 1, type: 'CONSOLE_DOOR' }] : fixture.dropPoints ? [{ col: 2, row: 1, type: 'DROP_SPAWN' }, { col: 3, row: 1, type: 'DROP' }] : [],
}) }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: fixture.rpc, from: (table: string) => {
  let deleting = false;
  const filters: unknown[][] = [];
  const result = () => {
    if (table !== 'fragments') return { data: [], error: null };
    if (deleting) {
      fixture.deletes.push(filters);
      fixture.rows = fixture.rows.filter((row) => row.banked);
      return { data: null, error: null };
    }
    return { data: [...fixture.rows], error: null };
  };
  const chain = {
    select: () => chain,
    delete: () => { deleting = true; return chain; },
    eq: (...args: unknown[]) => { filters.push(args); return chain; },
    maybeSingle: async () => result(),
    then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
  };
  return chain;
} } }));
vi.mock('@/components/ProfileOverlay', () => ({ default: () => null, ProfileButton: () => null }));
vi.mock('@/components/PaywallOverlay', () => ({ default: ({ onContinue, onDismiss }: { onContinue: () => void; onDismiss: () => void }) => <><button onClick={onContinue}>Paywall continue</button><button onClick={onDismiss}>Paywall dismiss</button></> }));
vi.mock('@/components/Thumbstick', () => ({ default: ({ onMove }: { onMove: (c: number, r: number) => void }) => <button onClick={() => onMove(1, 0)}>Move right</button> }));

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  fixture.level = 2; fixture.beta = true; fixture.flags = 0; fixture.deletes = [];
  fixture.consoleDoor = false;
  fixture.dropPoints = false;
  fixture.placements = [];
  fixture.rpc.mockReset().mockImplementation(async (name: string) => ({ data: name === 'start_run_drops' ? fixture.placements : { granted: true, drop_name: 'Brass key', kind: 'key' }, error: null }));
  fixture.rows = [
    { prime_number: 23, banked: false, level: 2 },
    { prime_number: 47, banked: false, level: 2 },
    { prime_number: 89, banked: true, level: 1 },
  ];
});

describe('Server-owned maze run drops', () => {
  beforeEach(() => {
    fixture.dropPoints = true;
    fixture.placements = [{ col: 2, row: 1, name: 'Brass key', kind: 'key' }, { col: 3, row: 1, name: 'Spice', kind: 'drop' }];
  });
  it('requests a fresh roll only after fresh-run forfeiture', async () => {
    fixture.rpc.mockImplementation(async (name: string) => {
      if (name === 'start_run_drops') expect(fixture.deletes).toHaveLength(1);
      return { data: fixture.placements, error: null };
    });
    openMaze(); await ready(0);
    await waitFor(() => expect(fixture.rpc).toHaveBeenCalledWith('start_run_drops', { p_level: 2, p_resume: false }));
    expect(fixture.rpc).toHaveBeenCalledTimes(1);
  });
  it.each(['stored run', 'room return'])('preserves server placements on %s', async (entry) => {
    if (entry === 'stored run') startRun('player', 2);
    else {
      sessionStorage.setItem('praem_maze_return_col', '1');
      sessionStorage.setItem('praem_maze_return_row', '1');
    }
    openMaze(); await ready(2);
    await waitFor(() => expect(fixture.rpc).toHaveBeenCalledWith('start_run_drops', { p_level: 2, p_resume: true }));
    expect(fixture.deletes).toHaveLength(0);
  });
  it('claims a filled point once, announces a grant, then never reclaims that point', async () => {
    startRun('player', 2); openMaze(); await ready(2);
    await waitFor(() => expect(fixture.rpc).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Move right' }));
    await screen.findByText('You found: Brass key.');
    expect(fixture.rpc).toHaveBeenCalledWith('claim_run_drop', { p_level: 2, p_col: 2, p_row: 1 });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    await new Promise(resolve => setTimeout(resolve, 190));
    fireEvent.keyUp(window, { key: 'ArrowLeft' });
    await new Promise(resolve => setTimeout(resolve, 170));
    fireEvent.click(screen.getByRole('button', { name: 'Move right' }));
    expect(fixture.rpc.mock.calls.filter(([name]) => name === 'claim_run_drop')).toHaveLength(1);
  });
  it.each(['empty', 'already_carried', 'error', 'throw'])('silently handles a %s claim and keeps movement working', async (reason) => {
    fixture.rpc.mockImplementation(async (name: string) => {
      if (name === 'start_run_drops') return { data: fixture.placements, error: null };
      if (reason === 'throw') throw new Error('Offline');
      return { data: { granted: false, reason }, error: reason === 'error' ? { message: 'Offline' } : null };
    });
    startRun('player', 2); openMaze(); await ready(2);
    await waitFor(() => expect(fixture.rpc).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Move right' }));
    await waitFor(() => expect(fixture.rpc).toHaveBeenCalledWith('claim_run_drop', { p_level: 2, p_col: 2, p_row: 1 }));
    expect(screen.queryByText(/You found:/)).toBeNull();
    await new Promise(resolve => setTimeout(resolve, 170));
    fireEvent.click(screen.getByRole('button', { name: 'Move right' }));
    await waitFor(() => expect(fixture.rpc).toHaveBeenCalledWith('claim_run_drop', { p_level: 2, p_col: 3, p_row: 1 }));
  });
  it('loads no placements on a server error without blocking the maze', async () => {
    fixture.rpc.mockResolvedValue({ data: null, error: { message: 'Offline' } });
    startRun('player', 2); openMaze(); await ready(2);
    await waitFor(() => expect(fixture.rpc).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Move right' }));
    expect(fixture.rpc).toHaveBeenCalledTimes(1);
    expect(screen.getByText('STEPS 99')).toBeInTheDocument();
  });
  it('does not invent a key when the server returns only a normal drop', async () => {
    fixture.placements = [{ col: 3, row: 1, name: 'Spice', kind: 'drop' }];
    startRun('player', 2); openMaze(); await ready(2);
    await waitFor(() => expect(fixture.rpc).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Move right' }));
    expect(fixture.rpc).toHaveBeenCalledTimes(1);
  });
});
afterEach(cleanup);
const openMaze = () => render(<MemoryRouter initialEntries={['/maze']}><Routes>
  <Route path="/maze" element={<Maze />} />
  <Route path="/village" element={<span>Village destination</span>} />
  <Route path="/room/1/console_room" element={<span>Console room destination</span>} />
</Routes></MemoryRouter>);
const ready = async (n: number) => {
  await screen.findByText(`FRAGMENTS ${n}/2`);
  await waitFor(() => expect(getActiveRun('player', 2)).not.toBeNull());
};

describe('Maze run entry and deliberate exits', () => {
  it('opens a console at level 2 without stage requirements and preserves the carried run and exact return cell', async () => {
    fixture.consoleDoor = true; startRun('player', 2);
    openMaze(); await ready(2);
    fireEvent.click(screen.getByRole('button', { name: 'Move right' }));
    await screen.findByText('Console room destination');
    expect(sessionStorage.getItem('praem_maze_return_col')).toBe('2');
    expect(sessionStorage.getItem('praem_maze_return_row')).toBe('1');
    expect(getActiveRun('player', 2)).not.toBeNull();
    expect(fixture.deletes).toHaveLength(0);
    expect(fixture.rows.filter(row => !row.banked)).toHaveLength(2);
  });
  it('fresh entry deletes every unbanked row, including other levels, and restores zero', async () => {
    fixture.rows.push({ prime_number: 139, banked: false, level: 1 });
    openMaze(); await ready(0);
    expect(fixture.rows).toEqual([{ prime_number: 89, banked: true, level: 1 }]);
    expect(fixture.deletes).toEqual([[['user_id', 'player'], ['banked', false]]]);
  });
  it('restores two fragments when reopening within twelve hours', async () => {
    startRun('player', 2); openMaze(); await ready(2);
    expect(fixture.deletes).toHaveLength(0);
    expect(fixture.rows.filter((row) => !row.banked)).toHaveLength(2);
  });
  it('preserves both fragments on room return even after the stored run expires', async () => {
    sessionStorage.setItem('praem_maze_return_col', '2');
    sessionStorage.setItem('praem_maze_return_row', '1');
    localStorage.setItem('praem_run', JSON.stringify({ userId: 'player', level: 2, startedAt: Date.now() - 12 * 60 * 60 * 1000 }));
    openMaze(); await ready(2);
    expect(sessionStorage.getItem('praem_maze_return_col')).toBeNull();
    expect(fixture.deletes).toHaveLength(0);
  });
  it.each(['LEAVE'])('%s forfeits two unbanked fragments and ends the run despite the legacy Shadow flag', async (exit) => {
    startRun('player', 2); sessionStorage.setItem('visited_shadow_this_run', 'true');
    openMaze(); await ready(2);
    if (exit === 'LEAVE') fireEvent.click(screen.getByRole('button', { name: 'EXIT MAZE' }));
    fireEvent.click(screen.getByRole('button', { name: exit }));
    await screen.findByText('Village destination');
    expect(localStorage.getItem('praem_run')).toBeNull();
    expect(fixture.rows).toEqual([{ prime_number: 89, banked: true, level: 1 }]);
  });
  it.each(['Paywall continue', 'Paywall dismiss'])('%s uses the same forfeiture flow', async (exit) => {
    startRun('player', 2); fixture.beta = false; fixture.flags = 6;
    openMaze(); await ready(2);
    fireEvent.click(screen.getByRole('button', { name: exit }));
    await screen.findByText('Village destination');
    expect(getActiveRun('player', 2)).toBeNull();
    expect(fixture.rows.filter((row) => !row.banked)).toHaveLength(0);
  });
  it('the level-three placeholder RETURN ends its run', async () => {
    fixture.level = 3; startRun('player', 3);
    openMaze(); await screen.findByText('The next level is not yet open.');
    fireEvent.click(screen.getByRole('button', { name: 'RETURN' }));
    await screen.findByText('Village destination');
    expect(getActiveRun('player', 3)).toBeNull();
    expect(fixture.rows.filter((row) => !row.banked)).toHaveLength(0);
  });
});