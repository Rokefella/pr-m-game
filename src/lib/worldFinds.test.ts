import { describe, expect, it } from 'vitest';
import { findButton, findShows, findSprite, findRadius, type WorldFind } from './worldFinds';
const f = (o: Partial<WorldFind>): WorldFind => ({ id: '1', find_key: 'k', x: 10, y: 10, layer: 0, kind: 'thing', title: 't', visibility: 'glint', glint_radius: 2, ...o });
describe('world finds', () => {
  it('glint shows within Chebyshev glint radius', () => {
    expect(findShows(f({}), { x: 12, y: 12 }, false)).toBe(true);
    expect(findShows(f({}), { x: 13, y: 10 }, false)).toBe(false);
    expect(findShows(f({ glint_radius: null }), { x: 8, y: 12 }, false)).toBe(true);
  });
  it('hidden shows only at distance 1', () => {
    expect(findRadius(f({ visibility: 'hidden', glint_radius: 5 }))).toBe(1);
    expect(findShows(f({ visibility: 'hidden' }), { x: 11, y: 11 }, false)).toBe(true);
    expect(findShows(f({ visibility: 'hidden' }), { x: 12, y: 10 }, false)).toBe(false);
  });
  it('claimed glint and hidden finds disappear; visible stay', () => {
    expect(findShows(f({}), { x: 10, y: 10 }, true)).toBe(false);
    expect(findShows(f({ visibility: 'hidden' }), { x: 10, y: 10 }, true)).toBe(false);
    expect(findShows(f({ visibility: 'visible' }), { x: 90, y: 90 }, true)).toBe(true);
  });
  it('claimed cold quest fire is drawn lit', () => {
    const q = f({ kind: 'quest_object', visibility: 'visible', sprite_key: 'campfire_cold' });
    expect(findSprite(q, true)).toBe('campfire');
    expect(findSprite(q, false)).toBe('campfire_cold');
    expect(findSprite(f({ kind: 'landmark', sprite_key: 'campfire_cold' }), true)).toBe('campfire_cold');
  });
  it('button label per kind', () => {
    expect(findButton('landmark')).toBe('Look closer');
    expect(findButton('quest_object')).toBe('Light it');
    expect(findButton('words')).toBe('Read it');
    expect(findButton('cache_steps')).toBe('Take it');
    expect(findButton('tool')).toBe('Take it');
  });
});
