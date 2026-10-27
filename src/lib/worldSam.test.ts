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

const byStage = (stage: number) => visiblePlaces(sam, 9, stage).filter(p => p.npc_key).map(p => [p.x, p.y]);
describe('Sam place by sam_stage', () => {
  it('stages 0 to 2 stand at the start fire, whatever the maze level', () => { for (const s of [0, 1, 2]) expect(byStage(s)).toEqual([[28, 22]]); expect(at(null)).toEqual([[28, 22]]); });
  it('stages 3 and 4 stand at Cinder Hollow', () => { expect(byStage(3)).toEqual([[303, 28]]); expect(byStage(4)).toEqual([[303, 28]]); });
  it('stage 5 stands at The First Spark', () => expect(byStage(5)).toEqual([[840, 28]]));
  it('stage 6 and up stand in Lumen', () => { expect(byStage(6)).toEqual([[971, 201]]); expect(byStage(8)).toEqual([[971, 201]]); });
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

import { topicRoot as rootOf, topicRoots } from './worldSam';
describe('topic roots', () => {
  const book = [
    { node_key: 'bg_root_a', topic: 'background', text: '' }, { node_key: 'bg_root_b', topic: 'background', text: '' },
    { node_key: 'bg_more', topic: 'background', text: '' },
    { node_key: 'char_temper_root', topic: 'character', text: '' }, { node_key: 'char_time_root_a', topic: 'character', text: '' },
    { node_key: 'sam_whistle_root', topic: 'whistle', text: '' },
  ];
  it('roots are topic entries whose unsuffixed key ends in _root', () => {
    expect(topicRoots(book, 'background')).toEqual(['bg_root']);
    expect(topicRoots(book, 'character')).toEqual(['char_temper_root', 'char_time_root']);
    expect(rootOf(book, 'whistle')).toBe('sam_whistle_root');
    expect(rootOf(book, 'stones')).toBeNull();
  });
  it('picks one of several roots at random', () => {
    expect(rootOf(book, 'character', () => 0)).toBe('char_temper_root');
    expect(rootOf(book, 'character', () => .99)).toBe('char_time_root');
  });
});

import { cardTopics } from './worldSam';
describe('cardTopics', () => {
  const book = ['background', 'instrument', 'sam_lantern'].map(t => ({ node_key: `${t}_root`, text: 'x', topic: t }));
  it('shows ungated book topics that have a root', () => expect(cardTopics(0, book).map(t => t.key)).toEqual(['background', 'sam_lantern']));
  it('keeps the Instrument gated until stage two', () => expect(cardTopics(2, book).map(t => t.key)).toContain('instrument'));
});

import { samLandLine } from './worldSam';
describe('Lumen topics and retired data', () => {
  const lumen = ['lumen_well', 'lumen_library', 'lumen_exchange', 'lumen_towns'].map(t => ({ node_key: `${t}_root_a`, text: 'x', topic: t, requires_flags: { sam_lumen: '1' } }));
  const book = [...lumen, { node_key: 'q_root', text: 'old', topic: 'retired_quest' }, { node_key: 'background_root', text: 'x', topic: 'background' }];
  it('hides Lumen topics until sam_lumen is 1', () => expect(cardTopics(6, book, {}).map(t => t.key)).toEqual(['background']));
  it('labels Lumen topics once sam_lumen is 1', () => expect(cardTopics(6, book, { sam_lumen: '1' }).filter(t => t.key.startsWith('lumen')).map(t => t.label)).toEqual(['The well', 'The library', 'The exchange', 'Other towns']));
  it('never shows retired topics', () => expect(cardTopics(8, book, { sam_lumen: '1' }).some(t => t.key.startsWith('retired'))).toBe(false));
});
describe("Sam's land quest line", () => {
  it('names where Sam waits without numbers', () => {
    expect(samLandLine(0)).toBe('Sam is waiting by the fire where you woke.');
    expect(samLandLine(3)).toBe('Sam is waiting outside Cinder Hollow.');
    expect(samLandLine(5)).toBe('Sam is waiting at The First Spark.');
    expect(samLandLine(7)).toBe('Sam is waiting in Lumen.');
    for (let s = 0; s <= 8; s++) expect(samLandLine(s)).not.toMatch(/\d|stage|level|maze/i);
  });
});
