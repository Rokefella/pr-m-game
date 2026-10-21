import { describe, expect, it } from 'vitest';
import { advanceEcho, createEchoMotion, echoCount, nextEchoCell, spawnEchoes } from './echoGhosts';
const line = (n: number) => new Set(Array.from({ length: n }, (_, col) => `${col},0`));
describe('maze Echo rules', () => {
  it.each([[30, 3], [50, 5], [100, 10], [130, 13], [1, 1], [500, 20]])('size %i yields %i Echoes', (size, count) => expect(echoCount(size)).toBe(count));
  it('honors zero and nonnegative authored counts', () => { expect(echoCount(30, 0)).toBe(0); expect(echoCount(30, 7)).toBe(7); expect(echoCount(30, -1)).toBe(3); });
  it('spawns 3 and 10 safely on sufficient corridor maps', () => {
    for (const size of [30, 100]) {
      const open = line(size * 10), excluded = new Set(['11,0', '20,0', '45,0']);
      const spawns = spawnEchoes(open, { col: 0, row: 0 }, excluded, echoCount(size), () => .5);
      expect(spawns).toHaveLength(size / 10);
      for (const p of spawns) { expect(p.col).toBeGreaterThanOrEqual(10); expect(excluded.has(`${p.col},0`)).toBe(false); }
      for (let i = 0; i < spawns.length; i++) for (let j = i + 1; j < spawns.length; j++) expect(Math.abs(spawns[i].col - spawns[j].col)).toBeGreaterThanOrEqual(6);
    }
  });
  it('uses walking distance and ignores unreachable corridors', () => {
    const open = new Set(['0,0','1,0','2,0','3,0','4,0','5,0','5,1','5,2','4,2','3,2','2,2','1,2','0,2','99,99']);
    const points = spawnEchoes(open, { col: 0, row: 0 }, new Set(), 3, () => .5);
    expect(points.length).toBeGreaterThan(0); expect(points.every(p => p.row === 2 && p.col <= 2)).toBe(true);
  });
  it('never relaxes spawn distances when no cells fit', () => expect(spawnEchoes(line(9), { col: 0, row: 0 }, new Set(), 3)).toEqual([]));
  it('keeps straight in corridors and reverses at dead ends', () => {
    expect(nextEchoCell({ col: 2, row: 0 }, { col: 1, row: 0 }, line(4))).toEqual({ col: 3, row: 0 });
    expect(nextEchoCell({ col: 3, row: 0 }, { col: 2, row: 0 }, line(4))).toEqual({ col: 2, row: 0 });
  });
  it('chooses a non-reversing branch at a junction', () => {
    const open = new Set(['0,0','1,0','2,0','1,1']);
    expect(nextEchoCell({ col: 1, row: 0 }, { col: 0, row: 0 }, open, () => .9)).toEqual({ col: 1, row: 1 });
  });
  it('moves smoothly at individual 0.8–1.2 speeds without entering walls', () => {
    expect(createEchoMotion({ col: 0, row: 0 }, () => 0).speed).toBe(.8);
    expect(createEchoMotion({ col: 0, row: 0 }, () => 1).speed).toBeCloseTo(1.2);
    const m = createEchoMotion({ col: 0, row: 0 }, () => .5), open = line(5);
    advanceEcho(m, .25, open, () => .5); expect(m.position.col).toBeCloseTo(.25);
    for (let i = 0; i < 1000; i++) { advanceEcho(m, .1, open, () => .5); expect(open.has(`${Math.round(m.position.col)},${m.position.row}`)).toBe(true); }
  });
  it('pauses for 1–2 seconds on a one-in-ten roll', () => {
    const m = createEchoMotion({ col: 0, row: 0 }, () => .5);
    advanceEcho(m, .1, line(5), () => .05);
    expect(m.position.col).toBe(0); expect(m.pause).toBeCloseTo(.95);
    advanceEcho(m, .95, line(5), () => .05); expect(m.position.col).toBe(0);
    advanceEcho(m, .1, line(5), () => .05); expect(m.position.col).toBeCloseTo(.1);
  });
});