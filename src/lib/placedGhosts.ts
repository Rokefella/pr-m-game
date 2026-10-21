export type PlacedCell = { col: number; row: number; type: string; title?: string; line?: string; tone?: string };
export type GhostCell = PlacedCell & { type: 'GHOST' };
export const SPAWN_RADIUS = 4;
export const GHOST_COOLDOWN = 30_000;

export function placedGhosts(cells: readonly PlacedCell[]): GhostCell[] {
  return cells.filter((c): c is GhostCell => c.type === 'GHOST' && Number.isFinite(c.col) && Number.isFinite(c.row));
}

/** Only arrival placement uses this filter; movement collision remains caller-owned. */
export function randomSpawnCell(origin: { col: number; row: number }, free: (col: number, row: number) => boolean, random = Math.random) {
  const candidates: { col: number; row: number }[] = [];
  for (let dy = -SPAWN_RADIUS; dy <= SPAWN_RADIUS; dy++) {
    for (let dx = -SPAWN_RADIUS; dx <= SPAWN_RADIUS; dx++) {
      if (dx * dx + dy * dy > SPAWN_RADIUS * SPAWN_RADIUS) continue;
      const col = origin.col + dx, row = origin.row + dy;
      if (free(col, row)) candidates.push({ col, row });
    }
  }
  return candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))] ?? null;
}

export function nearbyGhostLine(ghosts: readonly GhostCell[], col: number, row: number, cooldowns: Map<string, number>, now = Date.now()): string | null {
  for (const ghost of ghosts) {
    if (!ghost.line || Math.hypot(col - ghost.col, row - ghost.row) > 1) continue;
    const key = `${ghost.col},${ghost.row}`;
    const last = cooldowns.get(key);
    if (last !== undefined && now - last < GHOST_COOLDOWN) continue;
    cooldowns.set(key, now);
    return ghost.line;
  }
  return null;
}