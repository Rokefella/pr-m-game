import { describe, expect, it } from 'vitest';
import { dyeRamp, frameFor, getCurrentSkin, liftBoot, mirrorFrame, mirrorLegs, normalizeSkinKey, resolveColors, setCurrentSkin, skinBaseColor, skinForDrop, skinPublic, type Skin } from './skins';
import { publishOrb } from './orb';

const row = (chars: string) => chars.padEnd(16, '.').slice(0, 16);
const EMPTY = '.'.repeat(16);

function makeSkin(over: Partial<Skin> = {}): Skin {
  const down = Array.from({ length: 14 }, () => EMPTY);
  down[12] = row('LLLLLLLLRRRRRRRR');
  down[13] = row('bbbbbbbbBBBBBBBB');
  const right = Array.from({ length: 14 }, () => EMPTY);
  right[12] = row('..fff...');
  right[13] = row('...fff..');
  return {
    skin_key: 'visitor', name: 'The Visitor', drop_key: null, rarity: 'start', source: 'start',
    where_note: null, blurb: null, sort_order: 0, undyed_hex: '#e8e8f0',
    palette: { O: '#101018' }, dye_chars: 'DMLHS', frames: { down, up: down, right },
    walk_rule: 'lift_boot_v1', enabled: true, ...over,
  };
}

describe('skin keys and drops', () => {
  it('maps default and null to the visitor', () => {
    expect(normalizeSkinKey(null)).toBe('visitor');
    expect(normalizeSkinKey('default')).toBe('visitor');
    expect(normalizeSkinKey('scout')).toBe('scout');
  });
  it('maps skin drop keys to skin keys', () => {
    expect(skinForDrop('skin_scout')).toBe('scout');
    expect(skinForDrop('dye_blue')).toBeNull();
  });
});

describe('lift_boot_v1 frame derivation', () => {
  const skin = makeSkin();
  it('walkA lifts the left boot: row 12 takes row 13 in columns 0–7 and row 13 clears there', () => {
    const a = frameFor(skin, 'down', 'a');
    expect(a[12]).toBe('bbbbbbbb' + 'RRRRRRRR');
    expect(a[13]).toBe('........' + 'BBBBBBBB');
  });
  it('walkB lifts the right boot in columns 8–15', () => {
    const b = frameFor(skin, 'down', 'b');
    expect(b[12]).toBe('LLLLLLLL' + 'BBBBBBBB');
    expect(b[13]).toBe('bbbbbbbb' + '........');
  });
  it('stand keeps the base frame untouched', () => {
    expect(frameFor(skin, 'down', 'stand')).toEqual(skin.frames.down);
  });
  it('side walkA mirrors rows 12–13 within their occupied span', () => {
    const a = frameFor(skin, 'right', 'a');
    expect(a[12]).toBe(mirrorLegs(skin.frames.right)[12]);
    expect(a[12].slice(2, 8)).toBe('.fff..');
    expect(a[13].slice(2, 8)).toBe('fff...');
  });
  it('side walkB is the stand frame', () => {
    expect(frameFor(skin, 'right', 'b')).toEqual(skin.frames.right);
  });
  it('left is the mirrored right for every phase', () => {
    for (const phase of ['stand', 'a', 'b'] as const) {
      expect(frameFor(skin, 'left', phase)).toEqual(mirrorFrame(frameFor(skin, 'right', phase)));
    }
  });
  it('liftBoot and mirrorLegs never mutate the input', () => {
    const rows = skin.frames.down;
    const copy = rows.slice();
    liftBoot(rows, 0, 7); mirrorLegs(rows);
    expect(rows).toEqual(copy);
  });
});

describe('colour base rules', () => {
  const skin = makeSkin();
  it('undyed suits use their own undyed_hex', () => {
    expect(skinBaseColor(skin, {}).base).toBe('#e8e8f0');
    expect(skinBaseColor(skin, { registrationNumber: 7 }).dyed).toBe(false);
  });
  it('an active dye colours the dye zones with the aura colour', () => {
    const tone = skinBaseColor(skin, { orbDye: 'dye_blue', auraColor: '#4a7bd8' });
    expect(tone).toMatchObject({ base: '#4a7bd8', dyed: true, prism: false });
  });
  it('registration 1 is red when no dye is active', () => {
    expect(skinBaseColor(skin, { registrationNumber: 1 }).base).toBe('#d93a3a');
  });
  it('the prism dye cycles hues', () => {
    expect(skinBaseColor(skin, { orbDye: 'dye_prism', auraColor: '#8a5cff' }).prism).toBe(true);
  });
  it('resolveColors keeps palette chars fixed and ramps dye chars', () => {
    const colors = resolveColors(skin, '#4a7bd8');
    expect(colors.O).toBe('#101018');
    expect(colors.M).toBe('#4a7bd8');
    expect(colors.D).toBe(dyeRamp('#4a7bd8').D);
    expect(colors.S).toBe(dyeRamp('#4a7bd8').S);
  });
});

describe('wardrobe privacy', () => {
  it('unfound skins never reveal their name or rarity', () => {
    const skin = makeSkin({ skin_key: 'diver', name: 'The Brass Diver', rarity: 'rare' });
    expect(skinPublic(skin, false)).toEqual({ name: 'Not yet found', rarity: '' });
    expect(skinPublic(skin, true).name).toBe('The Brass Diver');
  });
});

describe('orb event carries the equipped skin', () => {
  it('publishOrb updates the shared skin store so every mounted avatar follows', () => {
    publishOrb({ aura_color: null, orb_dye: null, avatar_body: 'scout' });
    expect(getCurrentSkin()).toBe('scout');
    publishOrb({ aura_color: null, orb_dye: null, avatar_body: null });
    expect(getCurrentSkin()).toBe('visitor');
    setCurrentSkin('cloaked');
    expect(getCurrentSkin()).toBe('cloaked');
  });
});
