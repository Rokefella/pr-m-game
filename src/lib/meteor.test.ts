import { describe, it, expect, beforeEach } from 'vitest';
import { shouldPlayMeteor, markMeteorPending, meteorPending, clearMeteorPending } from './meteor';
import { WorldChunkCache } from './worldTest';

describe('meteor fall', () => {
  beforeEach(() => localStorage.clear());
  it('plays when complete_maze reported the fall', () => expect(shouldPlayMeteor({}, true)).toBe(true));
  it('plays for a fallen meteor not yet seen', () => expect(shouldPlayMeteor({ meteor: 'fallen' }, false)).toBe(true));
  it('does not replay once seen', () => expect(shouldPlayMeteor({ meteor: 'fallen', ui_meteor_seen: '1' }, false)).toBe(false));
  it('replays after the dev button resets seen to 0', () => expect(shouldPlayMeteor({ meteor: 'fallen', ui_meteor_seen: '0' }, false)).toBe(true));
  it('never plays before the fall', () => expect(shouldPlayMeteor({ meteor: '0' }, false)).toBe(false));
  it('remembers the pending fall per player', () => {
    markMeteorPending('a'); expect(meteorPending('a')).toBe(true); expect(meteorPending('b')).toBe(false);
    clearMeteorPending('a'); expect(meteorPending('a')).toBe(false);
  });
  it('reset throws away chunks and ignores answers already in flight', async () => {
    let release: (v: unknown) => void = () => undefined; let calls = 0;
    const cache = new WorldChunkCache(async (x, y) => { calls++; if (calls === 1) await new Promise(r => { release = r; }); return { x0: x, y0: y, w: 32, h: 32, keys: [calls === 1 ? 'old' : 'crater'], rows: [] } as never; });
    const first = cache.load(0, 0); cache.reset(); release(null); await first;
    await Promise.all([...cache.pending.values()]);
    expect([...cache.chunks.values()].every(c => (c.keys as string[])[0] === 'crater')).toBe(true);
    expect(calls).toBeGreaterThan(1);
  });
});
