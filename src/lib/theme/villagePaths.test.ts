import { expect, it } from 'vitest';
import { pathEdges, pathLamps } from './villagePaths';

it('merges exposed edges without an internal seam between joined cells', () => {
  expect(pathEdges(new Set(['0,0', '1,0']))).toEqual([
    { side: 'n', x: 0, y: 0, w: 40, h: 4 },
    { side: 's', x: 0, y: 16, w: 40, h: 4 },
    { side: 'w', x: 0, y: 0, w: 4, h: 20 },
    { side: 'e', x: 36, y: 0, w: 4, h: 20 },
  ]);
});
it('places brick lamps every eight cells outside a straight path', () => {
  const paths = new Set(Array.from({ length: 24 }, (_, i) => `${i},0`));
  expect(pathLamps(paths, 'brick')).toEqual([{ x: 90, y: -6 }, { x: 250, y: -6 }, { x: 410, y: -6 }]);
});
it('never places lamps for cobble or plates', () => {
  const paths = new Set(Array.from({ length: 24 }, (_, i) => `${i},0`));
  expect(pathLamps(paths, 'cobble')).toEqual([]);
  expect(pathLamps(paths, 'plates')).toEqual([]);
});
it('places lamps along straight paths wider than one cell', () => {
  const paths = new Set(Array.from({ length: 24 }, (_, i) => `${i},0`));
  for (let i = 0; i < 24; i++) paths.add(`${i},1`);
  expect(pathLamps(paths, 'brick')).toEqual([{ x: 90, y: -6 }, { x: 250, y: -6 }, { x: 410, y: -6 }]);
});
it('omits a lamp at a junction', () => {
  const paths = new Set(Array.from({ length: 24 }, (_, i) => `${i},0`));
  paths.add('12,1');
  expect(pathLamps(paths, 'brick')).toEqual([{ x: 90, y: -6 }, { x: 410, y: -6 }]);
});