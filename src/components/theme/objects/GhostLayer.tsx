import { memo, useEffect, useMemo, useRef } from 'react';
import GhostOrb from './GhostOrb';
import { useReducedMotion } from '../useReducedMotion';
import { advanceGhost, createGhostMotion, type GhostPoint, type GhostWalkable } from '@/lib/ghostMotion';
import { ghostPositions, type GhostCell } from '@/lib/placedGhosts';

type Props = { ghosts: GhostCell[]; size: number; cellSize: number; free: GhostWalkable; path?: GhostWalkable; player: () => GhostPoint; offset?: number };
export default memo(function GhostLayer({ ghosts, size, cellSize, free, path, player, offset = .5 }: Props) {
  const nodes = useRef(new Map<GhostCell, HTMLDivElement>());
  const playerRef = useRef(player);
  playerRef.current = player;
  const reduced = useReducedMotion();
  const motions = useMemo(() => ghosts.map(ghost => ({ ghost, motion: createGhostMotion(ghost, free, path) })), [ghosts, free, path]);
  useEffect(() => {
    let frame = 0, previous = 0;
    const draw = (time: number) => {
      const dt = previous ? Math.min((time - previous) / 1000, .1) : 0;
      previous = time;
      const p = playerRef.current();
      for (const { ghost, motion } of motions) {
        if (Math.hypot(p.col - motion.position.col, p.row - motion.position.row) > 20) continue;
        if (!reduced) advanceGhost(motion, dt);
        ghostPositions.set(ghost, motion.position);
        const node = nodes.current.get(ghost);
        if (node) node.style.transform = `translate(${(motion.position.col - ghost.col) * cellSize}px, ${(motion.position.row - ghost.row) * cellSize}px)`;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); motions.forEach(({ ghost }) => ghostPositions.delete(ghost)); };
  }, [motions, cellSize, reduced]);
  return <>{ghosts.map(g => <div key={`${g.col},${g.row}`} ref={node => { if (node) nodes.current.set(g, node); else nodes.current.delete(g); }} className="ghost-position" style={{ left: (g.col + offset) * cellSize, top: (g.row + offset) * cellSize }}><GhostOrb title={g.title} tone={g.tone} size={size} cellSize={cellSize} /></div>)}</>;
});