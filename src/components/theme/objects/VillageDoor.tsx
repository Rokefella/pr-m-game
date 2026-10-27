import { memo } from 'react';
import { useReducedMotion } from '../useReducedMotion';
import type { WorldDoorKind as VillageDoorKind } from '@/lib/worldHome';

type Props = { kind: VillageDoorKind; size?: number; touched?: boolean };
const COLORS: Record<VillageDoorKind, string> = {
  maze: 'var(--village-door-maze)', library: 'var(--village-door-library)', exchange: 'var(--village-door-exchange)',
};

export default memo(function VillageDoor({ kind, size = 20, touched = false }: Props) {
  const reduced = useReducedMotion();
  const color = COLORS[kind];
  return <svg aria-hidden="true" data-village-door={kind} viewBox="0 0 48 48" width={size} height={size} shapeRendering="crispEdges" className="pointer-events-none" style={{ overflow: 'visible', imageRendering: 'pixelated', display: 'block' }}>
    <circle cx="24" cy="26" r="30" fill={color} opacity={touched ? .3 : .16}>
      {!reduced && <animate attributeName="opacity" values={touched ? '.3;.5;.3' : '.12;.32;.12'} dur="2s" repeatCount="indefinite" />}
    </circle>
    <rect x="4" y="2" width="40" height="46" fill="var(--village-door-frame)" />
    <rect x="6" y="7" width="17" height="41" fill="var(--plate-filled)" stroke="var(--instrument-edge)" />
    <rect x="25" y="7" width="17" height="41" fill="var(--plate-filled)" stroke="var(--instrument-edge)" />
    <rect x="4" y="2" width="40" height="5" fill="var(--plate-border)" />
    <path d="M24 7V48" stroke={color} strokeWidth="6" opacity=".28" fill="none" />
    <path d="M24 7V48" stroke={color} strokeWidth="2" fill="none" />
    <path d="M12 22L17 27L12 32M36 22L31 27L36 32" stroke={color} strokeWidth="1.5" fill="none" opacity=".8" />
  </svg>;
});