import { describe, it, expect } from 'vitest';
import { buildPathQueue, npcArrow, type Path } from './paths';

const path = (o: Partial<Path>): Path => ({ quest_key: 'q', name: 'Q', colour: 'teal', type: 'main', giver: 'bernard', state: 'active', step_key: 's1', line: 'L', progress: null, seen: null, ...o });

describe('path queue', () => {
  it('active and never seen gives a START banner', () => {
    expect(buildPathQueue([path({ seen: null })]).banners).toEqual([{ kind: 'start', path: path({}) }]);
  });
  it('active with a different seen step gives a STEP flash', () => {
    const q = buildPathQueue([path({ seen: 's0', step_key: 's1' })]);
    expect(q.banners.map(b => b.kind)).toEqual(['step']);
  });
  it('active and already seen this step gives nothing', () => {
    expect(buildPathQueue([path({ seen: 's1' })]).banners).toEqual([]);
  });
  it('done and not marked done is marked silently, no banner', () => {
    const q = buildPathQueue([path({ state: 'done', seen: 's1' })]);
    expect(q.banners).toEqual([]);
    expect(q.done.map(p => p.quest_key)).toEqual(['q']);
    expect(buildPathQueue([path({ state: 'done', seen: 'done' })]).done).toEqual([]);
  });
  it('keeps server order', () => {
    const q = buildPathQueue([path({ quest_key: 'a' }), path({ quest_key: 'b', seen: 'x' })]);
    expect(q.banners.map(b => [b.kind, b.path.quest_key])).toEqual([['start', 'a'], ['step', 'b']]);
  });
});

describe('npc arrow', () => {
  it("shows a hollow active arrow when the quest state is 'none' but the NPC gave an active path", () => {
    expect(npcArrow('none', 'sam', [path({ giver: 'bernard', colour: 'gold' })])).toEqual({ state: 'active', colour: 'gold' });
    expect(npcArrow('none', 'bernard', [path({ giver: 'sam' })])).toEqual({ state: 'active', colour: 'teal' });
  });
  it('no arrow when none and no active path from this NPC', () => {
    expect(npcArrow('none', 'chef', [path({ giver: 'bernard' })])).toBeNull();
    expect(npcArrow('none', 'sam', [path({ state: 'done' })])).toBeNull();
  });
  it('quest states keep their arrow and default to purple', () => {
    expect(npcArrow('ready', 'chef', [])).toEqual({ state: 'ready', colour: 'purple' });
    expect(npcArrow('available', 'chef', [path({ giver: 'chef', colour: 'gold' })])).toEqual({ state: 'available', colour: 'gold' });
  });
});
