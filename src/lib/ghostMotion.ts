export type GhostPoint = { col: number; row: number };
export type GhostWalkable = (col: number, row: number) => boolean;
const key = (p: GhostPoint) => `${p.col},${p.row}`;
const neighbours = (p: GhostPoint) => [{ col: p.col - 1, row: p.row }, { col: p.col + 1, row: p.row }, { col: p.col, row: p.row - 1 }, { col: p.col, row: p.row + 1 }];
export const GHOST_SPEED = 1.2;
export const GHOST_RANGE = 5;

export function reachableGhostCells(home: GhostPoint, free: GhostWalkable) {
  const cells = new Map<string, GhostPoint>();
  if (!free(home.col, home.row)) return cells;
  const queue = [{ ...home, distance: 0 }];
  cells.set(key(home), home);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (p.distance >= GHOST_RANGE) continue;
    for (const n of neighbours(p)) {
      if (cells.has(key(n)) || !free(n.col, n.row)) continue;
      cells.set(key(n), n); queue.push({ ...n, distance: p.distance + 1 });
    }
  }
  return cells;
}

/** One-cell-wide corridor tiles have no walkable neighbours across their travel axis. */
export function corridorCell(col: number, row: number, free: GhostWalkable) {
  if (!free(col, row)) return false;
  const h = free(col - 1, row) || free(col + 1, row);
  const v = free(col, row - 1) || free(col, row + 1);
  return (h && !free(col, row - 1) && !free(col, row + 1)) ||
    (v && !free(col - 1, row) && !free(col + 1, row)) ||
    (h && v && !(free(col - 1, row) && free(col + 1, row) && free(col, row - 1) && free(col, row + 1)) &&
      !free(col - 1, row - 1) && !free(col + 1, row - 1) && !free(col - 1, row + 1) && !free(col + 1, row + 1));
}

export function ghostPatrol(home: GhostPoint, free: GhostWalkable, path: GhostWalkable) {
  if (!path(home.col, home.row)) return null;
  const run = (dc: number, dr: number) => {
    const before: GhostPoint[] = [], after: GhostPoint[] = [];
    for (const [sign, list] of [[-1, before], [1, after]] as const) {
      for (let i = 1; i <= GHOST_RANGE; i++) {
        const p = { col: home.col + dc * i * sign, row: home.row + dr * i * sign };
        if (!free(p.col, p.row) || !path(p.col, p.row)) break;
        list.push(p);
      }
    }
    return [...before.reverse(), home, ...after];
  };
  const h = run(1, 0), v = run(0, 1);
  const longest = h.length >= v.length ? h : v;
  return longest.length > 1 ? longest : null;
}

export function ghostShortestPath(start: GhostPoint, end: GhostPoint, cells: Map<string, GhostPoint>) {
  const queue = [start], parents = new Map<string, GhostPoint | null>([[key(start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (key(p) === key(end)) {
      const route: GhostPoint[] = [];
      let current: GhostPoint | null | undefined = p;
      while (current) { route.unshift(current); current = parents.get(key(current)); }
      return route;
    }
    for (const n of neighbours(p)) if (cells.has(key(n)) && !parents.has(key(n))) { parents.set(key(n), p); queue.push(n); }
  }
  return [start];
}

export type GhostMotion = { home: GhostPoint; position: GhostPoint; current: GhostPoint; cells: Map<string, GhostPoint>; patrol: GhostPoint[] | null; targetEnd: number; route: GhostPoint[]; remaining: number };
export function createGhostMotion(home: GhostPoint, free: GhostWalkable, path?: GhostWalkable, random = Math.random): GhostMotion {
  const patrol = path ? ghostPatrol(home, free, path) : null;
  return { home, position: { ...home }, current: { ...home }, cells: reachableGhostCells(home, free), patrol, targetEnd: 1, route: [], remaining: 2 + random() * 3 };
}

export function advanceGhost(m: GhostMotion, seconds: number, random = Math.random) {
  if (m.remaining > 0) { m.remaining = Math.max(0, m.remaining - seconds); return; }
  if (!m.route.length) {
    if (m.patrol) {
      const end = m.patrol[m.targetEnd ? m.patrol.length - 1 : 0];
      // Patrol may reach five cells on BOTH sides of home, unlike wander's BFS radius.
      const cells = new Map(m.patrol.map(p => [key(p), p]));
      m.route = ghostShortestPath(m.current, end, cells).slice(1);
      m.targetEnd = m.targetEnd ? 0 : 1;
    } else {
      const choices = [...m.cells.values()].filter(p => Math.hypot(p.col - m.current.col, p.row - m.current.row) >= 2);
      const target = choices[Math.floor(random() * choices.length)];
      if (target) m.route = ghostShortestPath(m.current, target, m.cells).slice(1);
    }
    if (!m.route.length) { m.remaining = 2 + random() * 3; return; }
  }
  let travel = seconds * GHOST_SPEED;
  while (m.route.length && travel > 0) {
    const next = m.route[0], distance = Math.hypot(next.col - m.position.col, next.row - m.position.row);
    if (travel >= distance) {
      m.position = { ...next }; m.current = { ...next }; m.route.shift(); travel -= distance;
    } else {
      m.position.col += (next.col - m.position.col) * travel / distance;
      m.position.row += (next.row - m.position.row) * travel / distance;
      travel = 0;
    }
  }
  if (!m.route.length) m.remaining = m.patrol ? 1.5 : 1 + random() * 2;
}