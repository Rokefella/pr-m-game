import { memo } from 'react';
import './transition.css';

export type GateKind = 'maze' | 'library' | 'exchange';
export const DOOR_COLORS: Record<GateKind, string> = { maze: '#f5c060', library: '#62a8ff', exchange: '#b79bff' };

type Props = { kind: GateKind; open: boolean; width?: number | string; touchedGlow?: boolean };

export default memo(function GateScene({ kind, open, width = 'clamp(160px, 52vw, 240px)', touchedGlow = false }: Props) {
  const color = DOOR_COLORS[kind];
  return (
    <svg viewBox="0 0 96 126" width={width} className={open ? 'gate-open' : ''} style={{ overflow: 'visible', color, display: 'block', filter: touchedGlow ? `drop-shadow(0 0 8px ${color})` : undefined }} shapeRendering="crispEdges" aria-hidden="true">
      <rect width="96" height="120" fill="#1c2038" />
      <g className="gate-light">
        <rect x="24" y="14" width="48" height="102" fill="currentColor" opacity=".9" />
        <rect x="40" y="14" width="16" height="102" fill="#fff" opacity=".85" />
        <path d="M24 116H72L112 140H-16Z" fill="currentColor" opacity=".3" />
      </g>
      <g className="gate-panel gate-panel-left">
        <rect x="4" y="14" width="40" height="102" fill="#4a5385" stroke="#2f3560" />
        <path d="M8 18h3v3H8zM37 18h3v3h-3zM8 109h3v3H8zM37 109h3v3h-3z" fill="#aab4e8" />
        <path d="M16 52L26 62L16 72" stroke="currentColor" strokeWidth="2" fill="none" opacity=".8" />
      </g>
      <g className="gate-panel gate-panel-right">
        <rect x="52" y="14" width="40" height="102" fill="#4a5385" stroke="#2f3560" />
        <path d="M56 18h3v3h-3zM85 18h3v3h-3zM56 109h3v3h-3zM85 109h3v3h-3z" fill="#aab4e8" />
        <path d="M80 52L70 62L80 72" stroke="currentColor" strokeWidth="2" fill="none" opacity=".8" />
      </g>
      <rect width="96" height="12" fill="#9aa4d8" />
      <g className="gate-seam">
        <rect className={open ? '' : 'gate-seam-glow'} x="42" y="14" width="12" height="102" fill="currentColor" opacity=".2" />
        <rect x="46" y="14" width="4" height="102" fill="currentColor" />
      </g>
      <ellipse cx="48" cy="126" rx="56" ry="5" fill="currentColor" opacity=".25" />
    </svg>
  );
});
