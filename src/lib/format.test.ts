import { describe, expect, it } from 'vitest';
import { formatPrime } from './format';

describe('fragment prime formatting', () => {
  it.each([[2, '00002'], [829, '00829'], ['2', '00002'], [99991, '99991']])('pads %s to five digits', (value, expected) => {
    expect(formatPrime(value)).toBe(expected);
  });
  it('keeps every digit for primes of 100000 or more', () => {
    expect(formatPrime(100003)).toBe('100003');
  });
});