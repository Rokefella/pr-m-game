import { describe, expect, it, vi } from 'vitest';
import { mazeEra, mazeObjectFloorWalls, mazeObjectSprite, readMazeSkin, type LevelSkin, type MazeObjectKind } from './mazeSkins';
const cache = vi.hoisted(() => ({ sprites: new Map<string, HTMLCanvasElement>() }));
vi.mock('./terrainTile', () => ({ loadTerrainSprites: vi.fn(), terrainSprite: (key: string) => cache.sprites.get(key) }));
const skin = { era_order: 1, name: 'Fire', wall_keys: ['rock'], floor_keys: ['ash'], edge: [], junction_key: null, straight_key: null, darkness: 1, accent: '', enabled: true };
vi.mock('@/lib/supabase', () => ({ supabase: { from: (table: string) => {
  const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: { era_name: 'Fire', skin } }), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [{ key: 'rock' }, { key: 'ash' }] }).then(resolve) };
  return chain;
} } }));
const level: LevelSkin = { skin, era_name: 'Fire', place_name: '', terrain: new Map(['veil_1', 'gold_door_1', 'instrument_point_1'].map(key => [key, { key }])) };
describe('era object selection and unchanged geometry', () => {
  it.each(['Fire', 'Gods', 'Atoms', 'Stars', 'Quantum', 'Swerve', 'PRÆM', 'Instrument'])('maps %s by era name when order is absent', name => {
    expect(mazeEra({ ...level, skin: { ...skin, era_order: 0 }, era_name: name })).toBe(['Fire', 'Gods', 'Atoms', 'Stars', 'Quantum', 'Swerve', 'PRÆM', 'Instrument'].indexOf(name) + 1);
  });
  it('uses skin order ahead of era name, never level number', () => expect(mazeEra({ ...level, skin: { ...skin, era_order: 4 } })).toBe(4));
  it.each([1, 2])('maze %i uses Fire era 1 for all three objects', async maze => {
    expect(mazeEra((await readMazeSkin(maze)) ?? level)).toBe(1);
    for (const kind of ['veil', 'gold_door', 'instrument_point'] as MazeObjectKind[]) {
      const canvas = document.createElement('canvas'); cache.sprites.set(`${kind}_1`, canvas);
      expect(mazeObjectSprite(level, kind)).toBe(canvas);
    }
  });
  it('retains fallback for absent and failed-to-decode sprites', () => {
    cache.sprites.clear(); expect(mazeObjectSprite(level, 'veil')).toBeUndefined();
    expect(mazeObjectSprite(null, 'gold_door')).toBeUndefined();
    cache.sprites.set('veil_1', document.createElement('canvas'));
    expect(mazeObjectSprite({ ...level, terrain: new Map() }, 'veil')).toBeUndefined();
  });
  it('reveals floor beneath decoded objects without changing original collision walls', () => {
    for (const kind of ['veil', 'gold_door', 'instrument_point']) cache.sprites.set(`${kind}_1`, document.createElement('canvas'));
    const walls = new Set(['1,1', '2,2', '3,3', '4,4']);
    expect([...mazeObjectFloorWalls(walls, level, new Set(['1,1']), [{ col: 2, row: 2 }], [{ type: 'CONSOLE_DOOR', col: 3, row: 3 }])]).toEqual(['4,4']);
    expect([...walls]).toEqual(['1,1', '2,2', '3,3', '4,4']);
    expect([...mazeObjectFloorWalls(walls, null, new Set(['1,1']), [], [])]).toEqual([...walls]);
  });
});