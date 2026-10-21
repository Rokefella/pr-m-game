import { useEffect, useRef, useState } from 'react';
import GhostOrb from './GhostOrb';
import { nearbyGhostLine, type GhostCell } from '@/lib/placedGhosts';

/** Placed art and a screen-space whisper, never part of room collision. */
export function RoomGhosts({ ghosts, cellSize = 20 }: { ghosts: GhostCell[]; cellSize?: number }) {
  return <>{ghosts.map(g => <div key={`${g.col},${g.row}`} style={{ position: 'absolute', left: g.col * cellSize + cellSize / 2, top: g.row * cellSize + cellSize / 2, zIndex: 4, pointerEvents: 'none' }}><GhostOrb title={g.title} tone={g.tone} cellSize={cellSize} /></div>)}</>;
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