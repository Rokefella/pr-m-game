import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import FireRestCard from './FireRestCard';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase', () => ({ supabase: { rpc } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('settles spending before resting and passes the returned balance, not a guessed addition', async () => {
  const order: string[] = [], steps = vi.fn();
  rpc.mockImplementation(async () => { order.push('rest'); return { data: { ok: true, steps: 50, steps_remaining: 149 }, error: null }; });
  render(<FireRestCard findKey="fire_1" beforeRest={async () => { order.push('flush'); }} onSteps={steps} />);
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(steps).toHaveBeenCalledWith(149));
  expect(order).toEqual(['flush', 'rest']); expect(rpc).toHaveBeenCalledWith('rest_at_fire', { p_find_key: 'fire_1' });
});
it('does not grant a second daily rest at the same fire', async () => {
  rpc.mockResolvedValue({ data: { ok: false, reason: 'rested_today' }, error: null });
  const steps = vi.fn(); render(<FireRestCard findKey="fire_1" beforeRest={async () => {}} onSteps={steps} />);
  fireEvent.click(screen.getByRole('button')); await screen.findByRole('status'); expect(steps).not.toHaveBeenCalled();
});it('ignores a second tap while the rest request is in flight', async () => {
  let release: (v: unknown) => void = () => undefined;
  rpc.mockImplementation(() => new Promise(r => { release = r; }));
  render(<FireRestCard findKey="fire_1" beforeRest={async () => {}} onSteps={vi.fn()} />);
  const button = screen.getByRole('button');
  fireEvent.click(button); fireEvent.click(button);
  await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
  release({ data: { ok: true, steps_remaining: 10 }, error: null });
  await screen.findByRole('status');
  expect(rpc).toHaveBeenCalledTimes(1);
});
