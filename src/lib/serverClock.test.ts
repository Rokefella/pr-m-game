import { beforeEach, describe, expect, it, vi } from 'vitest';
const refreshSession = vi.fn();
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { refreshSession: () => refreshSession() } } }));
import { _resetServerClock, serverNow, tokenIssuedAt } from './serverClock';

const token = (iat: number) => `h.${btoa(JSON.stringify({ iat }))}.s`;

describe('server clock', () => {
  beforeEach(() => { _resetServerClock(); refreshSession.mockReset(); });
  it('reads iat from a token', () => expect(tokenIssuedAt(token(100))).toBe(100000));
  it('uses the server time, not the device clock', async () => {
    const server = Date.UTC(2026, 9, 23, 12, 0, 0);
    refreshSession.mockResolvedValue({ data: { session: { access_token: token(server / 1000) } }, error: null });
    vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 21, 12, 0, 0));
    const now = await serverNow();
    vi.restoreAllMocks();
    expect(now?.getUTCDate()).toBe(23);
  });
  it('fails closed when the server cannot be reached', async () => {
    refreshSession.mockResolvedValue({ data: { session: null }, error: new Error('offline') });
    expect(await serverNow()).toBeNull();
  });
});
