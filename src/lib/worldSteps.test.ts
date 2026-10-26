import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindWorldStepFlush, stepWalkDuration, WorldSteps } from './worldSteps';
afterEach(() => vi.useRealTimers());
function setup(saved = 100) {
  let server = saved;
  const spend = vi.fn(async (n: number) => (server = Math.max(0, server - n)));
  return { spend, ledger: new WorldSteps(saved, spend, vi.fn()) };
}
describe('World steps', () => {
  it('accumulates fractional costs and preserves the fraction after flush', async () => {
    const { ledger, spend } = setup(); ledger.move(1.5); ledger.move(1.5); ledger.move(1.5);
    expect(ledger.balance).toBe(95); await ledger.flush();
    expect(spend).toHaveBeenCalledExactlyOnceWith(4); expect(ledger.pending).toBe(.5); expect(ledger.balance).toBe(95);
  });
  it('splits spend into calls of no more than 2000', async () => {
    const { ledger, spend } = setup(10000); ledger.move(4500.5); await ledger.flush();
    expect(spend.mock.calls).toEqual([[2000], [2000], [500]]); expect(ledger.pending).toBe(.5);
  });
  it('walks freely at zero with 3 times terrain duration and recovers on a grant', () => {
    const { ledger } = setup(0); ledger.move(1.5);
    expect(ledger.pending).toBe(0); expect(stepWalkDuration(300, ledger.balance)).toBe(900);
    ledger.refresh(500); expect(stepWalkDuration(300, ledger.balance)).toBe(300);
  });
  it('keeps pending spending when a user row is refreshed', () => {
    const { ledger } = setup(); ledger.move(1.5); ledger.refresh(150);
    expect(ledger.pending).toBe(1.5); expect(ledger.balance).toBe(148);
  });
  it('flushes at 20 completed moves', async () => {
    const { ledger, spend } = setup(); for (let i = 0; i < 20; i++) ledger.move(1.5);
    await ledger.flush(); expect(spend).toHaveBeenCalledExactlyOnceWith(30);
  });
  it('flushes every 3 seconds', async () => {
    vi.useFakeTimers(); const { ledger, spend } = setup(); const leave = bindWorldStepFlush(ledger);
    ledger.move(1.5); await vi.advanceTimersByTimeAsync(2999); expect(spend).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1); expect(spend).toHaveBeenCalledExactlyOnceWith(1); leave();
  });
  it('flushes on leaving and shares the in-flight request', async () => {
    const { ledger, spend } = setup(); const leave = bindWorldStepFlush(ledger); ledger.move(1.5);
    leave(); await ledger.flush(); expect(spend).toHaveBeenCalledExactlyOnceWith(1);
  });
  it('flushes on pagehide and hidden visibility', async () => {
    const { ledger, spend } = setup(); const leave = bindWorldStepFlush(ledger); ledger.move(1.5);
    window.dispatchEvent(new Event('pagehide')); await ledger.flush();
    expect(spend).toHaveBeenCalledWith(1);
    ledger.move(1.5); vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange')); await ledger.flush();
    expect(spend).toHaveBeenLastCalledWith(2); leave(); vi.restoreAllMocks();
  });
  it('keeps spend on a failed request and includes moves made during a request', async () => {
    let resolve: ((n: number) => void) | undefined;
    const spend = vi.fn().mockRejectedValueOnce(new Error('offline')).mockImplementationOnce(() => new Promise<number>(r => { resolve = r; })).mockResolvedValue(95);
    const ledger = new WorldSteps(100, spend, vi.fn()); ledger.move(1.5);
    await expect(ledger.flush()).rejects.toThrow('offline'); expect(ledger.pending).toBe(1.5);
    const flight = ledger.flush(); await Promise.resolve(); ledger.move(3.5); resolve?.(99); await flight;
    expect(spend.mock.calls).toEqual([[1], [1], [4]]); expect(ledger.pending).toBe(0); expect(ledger.balance).toBe(95);
  });
});
