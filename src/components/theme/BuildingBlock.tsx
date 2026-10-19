import { memo } from 'react';
import { VILLAGE_GLOW } from '@/lib/theme/tokens';

type Props = { cols: number; rows: number; size: number; label?: string; numbered?: boolean; glow?: string; doorway?: boolean };

export default memo(function BuildingBlock({ cols, rows, size, label, numbered = false, glow = VILLAGE_GLOW, doorway = true }: Props) {
  const W = cols * 48, H = rows * 48;
  return <svg aria-hidden="true" width={cols * size} height={rows * size} viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" className="pointer-events-none" style={{ imageRendering: 'pixelated', display: 'block', overflow: 'visible' }}>
    <rect x="7" y="7" width={W - 4} height={H - 4} fill="var(--instrument-shadow)" opacity=".35" />
    <rect x="4" y="4" width={W - 8} height={H - 8} fill="var(--instrument-module)" stroke={numbered ? 'var(--instrument-beacon)' : 'var(--instrument-edge)'} strokeWidth={numbered ? 1.5 : 1} />
    <rect x="10" y="10" width={W - 20} height={H - 24} fill="var(--instrument-roof)" stroke="var(--instrument-edge)" />
    {Array.from({ length: Math.max(0, Math.floor((W - 20) / 16)) }, (_, i) => <rect key={i} x={13 + i * 16} y="13" width="6" height="3" fill="var(--instrument-edge)" />)}
    <rect x={W - 14} y="18" width="2" height="10" fill="var(--instrument-highlight)" />
    <rect x={W - 15} y="16" width="4" height="3" fill={glow} />
    <rect x="8" y={H - 12} width={W - 16} height="3" fill="var(--instrument-strip)" opacity=".85" />
    {doorway && <rect x={W / 2 - 4} y={H - 8} width="8" height="4" fill="var(--instrument-beacon)" />}
    {numbered && <>
      <rect className="instrument-beacon-ring" x="1" y="1" width={W - 2} height={H - 2} fill="none" stroke="var(--instrument-beacon)" strokeWidth="1.5" />
      <text x={W / 2} y={H / 2 + 5 * 48 / size} textAnchor="middle" fontFamily="Cinzel, serif" fontSize={14 * 48 / size} fill="var(--instrument-beacon)">{label}</text>
    </>}
  </svg>;
});