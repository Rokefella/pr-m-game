import { describe, expect, it } from 'vitest';
import { findButton, findShows, findSprite, findRadius, normalizeClaim, type WorldFind } from './worldFinds';
const f = (o: Partial<WorldFind>): WorldFind => ({ id: '1', find_key: 'k', x: 10, y: 10, layer: 0, kind: 'thing', title: 't', visibility: 'glint', glint_radius: 2, ...o });
describe('world finds', () => {
  it('recognizes current and legacy successful claims without granting failed claims', () => {
    expect(normalizeClaim({ ok: true, kind: 'words' }).granted).toBe(true);
    expect(normalizeClaim({ granted: true }).granted).toBe(true);
    expect(normalizeClaim({ ok: false, reason: 'too_far' }).granted).toBe(false);
    expect(normalizeClaim({ ok: true, granted: false }).granted).toBe(false);
    expect(normalizeClaim(null).granted).toBe(false);
    expect(normalizeClaim({ ok: false, reason: 'already_claimed' }).reason).toBe('already');
  });
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
import { approachedFind, bumpedFind, findMarked } from './worldFinds';
import { signpostLines } from './worldTest';
describe('find markers, bumps and signposts', () => {
  it('marks unclaimed glint/hidden finds at any distance, not claimed or visible ones', () => {
    expect(findMarked(f({}), false)).toBe(true);
    expect(findMarked(f({ visibility: 'hidden' }), false)).toBe(true);
    expect(findMarked(f({}), true)).toBe(false);
    expect(findMarked(f({ visibility: 'visible' }), false)).toBe(false);
  });
  it('a bump into an unclaimed find cell returns that find', () => {
    const a = f({ id: 'a' });
    expect(bumpedFind([a], new Set(), { x: 10, y: 10 })).toBe(a);
    expect(bumpedFind([a], new Set(['a']), { x: 10, y: 10 })).toBeNull();
    expect(bumpedFind([a], new Set(), { x: 11, y: 10 })).toBeNull();
  });
  it('walk-up opens only finds on walkable cells within 1', () => {
    const a = f({ id: 'a' });
    expect(approachedFind([a], new Set(), new Set(), { x: 11, y: 11 }, () => true)).toBe(a);
    expect(approachedFind([a], new Set(), new Set(), { x: 11, y: 11 }, () => false)).toBeNull();
    expect(approachedFind([a], new Set(), new Set(), { x: 12, y: 10 }, () => true)).toBeNull();
  });
  it('parses signpost notes with directions', () => {
    expect(signpostLines('Onward: Lumen, about 1,180 paces\nBack: Mossford, about 360 paces')).toEqual([
      { dir: 'onward', text: 'Onward: Lumen, about 1,180 paces' }, { dir: 'back', text: 'Back: Mossford, about 360 paces' }]);
    expect(signpostLines(' Old road \n\n')).toEqual([{ dir: null, text: 'Old road' }]);
    expect(signpostLines(null)).toEqual([]);
  });
});
