import { memo, useRef } from 'react';
import type { NpcQuestState } from '@/lib/npcQuestState';
import OrbLabels from '@/components/OrbLabels';
import { useNpcDisplayName } from '@/hooks/useNpcQuestStates';

const SYMBOLS = {
  bernard: 'M1 0h3v1h-3zM0 1h5v3h-5zM2 4h1v1h-1z',
  merchant: 'M1 0h3v1h-3zM0 1h1v3h-1zM4 1h1v3h-1zM1 4h3v1h-3zM2 2h1v1h-1z',
  chef: 'M2 0h1v1h-1zM0 1h5v1h-5zM0 2h5v3h-5z',
  painter: 'M4 0h1v1h-1zM3 1h1v1h-1zM2 2h1v1h-1zM0 3h2v2h-2z',
  hacker: 'M2 0h1v1h-1zM1 1h1v1h-1zM0 2h1v1h-1zM1 3h1v1h-1zM2 4h1v1h-1zM3 1h1v1h-1zM4 2h1v1h-1zM3 3h1v1h-1z',
  priest: 'M2 0h1v5h-1zM0 2h5v1h-5z',
  keeper: 'M0 0h3v1h-3zM0 1h1v2h-1zM2 1h1v2h-1zM0 3h3v1h-3zM3 2h2v1h-2zM4 3h1v1h-1z',
  banker: 'M2 0h1v1h-1zM0 1h5v1h-5zM0 2h1v1h-1zM4 2h1v1h-1zM0 3h2v1h-2zM3 3h2v1h-2z',
  alexandra: 'M2 0h1v1h-1zM1 1h3v1h-3zM1 2h3v2h-3zM2 4h1v1h-1z',
  architect: 'M2 0h1v1h-1zM1 1h3v1h-3zM0 2h5v1h-5zM0 4h5v1h-5z',
};

export function npcOrbIdentity(npc: string): keyof typeof SYMBOLS | 'unknown' {
  const name = npc.toLowerCase();
  return (Object.keys(SYMBOLS) as (keyof typeof SYMBOLS)[]).find(key => name.includes(key)) ?? 'unknown';
}

/** The SVG's halo centre, not its body, is anchored at the caller's position. */
export function npcBodySize(avatarSize: number) { return Math.round(avatarSize * NPC_BODY_SCALE); }
export function npcSvgWidth(bodySize: number) { return bodySize * 60 / 36; }
export default memo(function NpcOrb({ npc, name, size = 29, quest = 'none' }: { npc: string; name?: string; size?: number; quest?: NpcQuestState }) {
  const svg = useRef<SVGSVGElement>(null);
  const displayName = useNpcDisplayName(npc);
  const width = npcSvgWidth(size);
  const identity = npcOrbIdentity(npc);
  const c = (i: number) => `var(--npc-${identity}-${i})`;
  const lit = quest === 'available' || quest === 'ready';
  return <><svg ref={svg} className={`npc-orb npc-quest-${quest}`} data-npc={identity} data-quest={quest} aria-hidden="true" width={width} height={width * 80 / 60} viewBox="0 0 60 80" shapeRendering="crispEdges">
    {lit && <circle className="npc-quest-glow" cx="30" cy="44" r="25" fill="var(--npc-quest-light)" opacity=".2" />}
    <ellipse className={`npc-orb-halo${lit ? ' npc-quest-halo' : ''}`} cx="30" cy="70" rx="26" ry="7" fill={lit ? 'var(--npc-quest-light)' : c(1)} fillOpacity={lit ? '.3' : '.14'} stroke={lit ? 'var(--npc-quest-light)' : c(1)} strokeOpacity={lit ? '.95' : '.6'} strokeWidth={lit ? 2 : 1} />
    <g transform="translate(12,26)">
      <ellipse cx="18" cy="40" rx="14" ry="3" fill="var(--instrument-shadow)" opacity=".4" />
      <path d="M12,0H24V3H30V6H33V9H36V27H33V30H30V33H24V36H12V33H6V30H3V27H0V9H3V6H6V3H12Z" fill={c(0)} stroke={c(0)} strokeWidth="3" />
      <path d="M12,3H24V6H30V9H33V21H27V27H21V30H9V27H6V24H3V9H6V6H12Z" fill={c(1)} />
      <path d="M9,6H21V9H15V12H12V15H9V18H6V9H9Z" fill={c(2)} />
      <path d="M9,9H15V12H12V15H9Z" fill={c(3)} />
      <rect x="9" y="9" width="3" height="3" fill="var(--npc-specular)" />
    </g>
    {identity !== 'unknown' && <g transform="translate(22,4)"><g className="npc-orb-symbol"><path transform="scale(3)" d={SYMBOLS[identity]} fill={c(3)} /></g></g>}
    {lit && <g transform="translate(19,-24)"><g className="npc-quest-marker">
      <path d="M11 0L22 11L11 22L0 11Z" fill="var(--npc-quest-plate)" stroke="var(--npc-quest-outline)" strokeWidth="2" />
      <path d="M11 4L18 11L11 18L4 11Z" fill="var(--npc-quest-light)" />
      <path d={quest === 'ready' ? 'M8 6H14V8H16V12H12V14H10V11H13V8H10V10H8ZM10 16H12V18H10Z' : 'M10 5H12V13H10ZM10 15H12V17H10Z'} fill="var(--npc-quest-ink)" />
    </g></g>}
    {quest === 'active' && <g fill="var(--plate-label)"><rect x="22" y="-9" width="3" height="3" /><rect x="29" y="-9" width="3" height="3" /><rect x="36" y="-9" width="3" height="3" /></g>}
  </svg><OrbLabels name={name ?? displayName} size={size} kind="npc" target={() => svg.current} /></>;
});