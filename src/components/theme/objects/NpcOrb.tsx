import { memo, useRef } from 'react';
import type { NpcQuestState } from '@/lib/npcQuestState';
import { AVATAR_BODY_RATIO, NPC_BODY_SCALE } from '@/lib/orbSizes';
import OrbLabels from '@/components/OrbLabels';
import { useNpcDisplayName } from '@/hooks/useNpcQuestStates';
import { npcColors, npcSkin, useSkins, type Facing, type WalkPhase } from '@/lib/skins';
import { NpcSkinSprite } from '@/components/SkinSprite';
import { usePathsSnapshot } from '@/hooks/usePaths';
import { npcArrow, type NpcArrow } from '@/lib/paths';

const ARROW = 'M3 0H7V4H10V5H9V6H8V7H7V8H6V9H4V8H3V7H2V6H1V5H0V4H3Z';
/** One downward pixel arrow: solid+bob (available), outline (active), solid+pulse (ready). */
function PathArrow({ arrow }: { arrow: NonNullable<NpcArrow> }) {
  const hollow = arrow.state === 'active';
  return <g className={`npc-path-arrow path-${arrow.colour} npc-path-${arrow.state}`} data-arrow={arrow.state}>
    <path d={ARROW} fill={hollow ? 'none' : 'currentColor'} stroke={hollow ? 'currentColor' : 'none'} strokeWidth={hollow ? 1 : 0} strokeLinejoin="miter" />
  </g>;
}

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
  if (name === 'sam') return 'bernard';
  return (Object.keys(SYMBOLS) as (keyof typeof SYMBOLS)[]).find(key => name.includes(key)) ?? 'unknown';
}

/** The SVG's halo centre, not its body, is anchored at the caller's position. */
export function npcBodySize(avatarSize: number) { return Math.round(avatarSize * AVATAR_BODY_RATIO * NPC_BODY_SCALE); }
export function npcSvgWidth(bodySize: number) { return bodySize * 60 / 36; }
export default memo(function NpcOrb({ npc, name, size = 29, quest = 'none', facing = 'down', phase = 'stand' }: { npc: string; name?: string; size?: number; quest?: NpcQuestState; facing?: Facing; phase?: WalkPhase }) {
  const svg = useRef<SVGSVGElement>(null);
  const box = useRef<HTMLSpanElement>(null);
  const displayName = useNpcDisplayName(npc);
  useSkins(); // ensure the catalogue is loaded; npcSkin reads the shared cache
  const width = npcSvgWidth(size);
  const identity = npcOrbIdentity(npc);
  const c = (i: number) => `var(--npc-${identity}-${i})`;
  const lit = quest === 'available' || quest === 'ready';
  const skin = npcSkin(npc) ?? npcSkin(identity);
  const arrow = npcArrow(quest, npc || identity, usePathsSnapshot());
  if (skin) {
    const height = Math.round(size * 14 / 16);
    return <span ref={box} className={`npc-orb npc-quest-${quest}`} data-npc={identity} data-quest={quest} aria-hidden="true" style={{ position: 'relative', display: 'inline-block', width: size, height }}>
      <svg width={size} height={Math.max(6, Math.round(size * 0.3))} style={{ position: 'absolute', left: 0, bottom: -2, overflow: 'visible' }} shapeRendering="crispEdges">
        <ellipse className={`npc-orb-halo${lit ? ' npc-quest-halo' : ''}`} cx={size / 2} cy={3} rx={size * 0.52} ry={Math.max(2, size * 0.14)} fill={lit ? 'var(--npc-quest-light)' : c(1)} fillOpacity={lit ? '.3' : '.14'} stroke={lit ? 'var(--npc-quest-light)' : c(1)} strokeOpacity={lit ? '.95' : '.6'} strokeWidth={lit ? 2 : 1} />
      </svg>
      <NpcSkinSprite skin={skin} facing={facing} phase={phase} size={size} colors={npcColors(skin)} />
      {arrow && <svg width="20" height="18" viewBox="0 0 10 9" style={{ position: 'absolute', left: size / 2 - 10, top: -Math.round(size * 0.55), overflow: 'visible' }} shapeRendering="crispEdges"><PathArrow arrow={arrow} /></svg>}
      <OrbLabels name={name ?? displayName} size={size} kind="npc" target={() => box.current} />
    </span>;
  }
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
    {arrow && <g transform="translate(20,-20) scale(2)"><PathArrow arrow={arrow} /></g>}
  </svg><OrbLabels name={name ?? displayName} size={size} kind="npc" target={() => svg.current} /></>;
});