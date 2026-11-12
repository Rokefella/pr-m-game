export type SpeedFragment = { prime: number; col: number; row: number };
export type CrateClaim = { granted: boolean; name?: string; kind?: 'key' | 'drop'; reason?: string };
export type CollectAllDeps = {
  fragments: SpeedFragment[];
  isCollected: (prime: number) => boolean;
  claimFragment: (fragment: SpeedFragment) => Promise<{ ok: boolean; reason?: string }>;
  onFragment: (prime: number) => void;
  crates: () => string[];
  claimCrate: (col: number, row: number) => Promise<CrateClaim>;
};

/** Claims every uncollected fragment then every crate, one at a time, through the caller's normal pickup paths. */
export async function collectAll(deps: CollectAllDeps) {
  let fragments = 0, items = 0, left = 0; let key = '';
  for (const frag of deps.fragments) {
    if (deps.isCollected(frag.prime)) continue;
    try {
      const result = await deps.claimFragment(frag);
      if (!result.ok) { if (/full/i.test(result.reason ?? '')) left++; continue; }
      deps.onFragment(frag.prime); fragments++;
    } catch { /* stays in the maze */ }
  }
  for (const cell of deps.crates()) {
    const [col, row] = cell.split(',').map(Number);
    const result = await deps.claimCrate(col, row);
    if (result.granted) { items++; if (result.kind === 'key') key = result.name ?? 'key'; }
    else if (/full/i.test(result.reason ?? '')) left++;
  }
  return { fragments, items, left, key, text: `Collected ${fragments} fragments, ${items} items (key: ${key || 'none'})${left ? `. Folder full: ${left} left behind` : ''}` };
}

/** Nearest open cell around a target, ring by ring; never the target itself. */
export function nearestOpenNeighbour(target: { col: number; row: number }, cols: number, rows: number, isWall: (c: number, r: number) => boolean) {
  for (let r = 1; r < Math.max(cols, rows); r++) {
    let best: { col: number; row: number } | null = null; let bestD = Infinity;
    for (let dr = -r; dr <= r; dr++) for (let dc = -r; dc <= r; dc++) {
      if (Math.max(Math.abs(dc), Math.abs(dr)) !== r) continue;
      const c = target.col + dc, w = target.row + dr;
      if (c < 0 || w < 0 || c >= cols || w >= rows || isWall(c, w)) continue;
      const d = Math.abs(dc) + Math.abs(dr);
      if (d < bestD) { bestD = d; best = { col: c, row: w }; }
    }
    if (best) return best;
  }
  return null;
}
