import { expect, it } from 'vitest';
import { orbName } from './OrbLabels';

it('keeps names up to fourteen characters and adds an ellipsis beyond that limit', () => {
  expect(orbName('Marcel')).toBe('Marcel');
  expect(orbName('12345678901234')).toBe('12345678901234');
  expect(orbName('123456789012345')).toBe('12345678901234…');
  expect(orbName(null)).toBe('');
});