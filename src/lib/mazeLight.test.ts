import { describe, expect, it } from 'vitest';
import { lanternRadii } from './mazeLight';

describe('maze light', () => {
  it('starts at 2.5 clear cells with a 1.5-cell soft edge', () => {
    expect(lanternRadii(0)).toEqual({ r1: 100, r2: 160 });
  });
  it('adds half a cell per Perception point', () => {
    expect(lanternRadii(1).r1).toBe(120);
    expect(lanternRadii(5).r1).toBe(200);
  });
  it('caps Perception growth at six cells', () => {
    expect(lanternRadii(12).r1).toBe(340);
    expect(lanternRadii(30).r1).toBe(340);
  });
  it('keeps Lantern Oil additive beyond the Perception cap', () => {
    expect(lanternRadii(30, 40, 1).r1).toBe(380);
  });
});