import { memo } from 'react';

export default memo(function GhostOrb({ title = '', tone = 'pale', size = 25, cellSize = 20 }: { title?: string; tone?: string; size?: number; cellSize?: number }) {
  const safeTone = ['pale', 'mist', 'gold', 'rose'].includes(tone) ? tone : 'pale';
  return <div className={`ghost-orb ghost-tone-${safeTone}`} data-object="GHOST" style={{ width: size }}>
    <span className="ghost-title font-fell italic" title={title} style={{ width: cellSize * 8, bottom: size * 76 / 92 + 6 }}>{title}</span>
    <svg aria-hidden="true" className="ghost-body" width={size} height={size * 100 / 92} viewBox="-46 -46 92 100" shapeRendering="crispEdges">
      <g transform="translate(-26 -26) scale(1.4444)">
        <path d="M12,0H24V3H30V6H33V9H36V27H33V30H30V33H24V36H12V33H6V30H3V27H0V9H3V6H6V3H12Z" fill="currentColor" stroke="var(--ghost-outline)" strokeWidth="3" />
        <path d="M12,3H24V6H30V9H33V21H27V27H21V30H9V27H6V24H3V9H6V6H12Z" fill="var(--ghost-mid)" />
        <path d="M9,6H21V9H15V12H12V15H9V18H6V9H9Z" fill="var(--ghost-light)" />
        <path d="M9,9H15V12H12V15H9Z" fill="var(--ghost-highlight)" />
        <rect x="9" y="9" width="3" height="3" fill="var(--npc-specular)" />
        <rect x="16" y="39" width="3" height="3" fill="currentColor" opacity=".25" />
        <rect x="18" y="44" width="2" height="2" fill="currentColor" opacity=".1" />
      </g>
    </svg>
  </div>;
});