import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import SuppliesCard from './SuppliesCard';
import GameHud from './GameHud';

const f = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: f.rpc } }));
vi.mock('@/lib/userData', () => ({ updateUser: vi.fn() }));
vi.mock('@/components/NpcPortrait', () => ({ default: () => null }));
vi.mock('@/components/ProfileOverlay', () => ({ ProfileButton: () => null }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/hooks/useNpcQuestStates', () => ({ NPC_DIALOGUE_CLOSED: 'npc-dialogue-closed', useNpcQuestStates: () => () => undefined }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('buys 500 steps at 0 steps and 50 credits through buy_steps', async () => {
  f.rpc.mockResolvedValue({ data: { ok: true, packs: 1, cost: 5, credits: 45, steps_remaining: 500 }, error: null });
  const onBalances = vi.fn();
  render(<MemoryRouter><SuppliesCard open onClose={() => {}} userId="u1" steps={0} credits={50} onBalances={onBalances} /></MemoryRouter>);
  expect(screen.getByText('Supplies')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'BUY' }));
  expect(await screen.findByText('+500 steps · −5 credits')).toBeInTheDocument();
  expect(f.rpc).toHaveBeenCalledWith('buy_steps', { p_packs: 1 });
  expect(onBalances).toHaveBeenLastCalledWith(500, 45);
});

it('shows "Not enough credits." when the server refuses', async () => {
  f.rpc.mockResolvedValue({ data: { ok: false, reason: 'not_enough_credits' }, error: null });
  render(<MemoryRouter><SuppliesCard open onClose={() => {}} userId="u1" steps={0} credits={50} onBalances={() => {}} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'BUY' }));
  expect(await screen.findByText('Not enough credits.')).toBeInTheDocument();
});

it('closes when tapping outside the card', () => {
  const onClose = vi.fn();
  render(<MemoryRouter><SuppliesCard open onClose={onClose} userId="u1" steps={0} credits={50} onBalances={() => {}} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('dialog', { name: 'Supplies' }));
  expect(onClose).toHaveBeenCalled();
});

it('HUD steps and credits counters open supplies', () => {
  const open = vi.fn();
  render(<GameHud stepsRemaining={0} credits={50} currentLevel={1} registrationNumber={2} growthPoints={0} subscriptionStatus={null} trialDaysRemaining={0} onOpenProfile={() => {}} onOpenDevMenu={() => {}} onOpenSupplies={open} />);
  fireEvent.click(screen.getByRole('button', { name: 'Add steps' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add credits' }));
  expect(open).toHaveBeenCalledTimes(2);
});
