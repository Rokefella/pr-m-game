import { forwardRef, useImperativeHandle, useRef, type CSSProperties } from 'react';
import { cellDistance, nearestFragment, type Cell, type RunEffects } from '@/lib/mechanics';
import { PrimeShard } from '@/components/theme/objects';
import type { Dimension } from '@/lib/theme/tokens';
import './theme/mechanics.css';

export type MechanicEffectsHandle = { tick: (player: Cell, camera: { x: number; y: number }, clear: number, soft: number) => void; pulse: () => void };
type Props = { effects: RunEffects; fragments: Array<Cell & { prime: number }>; collected: Set<number>; door: Cell; dimension: Dimension; cellSize: number; viewport: { width: number; height: number } };
export const MechanicCompass = forwardRef<HTMLDivElement>(function MechanicCompass(_, ref) {
  return <div ref={ref} data-mechanic-compass className="mechanic-compass" hidden aria-label="Golden door direction"><svg width="20" height="20" viewBox="0 0 20 20" shapeRendering="crispEdges"><path d="M9 1h2v3h2v3h2v3h-4v9H9v-9H5V7h2V4h2Z" fill="currentColor" /></svg><span className="font-mono" /></div>;
});
export const MechanicChips = ({ effects }: { effects: RunEffects }) => {
  const labels = [effects.lantern_bonus > 0 ? `LIGHT +${effects.lantern_bonus}` : '', effects.chalk ? 'CHALK' : '', effects.compass ? 'COMPASS' : '', effects.magnet ? 'MAGNET' : '', effects.lucky ? 'LUCKY' : ''].filter(Boolean);
  return labels.length ? <span className="mechanic-chips font-mono">{labels.map(label => <span key={label}>{label}</span>)}</span> : null;
};
export const MazeMechanicEffects = forwardRef<MechanicEffectsHandle, Props>(function MazeMechanicEffects({ effects, fragments, collected, door, dimension, cellSize, viewport }, ref) {
  const world = useRef<HTMLDivElement>(null);
  const lantern = useRef<SVGCircleElement>(null);
  const revealGroup = useRef<SVGGElement>(null);
  const pulseGroup = useRef<HTMLDivElement>(null);
  const pulseRing = useRef<HTMLDivElement>(null);
  const pulseArrow = useRef<HTMLDivElement>(null);
  const pulseHighlight = useRef<HTMLDivElement>(null);
  const magnetic = useRef(new Map<number, HTMLDivElement>());
  const pulseUntil = useRef(0);
  const angle = useRef<number | null>(null);
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useImperativeHandle(ref, () => ({
    pulse() { pulseUntil.current = performance.now() + 4000; },
    tick(player, camera, clear, soft) {
      const x = camera.x + (player.col + .5) * cellSize, y = camera.y + (player.row + .5) * cellSize;
      if (world.current) world.current.style.transform = `translate(${camera.x}px, ${camera.y}px)`;
      if (lantern.current) { lantern.current.setAttribute('cx', String(x)); lantern.current.setAttribute('cy', String(y)); lantern.current.setAttribute('r', String(soft)); }
      if (revealGroup.current) revealGroup.current.setAttribute('transform', `translate(${camera.x} ${camera.y})`);
      for (const f of fragments) {
        const el = magnetic.current.get(f.prime);
        if (el) el.hidden = !effects.magnet || collected.has(f.prime) || cellDistance(f, player) > 3;
      }
      const compass = document.querySelector<HTMLDivElement>('[data-mechanic-compass]');
      const distance = cellDistance(player, door);
      if (compass) {
        compass.hidden = !effects.compass || distance <= 3;
        const raw = Math.atan2(door.row - player.row, door.col - player.col) * 180 / Math.PI + 90;
        const prior = angle.current ?? raw;
        angle.current = prior + ((raw - prior + 540) % 360 - 180);
        const svg = compass.querySelector('svg');
        if (svg) svg.style.transform = `rotate(${angle.current}deg)`;
        const label = compass.querySelector('span'); if (label) label.textContent = String(Math.round(distance));
      }
      const target = nearestFragment(fragments, collected, player);
      const active = performance.now() < pulseUntil.current && Boolean(target);
      if (pulseGroup.current) pulseGroup.current.hidden = !active;
      if (!active || !target) return;
      const progress = 1 - (pulseUntil.current - performance.now()) / 4000;
      const lit = cellDistance(player, target) * cellSize <= clear;
      if (pulseRing.current) { pulseRing.current.style.transform = `translate(${x}px, ${y}px) scale(${reduced() ? 1 : .2 + progress * 2})`; pulseRing.current.style.opacity = String(reduced() ? .5 : 1 - progress * .8); }
      if (pulseArrow.current) {
        pulseArrow.current.hidden = lit;
        const a = Math.atan2(target.row - player.row, target.col - player.col);
        pulseArrow.current.style.transform = `translate(${x + Math.cos(a) * cellSize * 3}px, ${y + Math.sin(a) * cellSize * 3}px) rotate(${a * 180 / Math.PI + 90}deg)`;
      }
      if (pulseHighlight.current) { pulseHighlight.current.hidden = !lit; pulseHighlight.current.style.transform = `translate(${camera.x + target.col * cellSize}px, ${camera.y + target.row * cellSize}px)`; }
    },
  }));
  return <>
    {effects.reveals.length > 0 && <svg className="mechanic-reveal-fog" width={viewport.width} height={viewport.height} aria-hidden="true"><defs>
      <radialGradient id="mechanic-lantern-gradient"><stop offset="0%" stopColor="var(--instrument-shadow)" /><stop offset="62.5%" stopColor="var(--instrument-shadow)" /><stop offset="81.25%" stopColor="var(--auth-text)" stopOpacity=".35" /><stop offset="100%" stopColor="var(--auth-text)" /></radialGradient>
      <filter id="mechanic-soft-edge" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12" /></filter>
      <mask id="mechanic-reveal-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={viewport.width} height={viewport.height} style={{ maskType: 'luminance' } as CSSProperties}>
        <rect width="100%" height="100%" fill="var(--auth-text)" /><circle ref={lantern} fill="url(#mechanic-lantern-gradient)" />
        <g ref={revealGroup}>{effects.reveals.map((p, i) => <g key={i}><rect x={(p.col - p.r) * cellSize} y={(p.row - p.r) * cellSize} width={(2 * p.r + 1) * cellSize} height={(2 * p.r + 1) * cellSize} fill="var(--instrument-shadow)" filter="url(#mechanic-soft-edge)" /><rect x={(p.col - p.r) * cellSize} y={(p.row - p.r) * cellSize} width={(2 * p.r + 1) * cellSize} height={(2 * p.r + 1) * cellSize} fill="var(--instrument-shadow)" /></g>)}</g>
      </mask></defs><rect width="100%" height="100%" fill="var(--mechanic-fog)" mask="url(#mechanic-reveal-mask)" /></svg>}
    <div ref={world} className="mechanic-map-overlay" data-game-world>
      {effects.reveals.map((p, i) => <div key={i} className="mechanic-reveal-tint" style={{ left: (p.col - p.r) * cellSize, top: (p.row - p.r) * cellSize, width: (2 * p.r + 1) * cellSize, height: (2 * p.r + 1) * cellSize }} />)}
      {fragments.filter(f => !collected.has(f.prime)).map(f => <div key={f.prime} hidden ref={el => { if (el) magnetic.current.set(f.prime, el); else magnetic.current.delete(f.prime); }} className="mechanic-magnet" style={{ left: f.col * cellSize, top: f.row * cellSize }}><PrimeShard dimension={dimension} size={cellSize} /></div>)}
    </div>
    <div ref={pulseGroup} hidden className="mechanic-pulse-overlay" data-game-world><div ref={pulseRing} className="mechanic-pulse-ring" /><div ref={pulseArrow} className="mechanic-pulse-arrow">↑</div><div ref={pulseHighlight} className="mechanic-pulse-highlight" style={{ width: cellSize, height: cellSize }} /></div>
  </>;
});