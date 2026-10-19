import { describe, expect, it } from 'vitest';
import { countBeforeFragment } from './fragmentReveal';

describe('pre-collection folder count', () => {
  it('excludes the current prime if collection has already persisted', () => {
    expect(countBeforeFragment([{ prime_number: 23 }, { prime_number: 47 }, { prime_number: 89 }], 89)).toBe(2);
  });
  it('keeps the count when the new pickup has not yet persisted', () => {
    expect(countBeforeFragment([{ prime_number: 23 }, { prime_number: 47 }], 89)).toBe(2);
  });
  it('caps the count at the requested 20 slots', () => {
    expect(countBeforeFragment(Array.from({ length: 25 }, (_, i) => ({ prime_number: i + 1 })), 89)).toBe(20);
  });
});