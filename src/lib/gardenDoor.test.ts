import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/supabase', () => ({ supabase: { auth: {}, from: vi.fn(), rpc: vi.fn() } }));
import { isGardenOpen } from '@/pages/ShadowRealm';

describe('garden door', () => {
  it('opens on the server UTC 23rd', () => expect(isGardenOpen(5, new Date(Date.UTC(2026, 9, 23, 0, 30)))).toBe(true));
  it('stays shut on other server days', () => expect(isGardenOpen(5, new Date(Date.UTC(2026, 9, 22, 23, 30)))).toBe(false));
  it('stays shut when the server date is unknown', () => expect(isGardenOpen(5, null)).toBe(false));
});
