import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readMazeSkin, skinDarkness, skinHash, skinTile, type MazeSkin } from './mazeSkins';
const db = vi.hoisted(() => ({ from: vi.fn(), view: null as unknown, override: null as unknown, terrain: [] as unknown[] }));
vi.mock('@/lib/supabase', () => ({ supabase: { from: db.from } }));
const skin: MazeSkin = { era_order: 1, name: 'Fire', wall_keys: ['cliff', 'cliff', 'boulder', 'rock_field'], floor_keys: ['sand', 'ash', 'earth'], edge: [], junction_key: null, straight_key: null, darkness: 1, accent: '#e8783a', enabled: true };
beforeEach(() => {
  db.view = { place_name: 'Cinder Hollow', era_name: 'Fire', skin }; db.override = { ...skin, era_order: 4, name: 'Stars' };
  db.terrain = [...new Set([...skin.wall_keys, ...skin.floor_keys])].map(key => ({ key }));
  db.from.mockReset().mockImplementation((table: string) => {
    const result = () => ({ data: table === 'maze_level_skins' ? db.view : table === 'maze_skins' ? db.override : db.terrain, error: null });
    const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => result(), then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve) };
    return chain;
  });
});
describe('exact visual-only skin rules', () => {
  it('uses the supplied unsigned 32-bit hash', () => { expect(skinHash(0, 0, 0)).toBe(0); expect(skinHash(17, 29, 5)).toBe(0.9315199633128941); });
  it('uses quarter-probability wall variation and three-cell blocks', () => { expect(skinTile(3, 0, skin, new Set(), new Set(['3,0'])).key).toBe('rock_field'); expect(skinTile(17, 29, skin, new Set(), new Set(['17,29'])).key).toBe('cliff'); });
  it('uses floor variation in two-cell blocks with a .35 threshold', () => {
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
      const cx = Math.floor(x / 2), cy = Math.floor(y / 2);
      const expected = skinHash(cx, cy, 6) < .35 ? skin.floor_keys[Math.floor(skinHash(cx, cy, 4) * 3)] : 'sand';
      expect(skinTile(x, y, skin, new Set(), new Set()).key).toBe(expected);
    }
  });
  it('replaces only exactly-two-neighbour straight corridors at .35', () => {
    const s = { ...skin, straight_key: 'path' }, open = new Set(['3,4', '5,4']);
    expect(skinTile(4, 4, s, open, new Set()).key).toBe('path');
    open.delete('5,4'); open.add('4,3'); expect(skinTile(4, 4, s, open, new Set()).key).toBe('sand');
    open.add('5,4'); expect(skinTile(4, 4, s, open, new Set()).key).toBe('sand');
  });
  it('selects the first qualifying edge only next to a wall', () => {
    const s = { ...skin, edge: [{ key: 'dead_tree', p: .9 }, { key: 'scrub', p: .5 }] };
    expect(skinTile(4, 4, s, new Set(), new Set(['4,3'])).edge).toBe('dead_tree');
    expect(skinTile(4, 4, { ...s, edge: [{ key: 'dead_tree', p: .05 }, { key: 'scrub', p: .5 }] }, new Set(), new Set(['4,3'])).edge).toBe('scrub');
    expect(skinTile(4, 4, s, new Set(), new Set()).edge).toBeUndefined();
  });
  it('places junction details only with three or more neighbours and hash below .5', () => {
    const s = { ...skin, junction_key: 'lamp_post' }, open = new Set(['3,4', '5,4', '4,3']);
    expect(skinTile(4, 4, s, open, new Set()).junction).toBe('lamp_post');
    open.delete('4,3'); expect(skinTile(4, 4, s, open, new Set()).junction).toBeUndefined();
    expect(skinTile(6, 6, s, new Set(['5,6', '7,6', '6,5']), new Set()).junction).toBeUndefined();
  });
  it('keeps geometry immutable regardless of selected terrain', () => {
    const open = new Set(['4,4']), walls = new Set(['4,3']);
    skinTile(4, 4, { ...skin, floor_keys: ['cliff'], edge: [{ key: 'building', p: 1 }] }, open, walls);
    expect([...open]).toEqual(['4,4']); expect([...walls]).toEqual(['4,3']);
  });
  it('adds only .05 darkness increments capped at .35', () => { expect(skinDarkness(1)).toBe(0); expect(skinDarkness(3)).toBe(.1); expect(skinDarkness(7)).toBeCloseTo(.3); expect(skinDarkness(20)).toBe(.35); });
  it('reads the level view and uses data.skin override before its skin', async () => {
    expect((await readMazeSkin(1))?.era_name).toBe('Fire');
    const result = await readMazeSkin(1, 4); expect(result?.era_name).toBe('Stars'); expect(result?.place_name).toBe('Cinder Hollow'); expect(result?.skin.era_order).toBe(4);
  });
  it('preserves legacy art when metadata is missing or disabled', async () => { db.view = null; expect(await readMazeSkin(1)).toBeNull(); db.override = { ...skin, enabled: false }; expect(await readMazeSkin(1, 4)).toBeNull(); });
});
