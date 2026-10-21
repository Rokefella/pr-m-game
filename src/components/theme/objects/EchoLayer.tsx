import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import GhostOrb from './GhostOrb';
import { useReducedMotion } from '../useReducedMotion';
import { advanceEcho, createEchoMotion } from '@/lib/echoGhosts';
import type { GhostPoint } from '@/lib/ghostMotion';

export type EchoLayerHandle = { tick: (seconds: number, player: GhostPoint, lightRadius: number) => void };
export default forwardRef<EchoLayerHandle, { spawns: GhostPoint[]; open: ReadonlySet<string>; size: number; cellSize: number }>(function EchoLayer({ spawns, open, size, cellSize }, ref) {
  const nodes = useRef(new Map<number, HTMLDivElement>());
  const reduced = useReducedMotion();
  const echoes = useMemo(() => spawns.map(p => ({ motion: createEchoMotion(p), alpha: 0, age: 0 })), [spawns]);
  useImperativeHandle(ref, () => ({ tick(seconds, player, lightRadius) {
    for (let i = 0; i < echoes.length; i++) {
      const echo = echoes[i], m = echo.motion;
      const distance = Math.hypot(player.col - m.position.col, player.row - m.position.row);
      if (distance > 20) { echo.alpha = 0; const node = nodes.current.get(i); if (node) node.style.visibility = 'hidden'; continue; }
      if (!reduced) advanceEcho(m, seconds, open);
      echo.age += seconds;
      // Portal labels cannot inherit world fog, so use the identical light extent explicitly.
      const d = Math.hypot(player.col - m.position.col, player.row - m.position.row);
      const lit = Math.min(1, Math.max(0, (lightRadius - d) / 2));
      echo.alpha = lit * (reduced ? 1 : Math.min(1, echo.age));
      const node = nodes.current.get(i);
      if (node) {
        node.style.transform = `translate(${(m.position.col + .5) * cellSize}px, ${(m.position.row + .5) * cellSize}px)`;
        node.style.visibility = lit > 0 ? 'visible' : 'hidden';
        node.style.opacity = String(echo.alpha);
      }
    }
  } }), [echoes, open, cellSize, reduced]);
  return <>{echoes.map((echo, i) => <div key={i} data-object="ECHO" className="echo-position" ref={node => { if (node) nodes.current.set(i, node); else nodes.current.delete(i); }}>
    <GhostOrb title="Echo" size={size} labelOpacity={() => echo.alpha} />
  </div>)}</>;
});