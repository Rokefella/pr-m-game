import { memo } from 'react';
import { VILLAGE_GLOW } from '@/lib/theme/tokens';

type Props = { cols: number; rows: number; size: number; label?: string; numbered?: boolean; glow?: string; doorway?: boolean };

export default memo(function BuildingBlock({ cols, rows, size, label, numbered = false, glow = VILLAGE_GLOW, doorway = true }: Props) {
  const W = cols * 48, H = rows * 48;
  const windows = Math.max(0, Math.floor((W - 20) / 28));
  return <svg aria-hidden="true" width={cols * size} height={rows * size} viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" className="pointer-events-none" style={{ imageRendering: 'pixelated', display: 'block', overflow: 'visible' }}>
    <rect x="10" y="10" width={W - 8} height={H - 8} fill="var(--instrument-shadow)" opacity=".35" />
    <rect x="4" y="4" width={W - 8} height={H - 20} fill="var(--instrument-module)" stroke={numbered ? 'var(--instrument-beacon)' : 'var(--instrument-edge)'} strokeWidth={numbered ? 1.5 : 1} />
    <rect x="10" y="10" width={W - 20} height={Math.max(0, H - 36)} fill="var(--instrument-roof)" stroke="var(--instrument-edge)" />
    {Array.from({ length: Math.max(0, Math.floor((W - 20) / 16)) }, (_, i) => <rect key={i} x={13 + i * 16} y="13" width="6" height="3" fill="var(--instrument-edge)" />)}
    <rect x={W - 14} y="18" width="2" height="10" fill="var(--instrument-highlight)" />
    <rect x={W - 15} y="16" width="4" height="3" fill={glow} />
    <rect x="4" y={H - 16} width={W - 8} height="12" fill="#3a4272" stroke="#2f3560" />
    {Array.from({ length: windows }, (_, i) => <rect key={`w${i}`} x={10 + i * 28} y={H - 13} width="14" height="6" fill="#aef6ff" opacity=".85" />)}
    {doorway && <rect x={W / 2 - 4} y={H - 8} width="8" height="4" fill="var(--instrument-beacon)" />}
    {numbered && <>
      <rect className="instrument-beacon-ring" x="1" y="1" width={W - 2} height={H - 2} fill="none" stroke="var(--instrument-beacon)" strokeWidth="1.5" />
      <text x={W / 2} y={H / 2 + 5 * 48 / size} textAnchor="middle" fontFamily="Cinzel, serif" fontSize={14 * 48 / size} fill="var(--instrument-beacon)">{label}</text>
    </>}
  </svg>;
});
