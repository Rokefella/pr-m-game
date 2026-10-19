import { describe, expect, it } from 'vitest';
import { defaultExchangeOption, STEP_EXCHANGE_OPTIONS, STEPS_PER_CREDIT } from './StepExchangeSheet';

describe('step exchange', () => {
  it('keeps the 100 steps per credit rate and 1/5/10 options', () => {
    expect(STEPS_PER_CREDIT).toBe(100);
    expect([...STEP_EXCHANGE_OPTIONS]).toEqual([1, 5, 10]);
  });
  it('defaults to the largest affordable option, otherwise 1', () => {
    expect(defaultExchangeOption(50)).toBe(10);
    expect(defaultExchangeOption(7)).toBe(5);
    expect(defaultExchangeOption(1)).toBe(1);
    expect(defaultExchangeOption(0)).toBe(1);
  });
});
