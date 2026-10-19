import { memo, type ReactNode } from 'react';
import { DIMENSION_GLOW, type Dimension } from '@/lib/theme/tokens';
export { default as VillageDoor } from './VillageDoor';

type Props = { dimension: Dimension; size: number };
function Art({ size, children }: { size: number; children: ReactNode }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 48 48" shapeRendering="crispEdges" className="pointer-events-none" style={{ imageRendering: 'pixelated' }}>{children}</svg>;
}

export const PrimeShard = memo(function PrimeShard({ dimension, size }: Props) {
  const glow = DIMENSION_GLOW[dimension];
  return <Art size={size}><path d="M24 6L35 24L24 42L13 24Z" fill={glow} opacity=".12" /><path d="M24 12L30 24L24 36L18 24Z" fill={glow} opacity=".85" /><path d="M24 12V36M18 24H30" stroke="hsl(var(--foreground))" opacity=".65" /><path d="M8 24H11M37 24H40M24 3V6M24 42V45" stroke={glow} opacity=".6" /></Art>;
});

export const Gate = memo(function Gate({ dimension, size, variant }: Props & { variant: 'golden' | 'blue' }) {
  const glow = DIMENSION_GLOW[dimension];
  const metal = variant === 'golden' ? 'hsl(var(--gold))' : glow;
  return <Art size={size}><path d="M9 41V17L17 7H31L39 17V41Z" fill="hsl(var(--background))" stroke={metal} strokeWidth="2" /><path d="M14 39V18L20 12H28L34 18V39" stroke={glow} opacity=".65" fill="none" /><path d="M24 16V37M17 23H31M17 29H31" stroke={metal} opacity=".75" /><rect x="21" y="23" width="6" height="6" fill={glow} /><path d="M6 43H42" stroke={metal} strokeWidth="2" /></Art>;
});

export const Veil = memo(function Veil({ dimension, size }: Props) {
  const glow = DIMENSION_GLOW[dimension];
  return <Art size={size}><rect x="5" y="5" width="38" height="38" fill={glow} opacity=".08" /><path d="M10 6V42M17 6V42M24 6V42M31 6V42M38 6V42" stroke={glow} opacity=".45" /><path d="M5 10H43M5 38H43" stroke={glow} opacity=".65" /><path d="M17 24L24 17L31 24L24 31Z" stroke={glow} fill="none" /></Art>;
});

export const RoomDoorTile = memo(function RoomDoorTile({ dimension, size, color }: Props & { color?: string }) {
  const glow = DIMENSION_GLOW[dimension];
  return <Art size={size}><rect x="10" y="6" width="28" height="37" fill="hsl(var(--background))" stroke={color ?? glow} strokeWidth="2" /><rect x="15" y="11" width="18" height="27" fill={color ?? glow} opacity=".15" /><path d="M24 12V36M16 41H32" stroke={glow} opacity=".5" /><rect x="28" y="24" width="3" height="3" fill={glow} /></Art>;
});

export const DropSpawnGlimmer = memo(function DropSpawnGlimmer({ dimension, size }: Props) {
  const glow = DIMENSION_GLOW[dimension];
  return <Art size={size}><path d="M24 16V32M16 24H32M18 18L30 30M30 18L18 30" stroke={glow} opacity=".28" /><rect x="22" y="22" width="4" height="4" fill={glow} opacity=".5" /></Art>;
});

export const DropCrate = memo(function DropCrate({ dimension, size }: Props) {
  const glow = DIMENSION_GLOW[dimension];
  return <Art size={size}><path d="M11 15L24 9L37 15V35L24 41L11 35Z" fill="hsl(var(--background))" stroke={glow} opacity=".9" /><path d="M11 15L24 21L37 15M24 21V41M17 12L30 18V38" stroke={glow} opacity=".5" /><rect x="21" y="25" width="6" height="5" fill={glow} opacity=".65" /></Art>;
});

export const NpcPad = memo(function NpcPad({ dimension, size }: Props) {
  const glow = DIMENSION_GLOW[dimension];
  return <Art size={size}><ellipse cx="24" cy="28" rx="17" ry="10" fill={glow} opacity=".08" /><ellipse cx="24" cy="28" rx="17" ry="10" stroke={glow} fill="none" opacity=".45" /><path d="M8 28H12M36 28H40M24 15V19M24 37V41" stroke={glow} opacity=".6" /></Art>;
});

