import { memo } from 'react';

const GLOW_OPACITY = 0.28;
const PULSE_SCALE = 1.06;
const PULSE_MS = 1800;
const FOOT_LIFT = 3;

export type AvatarPalette = 'purple' | 'amber' | 'teal' | 'red';

type Pal = {
  dark: string; mid: string; light: string; hi: string; spec: string; outline: string;
  aura: string; footDark: string; footMid: string; footHi: string;
};

const PALETTES: Record<AvatarPalette, Pal> = {
  purple: { dark: '#2f2790', mid: '#4b3fc4', light: '#6d60e6', hi: '#9d94f5', spec: '#e6e2ff', outline: '#1a1448', aura: '#5b4fd4', footDark: '#2f2790', footMid: '#5d50d8', footHi: '#b8b0fa' },
  red: { dark: '#6e1a1a', mid: '#a82c2c', light: '#d94646', hi: '#f28888', spec: '#ffe3e3', outline: '#3a0d0d', aura: '#d93a3a', footDark: '#6e1a1a', footMid: '#b83434', footHi: '#f5b0b0' },
  amber: { dark: '#7a4a0a', mid: '#b8741a', light: '#e0993a', hi: '#f5c878', spec: '#fff1d6', outline: '#3d2405', aura: '#c8963a', footDark: '#7a4a0a', footMid: '#c98420', footHi: '#f8d9a0' },
  teal: { dark: '#0f5c4b', mid: '#1a9e7a', light: '#3cc4a0', hi: '#86e3cb', spec: '#e0fff6', outline: '#072e26', aura: '#1a9e7a', footDark: '#0f5c4b', footMid: '#22b08a', footHi: '#b5efdd' },
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
@keyframes paGlow { 0%,100% { transform: scale(1); opacity: .7; } 50% { transform: scale(1.12); opacity: 1; } }
@keyframes paOrb { 0%,100% { transform: scale(1); } 50% { transform: scale(${PULSE_SCALE}); } }
@keyframes paFoot { 0%,50%,100% { transform: translateY(0); } 25% { transform: translateY(-${FOOT_LIFT}px); } }
@keyframes paShadow { 0%,50%,100% { transform: scale(1); } 25% { transform: scale(.6); } }
.pa-glow, .pa-orb, .pa-foot, .pa-fshadow { transform-box: fill-box; transform-origin: center; }
.pa-glow { animation: paGlow ${PULSE_MS}ms ease-in-out infinite; }
.pa-orb { animation: paOrb ${PULSE_MS}ms ease-in-out infinite; }
.pa-walk .pa-foot, .pa-walk .pa-fshadow { animation-duration: .45s; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
.pa-walk .pa-foot { animation-name: paFoot; }
.pa-walk .pa-fshadow { animation-name: paShadow; }
.pa-walk .pa-r { animation-delay: -.225s; }
@media (prefers-reduced-motion: reduce) {
  .pa-glow, .pa-orb, .pa-foot, .pa-fshadow { animation: none !important; }
}
`;

interface Props { palette: AvatarPalette; walking: boolean; size?: number }

function PlayerAvatar({ palette, walking, size = 30 }: Props) {
  const p = PALETTES[palette];
  const glowId = `pa-glow-${palette}`;
  const height = (size * 100) / 92;
  return (
    <svg viewBox="-46 -46 92 100" width={size} height={height}
      className={walking ? 'pa-walk' : undefined}
      style={{ display: 'block', overflow: 'visible', pointerEvents: 'none' }} aria-hidden="true">
      <style>{CSS}</style>
      <defs>
        <radialGradient id={glowId}>
          <stop offset="0" stopColor={p.aura} stopOpacity={GLOW_OPACITY} />
          <stop offset=".55" stopColor={p.aura} stopOpacity={GLOW_OPACITY * .4} />
          <stop offset="1" stopColor={p.aura} stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform="translate(-26 -26) scale(1.4444)" shapeRendering="crispEdges">
        <circle cx="18" cy="18" r="26" fill={`url(#${glowId})`} className="pa-glow" shapeRendering="geometricPrecision" />
        <ellipse cx="18" cy="45" rx="14" ry="3" fill="var(--instrument-shadow)" opacity=".4" />
        <ellipse className="pa-fshadow pa-l" cx="10" cy="42" rx="3" ry="1" fill="var(--instrument-shadow)" opacity=".45" />
        <ellipse className="pa-fshadow pa-r" cx="26" cy="42" rx="3" ry="1" fill="var(--instrument-shadow)" opacity=".45" />
        <g className="pa-foot pa-l">
          <rect x="7" y="33" width="6" height="7" fill={p.footMid} />
          <rect x="7" y="38" width="6" height="2" fill={p.footDark} />
        </g>
        <g className="pa-foot pa-r">
          <rect x="23" y="33" width="6" height="7" fill={p.footMid} />
          <rect x="23" y="38" width="6" height="2" fill={p.footDark} />
        </g>
        <g className="pa-orb">
          <path d="M12,0H24V3H30V6H33V9H36V27H33V30H30V33H24V36H12V33H6V30H3V27H0V9H3V6H6V3H12Z" fill={p.dark} stroke={p.outline} strokeWidth="3" strokeLinejoin="miter" />
          <path d="M12,3H24V6H30V9H33V21H27V27H21V30H9V27H6V24H3V9H6V6H12Z" fill={p.mid} />
          <path d="M9,6H21V9H15V12H12V15H9V18H6V9H9Z" fill={p.light} />
          <path d="M9,9H15V12H12V15H9Z" fill={p.hi} />
          <rect x="9" y="9" width="3" height="3" fill={p.spec} />
        </g>
      </g>
    </svg>
  );
}

export default memo(PlayerAvatar);
