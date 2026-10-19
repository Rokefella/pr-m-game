import { memo } from 'react';

export type AvatarPalette = 'purple' | 'amber' | 'teal' | 'red';

type Pal = {
  dark: string; mid: string; light: string; hi: string; spec: string; rim: string;
  aura: string; footDark: string; footMid: string; footHi: string;
};

const PALETTES: Record<AvatarPalette, Pal> = {
  purple: { dark: '#2f2790', mid: '#4b3fc4', light: '#6d60e6', hi: '#9d94f5', spec: '#e6e2ff', rim: '#7a6ee8', aura: '#5b4fd4', footDark: '#2f2790', footMid: '#5d50d8', footHi: '#b8b0fa' },
  red: { dark: '#6e1a1a', mid: '#a82c2c', light: '#d94646', hi: '#f28888', spec: '#ffe3e3', rim: '#e45a5a', aura: '#d93a3a', footDark: '#6e1a1a', footMid: '#b83434', footHi: '#f5b0b0' },
  amber: { dark: '#7a4a0a', mid: '#b8741a', light: '#e0993a', hi: '#f5c878', spec: '#fff1d6', rim: '#e8a64a', aura: '#c8963a', footDark: '#7a4a0a', footMid: '#c98420', footHi: '#f8d9a0' },
  teal: { dark: '#0f5c4b', mid: '#1a9e7a', light: '#3cc4a0', hi: '#86e3cb', spec: '#e0fff6', rim: '#4cd0ae', aura: '#1a9e7a', footDark: '#0f5c4b', footMid: '#22b08a', footHi: '#b5efdd' },
};

/** Maps an arbitrary aura hex to the nearest avatar palette by hue. */
export function paletteFromColor(hex: string | null | undefined, registrationNumber?: number | null): AvatarPalette {
  if (registrationNumber === 1) return 'red';
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return 'purple';
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d < 0.08) return 'purple';
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h < 75) return 'amber';
  if (h < 200) return 'teal';
  return 'purple';
}

const CSS = `
@keyframes paAura { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.15); opacity: .55; } }
@keyframes paOrb { 0%,100% { transform: scale(1); } 50% { transform: scale(1.03); } }
@keyframes paFoot { 0%,100% { transform: translateY(0); } 25% { transform: translateY(-6px); } 50% { transform: translateY(0); } }
@keyframes paShadow { 0%,100% { transform: scale(1); } 25% { transform: scale(.55); } 50% { transform: scale(1); } }
.pa-pulse, .pa-orb, .pa-foot, .pa-fshadow { transform-box: fill-box; transform-origin: center; }
.pa-pulse { animation: paAura 2.4s ease-in-out infinite; }
.pa-orb { animation: paOrb 2.4s ease-in-out infinite; }
.pa-walk .pa-foot, .pa-walk .pa-fshadow { animation-duration: .45s; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
.pa-walk .pa-foot { animation-name: paFoot; }
.pa-walk .pa-fshadow { animation-name: paShadow; }
.pa-walk .pa-r { animation-delay: -.225s; }
@media (prefers-reduced-motion: reduce) {
  .pa-pulse, .pa-orb, .pa-walk .pa-foot, .pa-walk .pa-fshadow { animation: none !important; }
}
`;

interface Props { palette: AvatarPalette; walking: boolean; size?: number }

function Foot({ x, p, cls }: { x: number; p: Pal; cls: string }) {
  return (
    <g className={`pa-foot ${cls}`}>
      <circle cx={x} cy={34} r={5} fill={p.footDark} />
      <circle cx={x - 1.2} cy={32.8} r={3.6} fill={p.footMid} />
      <circle cx={x - 2} cy={31.6} r={1.4} fill={p.footHi} />
    </g>
  );
}

function PlayerAvatar({ palette, walking, size = 30 }: Props) {
  const p = PALETTES[palette];
  const clipId = `pa-clip-${palette}`;
  // viewBox is 92 wide x 100 tall, origin offset (-46,-46)
  const height = (size * 100) / 92;
  return (
    <svg
      viewBox="-46 -46 92 100"
      width={size}
      height={height}
      className={walking ? 'pa-walk' : undefined}
      style={{ display: 'block', overflow: 'visible', pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <style>{CSS}</style>
      <defs>
        <clipPath id={clipId}><circle cx={0} cy={0} r={26} /></clipPath>
      </defs>
      <ellipse cx={0} cy={48} rx={22} ry={4.5} fill="#000" opacity={0.35} />
      <ellipse className="pa-fshadow pa-l" cx={-10} cy={45} rx={5} ry={1.6} fill="#000" opacity={0.45} />
      <ellipse className="pa-fshadow pa-r" cx={10} cy={45} rx={5} ry={1.6} fill="#000" opacity={0.45} />
      <Foot x={-10} p={p} cls="pa-l" />
      <Foot x={10} p={p} cls="pa-r" />
      <circle className="pa-pulse" cx={0} cy={0} r={40} fill={p.aura} opacity={0.12} />
      <circle className="pa-pulse" cx={0} cy={0} r={33} fill={p.aura} opacity={0.2} />
      <g className="pa-orb">
        <circle cx={0} cy={0} r={26} fill={p.dark} />
        <g clipPath={`url(#${clipId})`}>
          <circle cx={-4} cy={-5} r={25} fill={p.mid} />
          <circle cx={-9} cy={-11} r={15} fill={p.light} />
          <circle cx={-11} cy={-14} r={8} fill={p.hi} />
        </g>
        <ellipse cx={-12} cy={-16} rx={4} ry={2.5} fill={p.spec} transform="rotate(-35 -12 -16)" />
        <path d="M13,22.5 A26,26 0 0 0 23.6,11" stroke={p.rim} strokeWidth={2} strokeLinecap="round" opacity={0.7} fill="none" />
      </g>
    </svg>
  );
}

export default memo(PlayerAvatar);