export const StartPad = memo(function StartPad({ dimension, size }: Props) {
  const glow = DIMENSION_GLOW[dimension];
  return <Art size={size}><path d="M6 17V6H17M31 6H42V17M6 31V42H17M31 42H42V31" stroke={glow} fill="none" opacity=".55" /><path d="M18 24L24 18L30 24L24 30Z" fill={glow} opacity=".15" /></Art>;
});

export const Pylon = memo(function Pylon({ dimension, size }: Props) {
  const glow = DIMENSION_GLOW[dimension];
  return <Art size={size}><rect x="18" y="13" width="12" height="29" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeOpacity=".55" /><rect x="15" y="8" width="18" height="11" fill={glow} opacity=".18" /><rect x="18" y="11" width="12" height="5" fill={glow} /><path d="M21 23H27M21 29H27M15 42H33" stroke={glow} opacity=".6" /></Art>;
});
/* ---- Room objects (Instrument interiors). Pure presentation, one inline svg per cell. ---- */
type RoomObjProps = { size: number };

export const DataShelf = memo(function DataShelf({ size, seed = 0 }: RoomObjProps & { seed?: number }) {
  const cols = ['#62e6f0', '#f5c060', '#b79bff', '#3cc4a0'];
  return <Art size={size}>
    <rect x="3" y="3" width="42" height="42" fill="#1c2038" stroke="#5d67a0" strokeWidth="2" />
    <path d="M5 17H43M5 31H43" stroke="#5d67a0" strokeWidth="2" />
    {[0, 1, 2].map(r => [0, 1, 2, 3, 4].map(c => {
      const k = (seed + r * 5 + c * 3) % 7;
      return k < 5 ? <rect key={`${r}-${c}`} x={7 + c * 7} y={6 + r * 14} width="5" height={k % 2 ? 9 : 7} fill={cols[k % 4]} opacity={k === 0 ? 1 : 0.75} /> : null;
    }))}
    <path d="M3 4H45" stroke="#9aa4d8" opacity=".6" />
  </Art>;
});

export const ConsoleDesk = memo(function ConsoleDesk({ size }: RoomObjProps) {
  return <Art size={size}>
    <rect x="6" y="40" width="38" height="4" fill="#000" opacity=".3" />
    <rect x="4" y="14" width="40" height="26" fill="#3a4272" stroke="#232a52" strokeWidth="2" />
    <path d="M5 15H43" stroke="#8e99d0" opacity=".7" />
    <rect x="9" y="18" width="30" height="12" fill="#0f2a3a" stroke="#62e6f0" />
    <path d="M12 24H20M23 24H27M12 27H34" stroke="#62e6f0" opacity=".8" />
    <path d="M10 34h4v3h-4zM18 34h4v3h-4zM26 34h4v3h-4z" fill="#f5c060" opacity=".8" />
    <rect x="34" y="34" width="4" height="3" fill="#ff8a6a" />
  </Art>;
});

export const FloorLamp = memo(function FloorLamp({ size, color = '#f5c060' }: RoomObjProps & { color?: string }) {
  return <Art size={size}>
    <circle className="room-lamp-glow" cx="24" cy="18" r="20" fill={color} opacity=".22" shapeRendering="geometricPrecision" />
    <rect x="16" y="40" width="16" height="4" fill="#232a52" />
    <rect x="22" y="20" width="4" height="21" fill="#4d5894" />
    <path d="M14 8H34L30 20H18Z" fill="#2c3460" stroke="#8e99d0" />
    <rect x="19" y="13" width="10" height="5" fill={color} />
    <rect x="21" y="14" width="3" height="2" fill="#fff3c4" />
  </Art>;
});

export type ExitDir = 'up' | 'down' | 'left' | 'right';
const EXIT_ROT: Record<ExitDir, number> = { down: 0, left: 90, up: 180, right: 270 };
export const RoomExit = memo(function RoomExit({ size, dir = 'down' }: RoomObjProps & { dir?: ExitDir }) {
  return <Art size={size}>
    <rect x="2" y="2" width="44" height="44" fill="#f5c060" opacity=".14" stroke="#f5c060" strokeOpacity=".6" />
    <g transform={`rotate(${EXIT_ROT[dir]} 24 24)`}>
      <path className="room-exit-arrow" d="M14 12L24 21L34 12" stroke="#f5c060" strokeWidth="4" fill="none" />
      <path className="room-exit-arrow room-exit-arrow-2" d="M14 26L24 35L34 26" stroke="#f5c060" strokeWidth="4" fill="none" />
    </g>
  </Art>;
});
