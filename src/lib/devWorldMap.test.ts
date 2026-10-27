import { afterEach, describe, expect, it } from 'vitest';
import { DEV_MAP_KEY, devMapEnabled, devMapMarkers, setDevMapEnabled } from './devWorldMap';
import type { Place } from './worldTest';
import type { WorldFind } from './worldFinds';
afterEach(() => localStorage.removeItem(DEV_MAP_KEY));
const places = [
  { name: 'Wandering trader', x: 563, y: 40, kind: 'npc_home', action: 'merchant', show_when: { min_completed_level: 1 } },
  { name: 'Start', x: 5, y: 3, kind: 'start' },
  ...[0, 1, 2, 3].map(t => ({ name: `Sam home ${t}`, x: 10 + t, y: 20, kind: 'npc_home', npc_key: 'sam', show_when: { min_completed_level: t } })),
  { name: 'Under', x: 20, y: 30, layer: 1, kind: 'town' },
] as Place[];
const find = (id: string, kind: string, enabled = true) => ({ id, title: id, kind, x: 300, y: 400, layer: 0, visibility: 'hidden', enabled }) as WorldFind & { enabled: boolean };
const markers = (registration = 1, enabled = true, stage = 0, finds = [find('cold', 'quest_object'), find('item', 'thing'), find('note', 'landmark'), find('words', 'words'), find('claimed', 'thing'), find('disabled', 'thing', false)]) => devMapMarkers(registration, enabled, places, finds, new Set(['claimed']), stage, { x: 5, y: 6 }, 0);
describe('Rob-only SHOW ALL', () => {
  it('defaults off and persists across reads', () => {
    expect(devMapEnabled(1)).toBe(false); setDevMapEnabled(1, true); expect(devMapEnabled(1)).toBe(true);
    expect(localStorage.getItem(DEV_MAP_KEY)).toBe('1'); setDevMapEnabled(1, false); expect(devMapEnabled(1)).toBe(false);
  });
  it('registration 1 is required even when storage is enabled', () => {
    setDevMapEnabled(1, true); expect(devMapEnabled(2)).toBe(false); expect(markers(2)).toEqual([]);
    setDevMapEnabled(2, false); expect(devMapEnabled(1)).toBe(true); expect(markers(1, false)).toEqual([]);
  });
  it('includes every place including hidden, gated and start rows', () => {
    expect(markers().filter(m => m.id.startsWith('place-'))).toHaveLength(places.length);
    expect(markers().find(m => m.name === 'Wandering trader')?.tone).toBe('trader');
    expect(markers().find(m => m.name === 'Under')?.at).toEqual({ x: 82, y: 122 });
  });
  it('includes hidden enabled finds but excludes disabled rows', () => {
    expect(markers().filter(m => m.id.startsWith('find-')).map(m => m.name)).toEqual(['cold', 'item', 'note', 'words', 'claimed']);
  });
  it('assigns requested categories and claimed status', () => {
    expect(markers().filter(m => m.id.startsWith('find-')).map(m => m.tone)).toEqual(['fire', 'item', 'words', 'words', 'claimed']);
  });
  it.each([[0, 10], [2, 10], [3, 11], [4, 11], [5, 12], [6, 13], [8, 13]])('Sam stage %i selects spot %i', (stage, x) => {
    expect(markers(1, true, stage).find(m => m.id === 'sam-current')).toMatchObject({ x, y: 20, tone: 'sam' });
  });
  it('includes exact player coordinates', () => { expect(markers().find(m => m.id === 'player')).toMatchObject({ x: 5, y: 6, at: { x: 5, y: 6 } }); });
});