import { describe, expect, it } from 'vitest';
import { collectAll, nearestOpenNeighbour } from './devSpeedwalk';
import { applyAnswerSigns, formatSignedTerms } from './console';

describe('dev collect all', () => {
  it('leaves no uncollected fragments or unclaimed crates, one claim at a time', async () => {
    const collected = new Set([3]);
    const crates = new Map([['1,1', { name: 'Brass Key', kind: 'key' as const }], ['2,2', { name: 'Chalk', kind: 'drop' as const }]]);
    let inFlight = 0, maxInFlight = 0;
    const summary = await collectAll({
      fragments: [{ prime: 3, col: 0, row: 0 }, { prime: 5, col: 1, row: 0 }, { prime: 7, col: 2, row: 0 }],
      isCollected: p => collected.has(p),
      claimFragment: async () => ({ ok: true }),
      onFragment: p => collected.add(p),
      crates: () => [...crates.keys()],
      claimCrate: async (c, r) => { inFlight++; maxInFlight = Math.max(maxInFlight, inFlight); await Promise.resolve(); const d = crates.get(`${c},${r}`)!; crates.delete(`${c},${r}`); inFlight--; return { granted: true, ...d }; },
    });
    expect([...collected].sort()).toEqual([3, 5, 7]);
    expect(crates.size).toBe(0);
    expect(maxInFlight).toBe(1);
    expect(summary.text).toBe('Collected 2 fragments, 2 items (key: Brass Key)');
  });
  it('reports items left behind when the Folder is full', async () => {
    const summary = await collectAll({ fragments: [{ prime: 5, col: 0, row: 0 }], isCollected: () => false, claimFragment: async () => ({ ok: false, reason: 'folder_full' }), onFragment: () => {}, crates: () => [], claimCrate: async () => ({ granted: false }) });
    expect(summary.text).toBe('Collected 0 fragments, 0 items (key: none). Folder full: 1 left behind');
  });
});

describe('console answer', () => {
  it('shows a sum equal to the target', () => {
    const terms = [83, -653, -677, -701, 727];
    expect(formatSignedTerms(terms)).toBe('+83 −653 −677 −701 +727 = −1221');
    expect(terms.reduce((a, b) => a + b, 0)).toBe(-1221);
  });
  it('pre-sets tile signs without reordering', () => {
    expect(applyAnswerSigns([83, 653, 727], [-653, 83, 727])).toEqual([83, -653, 727]);
  });
});

describe('jump near', () => {
  it('picks an open neighbour, never the target', () => {
    const walls = new Set(['1,0', '0,1', '2,1']);
    expect(nearestOpenNeighbour({ col: 1, row: 1 }, 3, 3, (c, r) => walls.has(`${c},${r}`))).toEqual({ col: 1, row: 2 });
  });
});
