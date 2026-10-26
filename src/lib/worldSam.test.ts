import { describe, expect, it } from 'vitest';
import { fillName, firstMatchingStage, samTopics, visiblePlaces } from './worldSam';

const sam = [
  { x: 28, y: 22, npc_key: 'bernard', show_when: { max_completed_level: 0 } },
  { x: 303, y: 28, npc_key: 'bernard', show_when: { min_completed_level: 1, max_completed_level: 1 } },
  { x: 840, y: 28, npc_key: 'bernard', show_when: { min_completed_level: 2, max_completed_level: 2 } },
  { x: 971, y: 201, npc_key: 'bernard', show_when: { min_completed_level: 3 } },
  { x: 5, y: 5, npc_key: null, show_when: null },
];
const at = (lvl: number | null) => visiblePlaces(sam, lvl).filter(p => p.npc_key).map(p => [p.x, p.y]);

describe('Sam show_when', () => {
  it('null level counts as 0', () => expect(at(null)).toEqual([[28, 22]]));
  it('level 1', () => expect(at(1)).toEqual([[303, 28]]));
  it('level 2', () => expect(at(2)).toEqual([[840, 28]]));
  it('level 3 and above', () => { expect(at(3)).toEqual([[971, 201]]); expect(at(9)).toEqual([[971, 201]]); });
  it('rows without show_when always show', () => expect(visiblePlaces(sam, 4).some(p => p.x === 5)).toBe(true));
});

describe('stages and text', () => {
  it('picks the first matching stage', () => expect(firstMatchingStage(['a', 'b', 'c'], [false, true, true])).toBe('b'));
  it('returns null when none match', () => expect(firstMatchingStage(['a'], [false])).toBeNull());
  it('replaces {name}', () => expect(fillName('Hello {name}, {name}.', 'Rob')).toBe('Hello Rob, Rob.'));
});

describe('topic gating by sam_stage', () => {
  const keys = (n: number) => samTopics(n).map(t => t.key);
  it('stage 0', () => expect(keys(0)).toEqual(['background', 'character', 'childhood']));
  it('stage 2 adds instrument', () => expect(keys(2)).toEqual(['instrument', 'background', 'character', 'childhood']));
  it('stage 3 adds cave, whistle, stones, words', () => expect(keys(3)).toEqual(['instrument', 'sam_02', 'whistle', 'stones', 'words', 'background', 'character', 'childhood']));
  it('stage 4 hides the cave', () => expect(keys(4)).not.toContain('sam_02'));
  it('never shows quest, trade or hidden', () => expect(keys(5).some(k => ['quest', 'trade', 'hidden'].includes(k))).toBe(false));
});
