import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
import { compareFlag, flagNumber } from './questFlags';

describe('flagNumber', () => {
  it('reads "10" as ten, not less than four', () => expect(flagNumber({ s: '10' }, 's')).toBe(10));
  it('counts a missing flag as 0', () => expect(flagNumber({}, 's')).toBe(0));
  it('counts an empty string as 0', () => expect(flagNumber({ s: '' }, 's')).toBe(0));
});

describe('compareFlag', () => {
  it('"10" is at least "4"', () => expect(compareFlag('10', '4', true)).toBe(true));
  it('"4" is not at least "10"', () => expect(compareFlag('4', '10', true)).toBe(false));
  it('missing matches "0" exactly and at least', () => {
    expect(compareFlag(undefined, '0')).toBe(true);
    expect(compareFlag(null, '0', true)).toBe(true);
  });
  it('missing is below "1"', () => expect(compareFlag(undefined, '1', true)).toBe(false));
  it('empty string counts as "0"', () => {
    expect(compareFlag('', '0')).toBe(true);
    expect(compareFlag('  ', '3', true)).toBe(false);
  });
  it('exact text still must match', () => {
    expect(compareFlag('done', 'done')).toBe(true);
    expect(compareFlag('active', 'done')).toBe(false);
    expect(compareFlag('5', '4')).toBe(false);
  });
});
