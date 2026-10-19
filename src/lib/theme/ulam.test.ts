import { describe, expect, it } from 'vitest';
import { isPrime, ulamIndex } from './ulam';

describe('Ulam spiral', () => {
  it('covers each integer from 1 to 25 exactly once in a 5×5 grid', () => {
    const values = Array.from({ length: 25 }, (_, i) => ulamIndex(i % 5, Math.floor(i / 5), 5));
    expect(values.sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
  });
  it('places 1 at the centre', () => expect(ulamIndex(2, 2, 5)).toBe(1));
  it('places 2 directly right of the centre', () => expect(ulamIndex(3, 2, 5)).toBe(2));
  it('places 3 above 2', () => expect(ulamIndex(3, 1, 5)).toBe(3));
  it('recognizes primes including cached repeated calls', () => {
    for (let pass = 0; pass < 2; pass++) {
      expect([2, 3, 5, 7, 11, 23, 97].map(isPrime)).toEqual(Array(7).fill(true));
      expect([-1, 0, 1, 4, 9, 25, 49, 2.5].map(isPrime)).toEqual(Array(8).fill(false));
    }
  });
});