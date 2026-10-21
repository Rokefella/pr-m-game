import type { GhostPoint } from './ghostMotion';

export const ECHO_CELLS_PER_GHOST = 10;
const key = (p: GhostPoint) => `${p.col},${p.row}`;
const neighbours = (p: GhostPoint) => [
  { col: p.col + 1, row: p.row }, { col: p.col - 1, row: p.row },
  { col: p.col, row: p.row + 1 }, { col: p.col, row: p.row - 1 },
];
export function echoCount(size: number, override?: number): number {
  if (typeof override === 'number' && Number.isFinite(override) && override >= 0) return Math.round(override);
  return Math.min(20, Math.max(1, Math.round(size / ECHO_CELLS_PER_GHOST)));
}
function distances(start: GhostPoint, open: ReadonlySet<string>, max = Infinity) {
  const result = new Map<string, number>();
  if (!open.has(key(start))) return result;
  const queue = [start]; result.set(key(start), 0);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i], distance = result.get(key(p)) ?? 0;
    if (distance >= max) continue;
    for (const n of neighbours(p)) if (open.has(key(n)) && !result.has(key(n))) {
      result.set(key(n), distance + 1); queue.push(n);
    }
  }
  return result;
}
export function spawnEchoes(open: ReadonlySet<string>, start: GhostPoint, excluded: ReadonlySet<string>, count: number, random = Math.random): GhostPoint[] {
  const candidates = [...distances(start, open)].filter(([k, d]) => d >= 10 && !excluded.has(k)).map(([k]) => {
    const [col, row] = k.split(',').map(Number); return { col, row };
  });
  // Shuffle once; no retries or unbounded search when a map cannot fit every Echo safely.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)); [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const blocked = new Set<string>(), chosen: GhostPoint[] = [];
  for (const p of candidates) {
    if (chosen.length >= count) break;
    if (blocked.has(key(p))) continue;
    chosen.push(p);
    for (const k of distances(p, open, 5).keys()) blocked.add(k);
  }
  return chosen;
}
export function nextEchoCell(current: GhostPoint, previous: GhostPoint | null, open: ReadonlySet<string>, random = Math.random): GhostPoint | null {
  const options = neighbours(current).filter(p => open.has(key(p)));
  const forward = options.filter(p => !previous || key(p) !== key(previous));
  if (!forward.length) return options[0] ?? null;
  if (forward.length === 1) return forward[0];
  // Junctions choose among every non-reversing branch; straight is retained in corridors.
  return forward[Math.floor(random() * forward.length)] ?? null;
}
export type EchoMotion = { current: GhostPoint; previous: GhostPoint | null; position: GhostPoint; target: GhostPoint | null; speed: number; pause: number };
export function createEchoMotion(spawn: GhostPoint, random = Math.random): EchoMotion {
  return { current: spawn, previous: null, position: { ...spawn }, target: null, speed: .8 + random() * .4, pause: 0 };
}
export function advanceEcho(m: EchoMotion, seconds: number, open: ReadonlySet<string>, random = Math.random): void {
  let remaining = seconds;
  while (remaining > 0) {
    if (m.pause > 0) { const used = Math.min(remaining, m.pause); m.pause -= used; remaining -= used; if (!remaining) return; }
    if (!m.target) {
      m.target = nextEchoCell(m.current, m.previous, open, random);
      if (!m.target) return;
      if (random() < .1) { m.pause = 1 + random(); continue; }
    }
    const distance = Math.hypot(m.target.col - m.position.col, m.target.row - m.position.row);
    const travel = Math.min(distance, remaining * m.speed);
    if (distance > 0) {
      m.position.col += (m.target.col - m.position.col) * travel / distance;
      m.position.row += (m.target.row - m.position.row) * travel / distance;
    }
    remaining -= travel / m.speed;
    if (travel < distance) return;
    m.previous = m.current; m.current = m.target; m.position = { ...m.target }; m.target = null;
  }
}