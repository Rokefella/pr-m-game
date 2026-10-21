import { describe, expect, it } from 'vitest';
import { npcOrbIdentity } from './NpcOrb';

describe('NPC identity selection', () => {
  it.each(['bernard', 'merchant', 'chef', 'painter', 'hacker', 'priest', 'keeper', 'banker', 'alexandra', 'architect'] as const)('matches %s inside a case-insensitive key or name', key => {
    expect(npcOrbIdentity(`The ${key.toUpperCase()} NPC`)).toBe(key);
  });
  it('uses the unknown identity for unlisted NPCs', () => {
    expect(npcOrbIdentity('Claire')).toBe('unknown');
    expect(npcOrbIdentity('')).toBe('unknown');
  });
});