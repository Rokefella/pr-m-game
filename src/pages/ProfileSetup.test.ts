import { describe, it, expect } from 'vitest';
import { nameError } from './ProfileSetup';
describe('profile name rule', () => {
  it('rejects under 3 chars', () => expect(nameError('ab')).toBe('Use at least 3 characters.'));
  it('rejects bad chars', () => expect(nameError('ab!c')).toBe('Letters, numbers, space, _ and - only.'));
  it('accepts valid', () => expect(nameError(' Rob_K-1 ')).toBeNull());
  it('rejects empty', () => expect(nameError('   ')).not.toBeNull());
});
