import { describe, expect, it } from 'vitest';
import { firstTitlePatch, titlesUnlocked } from './playerTitles';

describe('Sam title eligibility', () => {
  it('unlocks at Sam stage three, not retired Bernard stage five', () => {
    expect(titlesUnlocked({ sam_stage: '2', bernard_stage: '5' })).toBe(false);
    expect(titlesUnlocked({ sam_stage: '3', bernard_stage: '0' })).toBe(true);
    expect(titlesUnlocked({ sam_stage: '8' })).toBe(true);
    expect(titlesUnlocked({})).toBe(false);
  });
  it('assigns the current level title immediately to an empty title', () => {
    expect(firstTitlePatch({ sam_stage: '3' }, { level: 2, title: '', unlocked_titles: ['Wanderer'] })).toEqual({ title: 'Fragment Seeker', unlocked_titles: ['Wanderer', 'Fragment Seeker'] });
  });
  it('falls back to the level-one title and avoids duplicate unlocks', () => {
    expect(firstTitlePatch({ sam_stage: '3' }, { level: 99, title: ' ', unlocked_titles: ['Wanderer'] })).toEqual({ title: 'Wanderer', unlocked_titles: ['Wanderer'] });
  });
  it('preserves an existing title and leaves locked players untouched', () => {
    expect(firstTitlePatch({ sam_stage: '3' }, { level: 2, title: 'Wanderer' })).toBeNull();
    expect(firstTitlePatch({ sam_stage: '2' }, { level: 2, title: '' })).toBeNull();
  });
});
describe('levelupTitle', () => {
  it('sends the new level title only once titles are unlocked', () => {
    expect(levelupTitle(2, true)).toBe('Fragment Seeker');
    expect(levelupTitle(2, false)).toBeNull();
  });
});
