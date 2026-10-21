import { expect, it } from 'vitest';
import { orbName } from './OrbLabels';

it('keeps names up to twelve characters and adds an ellipsis beyond that limit', () => {
  expect(orbName('Marcel')).toBe('Marcel');
  expect(orbName('123456789012')).toBe('123456789012');
  expect(orbName('1234567890123')).toBe('123456789012…');
  expect(orbName(null)).toBe('');
});