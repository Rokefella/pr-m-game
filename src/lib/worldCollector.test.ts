import { expect, it } from 'vitest';
import { isNpcAction, isWorldConversation, type Place } from './worldTest';
it('collector places open the NPC card like npc places', () => {
  const nell = { x: 931, y: 270, name: 'Nell', kind: 'npc_home', action: 'collector', npc_key: 'nell', maze_level: null, notes: null } as Place;
  expect(isNpcAction(nell.action)).toBe(true);
  expect(isWorldConversation({ ...nell, kind: 'place' })).toBe(true);
  expect(isNpcAction('merchant')).toBe(false);
});
