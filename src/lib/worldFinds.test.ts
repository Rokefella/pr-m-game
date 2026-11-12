import { describe, expect, it } from 'vitest';
import { findButton, findShows, findSprite, findRadius, findReceipt, normalizeClaim, type WorldFind } from './worldFinds';
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
import { FindContact, bumpedFind, findMarked, fireAt, litFire } from './worldFinds';
it('only a personally claimed cold quest fire opens resting on its exact cell', () => {
  const fire = f({ kind: 'quest_object', sprite_key: 'campfire_cold' });
  expect(litFire(fire, true)).toBe(true); expect(litFire(fire, false)).toBe(false);
  expect(fireAt([fire], new Set(['1']), { x: 10, y: 10 })).toBe(fire);
  expect(fireAt([fire], new Set(['1']), { x: 11, y: 10 })).toBeNull();
  expect(fireAt([fire], new Set(), { x: 10, y: 10 })).toBeNull();
});
import { signpostLines } from './worldTest';
describe('find markers, bumps and signposts', () => {
  it.each(['thing', 'cache_steps', 'cache_credits'])('ordinary %s never has a diamond', kind => {
    expect(findMarked(f({ kind }), false)).toBe(false);
    expect(findMarked(f({ kind, visibility: 'hidden', quest_key: 'quest' }), false)).toBe(false);
  });
  it.each(['quest_object', 'words', 'landmark', 'tool', 'sigil'])('unclaimed %s keeps its diamond', kind => {
    expect(findMarked(f({ kind, visibility: 'visible' }), false)).toBe(true);
    expect(findMarked(f({ kind }), true)).toBe(false);
  });
  it('other quest-key finds keep diamonds', () => {
    expect(findMarked(f({ kind: 'debris', quest_key: 'meteor' }), false)).toBe(true);
    expect(findMarked(f({ kind: 'debris' }), false)).toBe(false);
  });
  it('Instrument extends hidden radius from one to three and glint radius by one', () => {
    const hidden = f({ visibility: 'hidden' });
    expect(findShows(hidden, { x: 13, y: 10 }, false)).toBe(false);
    expect(findShows(hidden, { x: 13, y: 10 }, false, true)).toBe(true);
    expect(findShows(hidden, { x: 14, y: 10 }, false, true)).toBe(false);
    expect(findRadius(f({ glint_radius: 1 }), true)).toBe(2);
    expect(findRadius(f({ glint_radius: 2 }), true)).toBe(3);
  });
  it('cache receipts use returned amounts ahead of generic drop names', () => {
    expect(findReceipt({ granted: true, kind: 'cache_steps', amount: 150, drop_name: 'Rations' })).toBe('+150 steps');
    expect(findReceipt({ granted: true, kind: 'cache_credits', amount: 11, drop_name: 'Coins' })).toBe('+11 credits');
  });
  it('a bump into an unclaimed find cell returns that find', () => {
    const a = f({ id: 'a' });
    expect(bumpedFind([a], new Set(), { x: 10, y: 10 })).toBe(a);
    expect(bumpedFind([a], new Set(['a']), { x: 10, y: 10 })).toBeNull();
    expect(bumpedFind([a], new Set(), { x: 11, y: 10 })).toBeNull();
  });
  it('contact is exact-cell only, and visible cold fires have a diamond until lit', () => {
    const fire = f({ kind: 'quest_object', sprite_key: 'campfire_cold', visibility: 'visible' });
    expect(findMarked(fire, false)).toBe(true); expect(findMarked(fire, true)).toBe(false);
    expect(bumpedFind([fire], new Set(), { x: 11, y: 10 })).toBeNull();
    expect(bumpedFind([fire], new Set(), fire)).toBe(fire);
  });
  it('failed contact cannot loop; stepping off permits a new attempt but pending claims cannot duplicate', () => {
    const guard = new FindContact(), find = f({});
    expect(guard.begin('1')).toBe(true); guard.finish('1');
    expect(guard.begin('1')).toBe(false);
    guard.step([find], { x: 11, y: 10 }); expect(guard.begin('1')).toBe(true);
    guard.step([find], { x: 11, y: 10 }); expect(guard.begin('1')).toBe(false);
    guard.finish('1'); expect(guard.begin('1')).toBe(true);
  });
  it('parses signpost notes with directions', () => {
    expect(signpostLines('Onward: Lumen, about 1,180 paces\nBack: Mossford, about 360 paces')).toEqual([
      { dir: 'onward', text: 'Onward: Lumen, about 1,180 paces' }, { dir: 'back', text: 'Back: Mossford, about 360 paces' }]);
    expect(signpostLines(' Old road \n\n')).toEqual([{ dir: null, text: 'Old road' }]);
    expect(signpostLines(null)).toEqual([]);
  });
});
