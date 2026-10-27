import { describe, expect, it } from 'vitest';
import { effectiveWorldLevel, worldDoorRefusal } from './worldHome';
import { mazeOutcome } from './worldTest';
describe('World home rules', () => {
  it('uses completed level plus one when the stored level lags behind', () => {
    expect(effectiveWorldLevel(1, 2)).toBe(3);
    expect(mazeOutcome(3, effectiveWorldLevel(1, 2))).toBe('enter');
  });
  it('retains a higher stored level and treats missing completion as zero', () => {
    expect(effectiveWorldLevel(5, 2)).toBe(5);
    expect(effectiveWorldLevel(1, null)).toBe(1);
  });
  it('requires Sam stage two for the maze, with missing flags treated as zero', () => {
    expect(worldDoorRefusal('maze', 3, undefined)).toBe('Not yet. Sam is waiting for you by the fire.');
    expect(worldDoorRefusal('maze', 3, '1')).not.toBeNull();
    expect(worldDoorRefusal('maze', 3, '2')).toBeNull();
  });
  it('uses effective level for the unchanged library minimum of three', () => {
    expect(worldDoorRefusal('library', effectiveWorldLevel(1, 0), '0')).toBeNull();
    expect(worldDoorRefusal('library', effectiveWorldLevel(1, 2), '0')).toBeNull();
  });
  it('retains the exchange minimum of one without a Sam requirement', () => {
    expect(worldDoorRefusal('exchange', 0, '0')).toBeNull();
    expect(worldDoorRefusal('exchange', 1, undefined)).toBeNull();
  });
});