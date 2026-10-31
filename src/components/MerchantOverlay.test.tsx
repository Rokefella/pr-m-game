import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import MerchantOverlay, { type MerchantItem } from './MerchantOverlay';

const f = vi.hoisted(() => ({ stock: vi.fn(), spendCredits: vi.fn(async () => ({ ok: true, credits: 30 })) }));
vi.mock('@/lib/merchantItems', () => ({ loadTraderItems: f.stock }));
vi.mock('@/lib/serverGame', () => ({ spendCredits: f.spendCredits }));
vi.mock('@/components/NpcPortrait', () => ({ default: () => null }));
vi.mock('@/components/theme/objects/NpcOrb', () => ({ default: () => null }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/hooks/useNpcQuestStates', () => ({ NPC_DIALOGUE_CLOSED: 'npc-dialogue-closed', useNpcQuestStates: () => () => undefined }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const base = { open: true, onClose: () => {}, palette: 'green' as const, title: 'The Merchant.', openingLines: ['Hello.'], userId: 'u1' };
const stepsItem = (onPurchase: MerchantItem['onPurchase']): MerchantItem => ({ key: 'steps', label: '500 Steps', cost: 5, maxQty: 20, serverSide: true, onPurchase });

it('buys steps server-side with a receipt and no client credit write', async () => {
  const onCreditsChange = vi.fn();
  render(<MerchantOverlay {...base} credits={50} onCreditsChange={onCreditsChange}
    items={[stepsItem(async (q) => ({ receipt: `+${q * 500} steps · −${q * 5} credits`, credits: 50 - q * 5 }))]} />);
  fireEvent.click(screen.getByRole('button', { name: 'BUY' }));
  expect(await screen.findByText('+500 steps · −5 credits')).toBeInTheDocument();
  expect(onCreditsChange).toHaveBeenCalledWith(45);
  expect(f.spendCredits).not.toHaveBeenCalled();
});

it('shows the server failure reason without touching credits', async () => {
  const onCreditsChange = vi.fn();
  render(<MerchantOverlay {...base} credits={50} onCreditsChange={onCreditsChange}
    items={[stepsItem(async () => ({ failure: 'Your steps are full.' }))]} />);
  fireEvent.click(screen.getByRole('button', { name: 'BUY' }));
  expect(await screen.findByText('Your steps are full.')).toBeInTheDocument();
  expect(onCreditsChange).not.toHaveBeenCalled();
});

it('steps the quantity up to the max and buys that many packs', async () => {
  const onPurchase = vi.fn(async (q: number) => ({ receipt: `+${q * 500} steps · −${q * 5} credits`, credits: 500 - q * 5 }));
  render(<MerchantOverlay {...base} credits={500} onCreditsChange={() => {}} items={[stepsItem(onPurchase)]} />);
  fireEvent.click(screen.getByRole('button', { name: 'More 500 Steps' }));
  fireEvent.click(screen.getByRole('button', { name: 'More 500 Steps' }));
  expect(screen.getByText('3')).toBeInTheDocument();
  expect(screen.getByText('15c')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Max 500 Steps' }));
  expect(screen.getByText('20')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'BUY' }));
  expect(await screen.findByText('+10000 steps · −100 credits')).toBeInTheDocument();
  expect(onPurchase).toHaveBeenCalledWith(20);
});

it('refuses locally when credits cannot cover the quantity', async () => {
  const onPurchase = vi.fn();
  render(<MerchantOverlay {...base} credits={9} onCreditsChange={() => {}} items={[stepsItem(onPurchase)]} />);
  fireEvent.click(screen.getByRole('button', { name: 'More 500 Steps' }));
  fireEvent.click(screen.getByRole('button', { name: 'BUY' }));
  expect(await screen.findByText('Not enough credits.')).toBeInTheDocument();
  expect(onPurchase).not.toHaveBeenCalled();
});

it('saves legacy item credits through spend_credits', async () => {
  const onCreditsChange = vi.fn();
  const item: MerchantItem = { key: 'visibility', label: 'Visibility +2 cells (this run)', cost: 20, onPurchase: () => 'Acquired.' };
  render(<MerchantOverlay {...base} credits={50} onCreditsChange={onCreditsChange} items={[item]} />);
  fireEvent.click(screen.getByRole('button', { name: 'BUY' }));
  expect(await screen.findByText('Acquired.')).toBeInTheDocument();
  expect(onCreditsChange).toHaveBeenCalledWith(30);
  expect(f.spendCredits).toHaveBeenCalledWith(20, 'visibility');
});
it('reloads conditional stock on each world merchant opening but not in village', async () => {
  f.stock.mockResolvedValue([{ key: 'spice', label: 'Spice', cost: 40, serverSide: true, onPurchase: async () => ({ receipt: 'Wrapped.', credits: 10 }) }]);
  const view = render(<MerchantOverlay {...base} home="world" credits={50} onCreditsChange={() => {}} items={[stepsItem(() => {})]} />);
  await screen.findByText('Spice');
  expect(f.stock).toHaveBeenCalledExactlyOnceWith('u1');
  view.rerender(<MerchantOverlay {...base} open={false} home="world" credits={50} onCreditsChange={() => {}} items={[]} />);
  f.stock.mockResolvedValue([]);
  view.rerender(<MerchantOverlay {...base} home="world" credits={50} onCreditsChange={() => {}} items={[stepsItem(() => {})]} />);
  expect(f.stock).toHaveBeenCalledTimes(2);
  view.rerender(<MerchantOverlay {...base} home="village" credits={50} onCreditsChange={() => {}} items={[]} />);
  expect(f.stock).toHaveBeenCalledTimes(2);
});
