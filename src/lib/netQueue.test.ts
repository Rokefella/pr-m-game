import { describe, expect, it, vi } from 'vitest';
import { enqueueSave, netDebug, setSessionRefresher } from './netQueue';

const flush = () => new Promise(r => setTimeout(r, 0));

describe('save queue', () => {
  it('keeps only the latest payload per kind while one is in flight', async () => {
    const seen: number[] = [];
    let release!: () => void;
    enqueueSave('t1', () => new Promise(r => { release = () => { seen.push(1); r(undefined); }; }));
    enqueueSave('t1', async () => { seen.push(2); });
    enqueueSave('t1', async () => { seen.push(3); });
    release(); await flush(); await flush();
    expect(seen).toEqual([1, 3]);
  });
  it('refreshes the session once on 401 and retries', async () => {
    const refresh = vi.fn(async () => {});
    setSessionRefresher(refresh);
    let calls = 0;
    enqueueSave('t2', async () => (++calls === 1 ? { error: { status: 401 }, status: 401 } : {}));
    await flush(); await flush(); await flush();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls).toBe(2);
    expect(netDebug.failures.at(-1)).toMatchObject({ kind: 't2', status: 401 });
  });
});
