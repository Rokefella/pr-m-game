import { memo } from 'react';

export default memo(function GhostOrb({ title = '', tone = 'pale', size = 32, cellSize = 20 }: { title?: string; tone?: string; size?: number; cellSize?: number }) {
  const safeTone = ['pale', 'mist', 'gold', 'rose'].includes(tone) ? tone : 'pale';
  return <div className={`ghost-orb ghost-tone-${safeTone}`} data-object="GHOST" style={{ width: size }}>
    <span className="ghost-title font-fell italic" title={title} style={{ width: cellSize * 8 }}>{title}</span>
    <svg aria-hidden="true" className="ghost-body" width={size} height={size} viewBox="0 0 36 36" shapeRendering="crispEdges">
      <path d="M12 0H24V3H30V6H33V9H36V27H33V30H30V33H24V36H12V33H6V30H3V27H0V9H3V6H6V3H12Z" fill="currentColor" />
      <path d="M9 6H21V9H15V12H12V15H9V18H6V9H9Z" fill="var(--npc-specular)" opacity=".3" />
    </svg>
  </div>;
});