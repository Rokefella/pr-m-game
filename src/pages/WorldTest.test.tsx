import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import WorldTest from './WorldTest';
const f = vi.hoisted(() => ({ uid: 'player', granted: 0, registration: 1, level: 1, completed: 0, steps: 100, credits: 50, pending: false, newLevel: 2, social: 2, flags: { sam_stage: '0', bernard_stage: '0' }, signedIn: true, reads: [] as string[], rpc: vi.fn(), mutation: vi.fn(), presence: vi.fn(), places: [] as Record<string, unknown>[] }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: f.signedIn ? { id: f.uid } : null, loading: false }) }));
vi.mock('@/components/ProfileOverlay', () => ({ default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => isOpen ? <div role="dialog" aria-label="Profile"><button onClick={onClose}>Close profile</button></div> : null, ProfileButton: ({ onClick }: { onClick: () => void }) => <button onClick={onClick}>Open profile</button> }));
vi.mock('@/components/Thumbstick', () => ({ default: ({ onMove }: { onMove: (x: number, y: number) => void }) => <button onClick={() => onMove(1, 0)}>Walk east</button> }));
vi.mock('@/hooks/useNpcQuestStates', () => ({ useNpcQuestStates: () => () => 'none', useNpcDisplayName: () => 'Merchant', NPC_DIALOGUE_CLOSED: 'npc-closed' }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: f.rpc, from: (table: string) => {
  f.reads.push(table);
  const result = () => ({ error: null, data: table === 'users' ? { registration_number: f.registration, aura_color: null, level: f.level, maze_completed_level: f.completed, steps_remaining: f.steps, credits: f.credits, levelup_pending: f.pending, levelup_newlevel: f.newLevel, social: f.social, title: 'Wanderer' } : table === 'quest_flags' ? Object.entries(f.flags).map(([flag_key, flag_value]) => ({ flag_key, flag_value })) : table === 'world_terrain_types' ? [{ key: 'path', name: 'Path', grp: 'ground', walkable: true, enabled: true, steps: null }, { key: 'wall', walkable: false, enabled: true }] : table === 'world_eras' ? [{ order_index: 1, name: 'Fire', ring_from: 0, ring_to: 500, step_cost: 1.5 }] : table === 'world_places' ? [{ name: 'Start', kind: 'start', x: 25, y: 25 }, { name: 'Cinder Hollow', kind: 'maze_entrance', maze_level: 1, x: 300, y: 31, notes: 'Ash' }, ...f.places] : table === 'world_settings' ? { day_night: {} } : [] });
  const chain = { select: () => chain, eq: () => chain, gte: () => chain, order: () => chain, limit: () => chain, maybeSingle: async () => result(), then: (r: (v: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(r), insert: f.mutation, update: (patch: Record<string, unknown>) => { f.mutation(patch); return chain; }, delete: f.mutation, upsert: table === 'player_positions' ? f.presence : f.mutation };
  return chain;
} } }));
beforeEach(() => {
  localStorage.clear(); localStorage.setItem('praem.worldLayoutVersion', '5'); sessionStorage.clear(); f.registration = 1; f.level = 1; f.signedIn = true; f.reads = []; f.places = []; f.mutation.mockReset().mockResolvedValue({ error: null });
  f.uid += 'x'; f.granted = 0; f.completed = 0; f.steps = 100; f.credits = 50; f.pending = false; f.newLevel = 2; f.social = 2; f.flags = { sam_stage: '0', bernard_stage: '0' };
  f.presence.mockReset().mockResolvedValue({ error: null });
  f.rpc.mockReset().mockImplementation(async (name, args) => ({ error: null, data: name === 'spend_world_steps' ? (f.steps = Math.max(0, f.steps - args.p_amount)) : name === 'claim_daily_steps' ? f.granted : name === 'buy_steps' ? (f.credits -= args.p_packs * 5, f.steps += args.p_packs * 500, { ok: true, packs: args.p_packs, cost: args.p_packs * 5, credits: f.credits, steps_remaining: f.steps }) : { x0: args.p_x0, y0: args.p_y0, w: 64, h: 64, keys: ['path'], rows: Array.from({ length: 64 }, () => Array(64).fill(0)) } }));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const Location = () => <output aria-label="Current URL">{useLocation().pathname}</output>;
const open = (path = '/world') => render(<MemoryRouter initialEntries={[path]}><Location /><Routes><Route path="/world" element={<WorldTest />} /><Route path="/world-test" element={<Navigate to="/world" replace />} /><Route path="/login" element={<p>Login</p>} /><Route path="/village" element={<p>Village</p>} /></Routes></MemoryRouter>);
describe('world sandbox access and read-only movement', () => {
  it('M opens and closes the map and pauses walking while open', async () => {
    open(); await screen.findByText('25,25 · A 0,0 · Fire');
    fireEvent.keyDown(window, { key: 'm' }); await screen.findByRole('dialog', { name: 'World map' });
    fireEvent.click(screen.getByRole('button', { name: 'Walk east' }));
    expect(screen.getByText('25,25 · A 0,0 · Fire')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'm' }); expect(screen.queryByRole('dialog', { name: 'World map' })).toBeNull();
  });
  it('allows any signed-in player regardless of registration number', async () => {
    f.registration = 2; open(); await screen.findByRole('button', { name: 'MAP' });
    expect(screen.queryByRole('button', { name: 'JUMP' })).toBeNull();
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
    expect(f.mutation.mock.calls.every(([payload]) => payload.user_id === f.uid && typeof payload.bits === 'string')).toBe(true);
  });
  it('starts at 25,25, spends tile cost and jumps without additional spending', async () => {
    open(); await screen.findByText('25,25 · A 0,0 · Fire');
    await waitFor(() => expect(f.rpc).toHaveBeenCalledWith('world_window', { p_x0: 0, p_y0: 0, p_w: 64, p_h: 64 }));
    fireEvent.click(screen.getByRole('button', { name: 'Walk east' }));
    await screen.findByText('26,25 · A 0,0 · Fire');
    expect(screen.getByText(/SPENT 1.5/)).toBeInTheDocument();
    expect(screen.getByText(/STEPS\s+98/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^JUMP$/ }));
    fireEvent.click(screen.getByRole('button', { name: /Cinder Hollow/ }));
    await screen.findByText('300,31 · A 6,0 · Fire');
    expect(screen.queryByRole('dialog', { name: 'Cinder Hollow' })).toBeNull();
    expect(f.mutation).not.toHaveBeenCalled();
    expect(f.rpc.mock.calls.every(([name]) => name === 'world_window' || name === 'claim_daily_steps')).toBe(true);
  });
});
describe('World home mechanics', () => {
  it('updates credits immediately for the active user only', async () => {
    open(); await screen.findByText(/CREDITS\s+50/);
    fireEvent(window, new CustomEvent('praem:user-credits-refreshed', { detail: { userId: 'other', credits: 500 } }));
    expect(screen.getByText(/CREDITS\s+50/)).toBeInTheDocument();
    fireEvent(window, new CustomEvent('praem:user-credits-refreshed', { detail: { userId: f.uid, credits: 65 } }));
    expect(screen.getByText(/CREDITS\s+65/)).toBeInTheDocument();
  });
  it('refreshes the users row on a steps notification and pauses for Profile', async () => {
    open(); await screen.findByText(/STEPS\s+100/);
    f.steps = 150; f.credits = 80;
    window.dispatchEvent(new CustomEvent('praem:user-steps-refreshed', { detail: { userId: f.uid, steps: 150 } }));
    await screen.findByText(/CREDITS\s+80/); expect(screen.getByText(/STEPS\s+150/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open profile' }));
    fireEvent.click(screen.getByRole('button', { name: 'Walk east' }));
    expect(screen.getByText('25,25 · A 0,0 · Fire')).toBeInTheDocument();
  });
  it('persists pending steps when leaving through the dev shortcut', async () => {
    open(); await screen.findByText('25,25 · A 0,0 · Fire');
    await waitFor(() => expect(f.rpc).toHaveBeenCalledWith('world_window', expect.anything()));
    fireEvent.click(screen.getByRole('button', { name: 'Walk east' }));
    await screen.findByText(/STEPS\s+98/);
    const plate = screen.getByRole('button', { name: 'Registration number' });
    for (let i = 0; i < 5; i++) fireEvent.pointerDown(plate);
    fireEvent.click(await screen.findByRole('button', { name: 'OLD VILLAGE' }));
    await waitFor(() => expect(f.rpc).toHaveBeenCalledWith('spend_world_steps', { p_amount: 1 }));
  });
  it('subtracts pending fractional costs from a refreshed user balance', async () => {
    open(); await screen.findByText('25,25 · A 0,0 · Fire');
    await waitFor(() => expect(f.rpc).toHaveBeenCalledWith('world_window', expect.anything()));
    fireEvent.click(screen.getByRole('button', { name: 'Walk east' }));
    await screen.findByText(/STEPS\s+98/);
    f.steps = 150;
    window.dispatchEvent(new CustomEvent('praem:user-steps-refreshed', { detail: { userId: f.uid, steps: 150 } }));
    await screen.findByText(/STEPS\s+148/);
    expect(f.rpc.mock.calls.filter(([name]) => name === 'spend_world_steps')).toHaveLength(0);
  });
  it('buys 500 steps for 5 credits through the server and updates the world HUD', async () => {
    f.places = [{ kind: 'town', action: 'merchant', name: 'Merchant', x: 27, y: 25 }];
    open(); await screen.findByText('25,25 · A 0,0 · Fire');
    await waitFor(() => expect(f.rpc).toHaveBeenCalledWith('world_window', expect.anything()));
    fireEvent.click(screen.getByRole('button', { name: 'Walk east' }));
    fireEvent.click(await screen.findByRole('button', { name: 'BUY' }));
    await waitFor(() => expect(f.rpc).toHaveBeenCalledWith('buy_steps', { p_packs: 1 }));
    await screen.findByText('+500 steps · −5 credits');
    await screen.findByText(/STEPS\s+599/);
    expect(screen.getByText(/CREDITS\s+45/)).toBeInTheDocument();
    expect(f.mutation.mock.calls.every(([payload]) => payload.steps_remaining === undefined && payload.credits === undefined)).toBe(true);
  });
  it('shows the server reason when buying steps fails', async () => {
    f.places = [{ kind: 'town', action: 'merchant', name: 'Merchant', x: 27, y: 25 }];
    open(); await screen.findByText('25,25 · A 0,0 · Fire');
    await waitFor(() => expect(f.rpc).toHaveBeenCalledWith('world_window', expect.anything()));
    f.rpc.mockImplementation(async (name, args) => ({ error: null, data: name === 'buy_steps' ? { ok: false, reason: 'not_enough_credits' } : name === 'spend_world_steps' ? (f.steps = Math.max(0, f.steps - args.p_amount)) : { x0: args.p_x0, y0: args.p_y0, w: 64, h: 64, keys: ['path'], rows: Array.from({ length: 64 }, () => Array(64).fill(0)) } }));
    fireEvent.click(screen.getByRole('button', { name: 'Walk east' }));
    fireEvent.click(await screen.findByRole('button', { name: 'BUY' }));
    await screen.findByText('Not enough credits.');
    expect(screen.getByText(/CREDITS\s+50/)).toBeInTheDocument();
  });
  it('claims and announces the daily gift once across World remounts', async () => {
    f.granted = 250; const view = open(); await screen.findByText('The day gives you 250 steps.');
    view.unmount(); open(); await screen.findByRole('button', { name: 'MAP' });
    await new Promise(r => setTimeout(r, 50));
    expect(screen.queryByText('The day gives you 250 steps.')).toBeNull();
    expect(f.rpc.mock.calls.filter(([name]) => name === 'claim_daily_steps')).toHaveLength(1);
  });
  it('shows arrivals from level two and continues with title, pending reset, level and social plus one', async () => {
    f.pending = true; f.flags.bernard_stage = '5'; open();
    await screen.findByRole('dialog', { name: 'Level arrival' }, { timeout: 3000 });
    fireEvent.click(screen.getByRole('button', { name: 'CONTINUE' }));
    await waitFor(() => expect(f.mutation).toHaveBeenCalledWith({ title: 'Fragment Seeker', levelup_pending: false, levelup_newlevel: 0, level: 2, social: 3 }));
  });
  it('does not show an arrival card for level one', async () => {
    f.pending = true; f.newLevel = 1; open(); await screen.findByRole('button', { name: 'MAP' });
    await new Promise(r => setTimeout(r, 2100));
    expect(screen.queryByRole('dialog', { name: 'Level arrival' })).toBeNull();
  });
  it('opens the World dev menu after five taps and keeps Old Village as a dev shortcut', async () => {
    open(); const plate = await screen.findByRole('button', { name: 'Registration number' });
    for (let i = 0; i < 5; i++) fireEvent.pointerDown(plate);
    fireEvent.click(await screen.findByRole('button', { name: 'OLD VILLAGE' }));
    await screen.findByText('Village');
  });
});
describe('world return', () => {
  it('discards obsolete saved coordinates and saves layout version 2 at Start', async () => {
    localStorage.removeItem('praem.worldLayoutVersion');
    localStorage.setItem('praem.worldPos', JSON.stringify({ layer: 0, x: 299, y: 31 }));
    open(); await screen.findByText('25,25 · A 0,0 · Fire');
    expect(localStorage.getItem('praem.worldLayoutVersion')).toBe('5');
    expect(JSON.parse(localStorage.getItem('praem.worldPos') ?? '{}')).toEqual({ layer: 0, x: 25, y: 25 });
  });
  it('recovers a blocked saved position to the nearest walkable cell after loading', async () => {
    localStorage.setItem('praem.worldPos', JSON.stringify({ layer: 0, x: 30, y: 30 }));
    f.rpc.mockImplementation(async (_name, args) => {
      const rows = Array.from({ length: 64 }, () => Array(64).fill(0)); rows[30][30] = 1;
      return { error: null, data: { x0: args.p_x0, y0: args.p_y0, w: 64, h: 64, keys: ['path', 'wall'], rows } };
    });
    open(); await screen.findByText('29,30 · A 0,0 · Fire', {}, { timeout: 2500 });
    expect(f.mutation).not.toHaveBeenCalled();
  });
  it.each([
    { kind: 'npc_home', name: 'Sam', notes: 'Clearing notes' },
    { kind: 'town', action: 'merchant', name: 'Emberfold: merchant', notes: 'Market notes' },
  ])('opens adjacent conversation cards without Home or door places: $name', async spot => {
    f.places = [{ ...spot, x: 27, y: 25 }];
    open(); await screen.findByText('25,25 · A 0,0 · Fire');
    await waitFor(() => expect(f.rpc).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 160));
    fireEvent.click(screen.getByRole('button', { name: 'Walk east' }));
    if (spot.action === 'merchant') await screen.findByText('The Merchant.');
    else await screen.findByRole('dialog', { name: spot.name });
    fireEvent.click(screen.getByRole('button', { name: spot.action === 'merchant' ? 'LEAVE' : /^Close$/ }));
    expect(screen.queryByRole('dialog')).toBeNull(); expect(f.mutation).not.toHaveBeenCalled();
  });
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
    await screen.findByRole('dialog', { name: 'Cinder Hollow' });
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ENTER' })).toBeNull();
  });
});
