import { describe, expect, it } from 'vitest';
import { countBeforeFragment } from './fragmentReveal';

describe('pre-collection folder count', () => {
  it('excludes the current prime if collection has already persisted', () => {
    expect(countBeforeFragment([{ prime_number: 23, banked: false }, { prime_number: 47, banked: false }, { prime_number: 89, banked: false }], 89)).toBe(2);
  });
  it('keeps the count when the new pickup has not yet persisted', () => {
    expect(countBeforeFragment([{ prime_number: 23, banked: false }, { prime_number: 47, banked: false }], 89)).toBe(2);
  });
  it('caps the count at the requested 20 slots', () => {
    expect(countBeforeFragment(Array.from({ length: 25 }, (_, i) => ({ prime_number: i + 1, banked: false })), 89)).toBe(20);
  });
  it('ignores five banked rows so the new carried pickup displays one after reveal', () => {
    const rows = [...Array.from({ length: 5 }, (_, i) => ({ prime_number: i + 1, banked: true })), { prime_number: 23, banked: false }];
    expect(countBeforeFragment(rows, 23) + 1).toBe(1);
  });
});