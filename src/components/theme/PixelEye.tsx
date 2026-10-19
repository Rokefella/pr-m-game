import { memo } from 'react';
import { DIMENSION_GLOW } from '@/lib/theme/tokens';

export default memo(function PixelEye({ glow = DIMENSION_GLOW.teal, size = 128, animate = false, closed = false }: { glow?: string; size?: number; animate?: boolean; closed?: boolean }) {
  return <svg viewBox="0 0 128 44" width={size} height={size * 44 / 128} shapeRendering="crispEdges" className="pixel-eye" aria-hidden="true">
    <rect x="0" y="14" width="128" height="16" fill={glow} opacity=".15" />
    {closed ? <g><rect x="16" y="22" width="96" height="4" fill="#9aa4d8" /><rect x="60" y="22" width="8" height="4" fill="#6d60e6" /></g> :
    <g className={`eye-lens ${animate ? 'eye-opening' : ''}`} style={{ transformOrigin: '64px 22px' }}>
      <rect x="12" y="2" width="104" height="8" fill="var(--plate-border)" /><rect x="8" y="6" width="112" height="8" fill="var(--plate-border)" /><rect x="4" y="10" width="120" height="8" fill="var(--plate-border)" /><rect x="0" y="14" width="128" height="8" fill="var(--plate-border)" /><rect x="0" y="22" width="128" height="8" fill="var(--plate-border)" /><rect x="4" y="26" width="120" height="8" fill="var(--plate-border)" /><rect x="8" y="30" width="112" height="8" fill="var(--plate-border)" /><rect x="12" y="34" width="104" height="8" fill="var(--plate-border)" />
      <rect x="16" y="4" width="96" height="4" fill="var(--plate-inset)" /><rect x="12" y="8" width="104" height="4" fill="var(--plate-inset)" /><rect x="8" y="12" width="112" height="4" fill="var(--plate-inset)" /><rect x="4" y="16" width="120" height="4" fill="var(--plate-inset)" /><rect x="4" y="20" width="120" height="4" fill="var(--plate-inset)" /><rect x="4" y="24" width="120" height="4" fill="var(--plate-inset)" /><rect x="8" y="28" width="112" height="4" fill="var(--plate-inset)" /><rect x="12" y="32" width="104" height="4" fill="var(--plate-inset)" /><rect x="16" y="36" width="96" height="4" fill="var(--plate-inset)" />
      <path d="M52,10H76V14H80V18H84V26H80V30H76V34H52V30H48V26H44V18H48V14H52Z" fill="var(--eye-iris)" /><path d="M56,14H72V18H76V26H72V30H56V26H52V18H56Z" fill="var(--eye-highlight)" /><rect x="60" y="18" width="8" height="8" fill="var(--eye-pupil)" /><rect x="55" y="15" width="4" height="4" fill="var(--eye-specular)" />
    </g>}
  </svg>;
});