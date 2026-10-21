import { useEffect, useMemo, useRef, useState } from 'react';
import GhostLayer from './GhostLayer';
import type { GhostPoint } from '@/lib/ghostMotion';
import { nearbyGhostLine, type GhostCell } from '@/lib/placedGhosts';

/** Placed art and a screen-space whisper, never part of room collision. */
export function RoomGhosts({ ghosts, cellSize = 20, size, solids, gridSize, player }: { ghosts: GhostCell[]; cellSize?: number; size: number; solids: { x: number; y: number; w: number; h: number }[]; gridSize: number; player: () => GhostPoint }) {
  const free = useMemo(() => (col: number, row: number) => {
    const x = col * cellSize + cellSize / 2, y = row * cellSize + cellSize / 2;
    return col >= 0 && row >= 0 && col < gridSize && row < gridSize &&
      !solids.some(o => x >= o.x - 2 && x <= o.x + o.w + 2 && y >= o.y - 2 && y <= o.y + o.h + 2);
  }, [solids, gridSize, cellSize]);
  return <GhostLayer ghosts={ghosts} size={size} cellSize={cellSize} free={free} player={player} />;
}

export function useRoomGhostWhisper(ghosts: GhostCell[]) {
  const [line, setLine] = useState<string | null>(null);
  const cooldowns = useRef(new Map<string, number>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const check = (x: number, y: number, cellSize = 20) => {
    const next = nearbyGhostLine(ghosts, x / cellSize - .5, y / cellSize - .5, cooldowns.current);
    if (!next) return;
    setLine(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setLine(null), 4000);
  };
  return { check, whisper: line ? <p className="ghost-proximity-whisper font-fell italic">{line}</p> : null };
}