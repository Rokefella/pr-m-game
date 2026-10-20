import { memo } from 'react';
import { useReducedMotion } from '../useReducedMotion';
import { DIMENSION_GLOW, type Dimension } from '@/lib/theme/tokens';

const ScreenGlow = ({ height }: { height: number }) => {
  const reduced = useReducedMotion();
  return <rect x="10" y="8" width="28" height={height} fill={DIMENSION_GLOW.teal} opacity=".14">
    {!reduced && <animate attributeName="opacity" values=".08;.24;.08" dur="1.8s" repeatCount="indefinite" />}
  </rect>;
};
type Props = { dimension?: Dimension; size: number };
export const ConsoleDoorTile = memo(function ConsoleDoorTile({ size }: Props) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 48 48" shapeRendering="crispEdges" className="console-art">
    <rect x="6" y="4" width="36" height="42" fill="var(--village-door-frame)" stroke="var(--plate-border)" strokeWidth="1.5" />
    <rect x="10" y="8" width="28" height="14" fill="var(--console-screen)" stroke="var(--plate-edge)" />
    <ScreenGlow height={14} />
    <path d="M14 13h4v2h-4zM20 13h4v2h-4zM26 13h4v2h-4zM32 13h4v2h-4z" fill={DIMENSION_GLOW.teal} />
    <path d="M14 27h4v4h-4zM22 27h4v4h-4zM30 27h4v4h-4zM14 34h4v4h-4zM22 34h4v4h-4zM30 34h4v4h-4z" fill="var(--plate-label)" />
    <rect x="2" y="2" width="44" height="44" fill="none" stroke={DIMENSION_GLOW.teal} strokeWidth="1.5" opacity=".6" />
  </svg>;
});
export const ConsoleTile = memo(function ConsoleTile({ size }: Props) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 48 48" shapeRendering="crispEdges" className="console-art">
    <ellipse cx="24" cy="44" rx="18" ry="4" fill="var(--instrument-shadow)" opacity=".35" />
    <rect x="6" y="14" width="36" height="28" fill="var(--plate-filled)" stroke="var(--plate-border)" />
    <rect x="10" y="8" width="28" height="18" fill="var(--console-screen)" stroke="var(--plate-edge)" />
    <ScreenGlow height={18} />
    <path d="M14 14h4v2h-4zM20 14h4v2h-4zM26 14h4v2h-4zM32 14h4v2h-4z" fill={DIMENSION_GLOW.teal} />
    <path d="M13 31h3v3h-3zM19 31h3v3h-3zM25 31h3v3h-3zM31 31h3v3h-3zM13 36h3v3h-3zM19 36h3v3h-3zM25 36h3v3h-3zM31 36h3v3h-3z" fill="var(--plate-label)" />
  </svg>;
});