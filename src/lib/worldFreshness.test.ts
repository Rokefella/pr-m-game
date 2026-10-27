import { describe, it, expect, beforeEach } from 'vitest';
import { isStale } from './worldFreshness';
describe('world cache freshness', () => {
  beforeEach(() => localStorage.clear());
  it('drops the cache when the server build is newer', () => { localStorage.setItem('k', '100'); expect(isStale('k', 200)).toBe(true); expect(localStorage.getItem('k')).toBe('200'); });
  it('keeps the cache when the server build is not newer', () => { localStorage.setItem('k', '200'); expect(isStale('k', 200)).toBe(false); });
  it('keeps the cache when the server stamp is unknown', () => { localStorage.setItem('k', '100'); expect(isStale('k', null)).toBe(false); });
});
