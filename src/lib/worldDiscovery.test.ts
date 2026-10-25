import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { discoverAround, discoveredBlock, discoveryCount, mergeDiscovery, WorldDiscovery } from './worldDiscovery';
const f = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: f.read }) }), upsert: f.save }) } }));
beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); f.read.mockReset().mockResolvedValue({ data: null, error: null }); f.save.mockReset().mockResolvedValue({ error: null }); });
afterEach(() => vi.useRealTimers());
describe('world discovery rules', () => {
  it('decodes MSB-first four-bit hex blocks and treats missing/short bits as fog', () => {
    expect(discoveredBlock('8', 0, 0)).toBe(true); expect(discoveredBlock('8', 1, 0)).toBe(false);
    expect(discoveredBlock('1', 3, 0)).toBe(true); expect(discoveredBlock('', 99, 99)).toBe(false);
  });
  it('discovers the surface block and its eight neighbours, clipping world edges', () => {
    const bits = discoverAround('', 25, 25, 0); expect(bits).toHaveLength(2500); expect(discoveryCount(bits)).toBe(9);
    for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) expect(discoveredBlock(bits, x, y)).toBe(true);
    expect(discoveryCount(discoverAround('', 0, 0, 0))).toBe(4);
  });
  it('underground movement discovers nothing', () => expect(discoverAround('8', 25, 25, 1)).toBe('8'));
  it('ORs local and server bits without losing either side', () => { expect(mergeDiscovery('8', '1').slice(0, 2)).toBe('90'); expect(discoveryCount(mergeDiscovery('f', '8'))).toBe(4); });
  it('merges server and local then saves the auth user and exact set-bit count after 15 seconds', async () => {
    localStorage.setItem('praem.worldDiscovery.player', '8'); f.read.mockResolvedValue({ data: { bits: '1' }, error: null });
    const d = new WorldDiscovery('player'); await vi.advanceTimersByTimeAsync(0);
    expect(d.bits[0]).toBe('9'); d.walk(25, 25, 0);
    await vi.advanceTimersByTimeAsync(14999); expect(f.save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1); expect(f.save).toHaveBeenCalledTimes(1);
    expect(f.save.mock.calls[0][0]).toMatchObject({ user_id: 'player', blocks: 11, bits: d.bits });
    expect(f.save.mock.calls[0][1]).toEqual({ onConflict: 'user_id' }); d.dispose();
  });
  it('retains failed saves locally, retries later and flushes on dispose', async () => {
    f.save.mockResolvedValueOnce({ error: new Error('offline') });
    const d = new WorldDiscovery('player'); await vi.advanceTimersByTimeAsync(0); d.walk(25, 25, 0);
    await vi.advanceTimersByTimeAsync(15000); expect(localStorage.getItem('praem.worldDiscovery.player')).toBe(d.bits);
    await vi.advanceTimersByTimeAsync(15000); expect(f.save).toHaveBeenCalledTimes(2);
    d.walk(55, 55, 0); d.dispose(); await vi.advanceTimersByTimeAsync(0); expect(f.save).toHaveBeenCalledTimes(3);
  });
});