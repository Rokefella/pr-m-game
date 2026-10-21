import { memo, useMemo } from 'react';
import VillagePatternTile from './VillagePatternTile';
import { Pylon } from './objects';
import { treeStyle, treeTint } from '@/lib/theme/villageRendering';
import { fringeUri, pathEdges, pathLamps } from '@/lib/theme/villagePaths';
import { TREE_TINTS } from '@/lib/theme/svgSources';
import { VILLAGE_GLOW, VILLAGE_STREET_STYLE, type VillageStreetStyle } from '@/lib/theme/tokens';

type Ground = { x: number; y: number; kind: 'PATH' | 'ROAD' | 'SQUARE' | 'LANDMARK' };
type Forest = { x: number; y: number; w: number; h: number };
type Props = { ground: Ground[]; forest: Forest[]; roads: ReadonlySet<string>; paths?: ReadonlySet<string>; trees: ReadonlySet<string>; squares?: ReadonlySet<string>; emblems?: { col: number; row: number }[]; streetStyle?: VillageStreetStyle };
const C = 20;
const EMPTY = new Set<string>();

const Lamp = memo(function Lamp({ x, y }: { x: number; y: number }) {
  return <div aria-hidden="true" className="village-path-lamp" style={{ left: x, top: y }}>
    <div className="village-path-lamp-glow" />
    <div className="village-path-lamp-post" />
    <div className="village-path-lamp-bulb" />
  </div>;
});

const Emblem = memo(function Emblem({ x, y }: { x: number; y: number }) {
  return <svg aria-hidden="true" width={C * 3} height={C * 3} viewBox="0 0 60 60" style={{ position: 'absolute', left: x - C, top: y - C, opacity: 0.8, zIndex: 2, pointerEvents: 'none' }}>
    <circle cx="30" cy="30" r="24" fill="none" stroke={VILLAGE_GLOW} strokeWidth="2" />
    <path d="M30 12L48 30L30 48L12 30Z" fill="none" stroke={VILLAGE_GLOW} strokeWidth="2" />
    <rect x="27" y="27" width="6" height="6" fill={VILLAGE_GLOW} />
  </svg>;
});

export default memo(function VillageTerrain({ ground, forest, roads, paths = roads, trees, squares = EMPTY, emblems = [], streetStyle = VILLAGE_STREET_STYLE }: Props) {
  const edges = useMemo(() => pathEdges(paths), [paths]);
  const lamps = useMemo(() => pathLamps(paths, streetStyle), [paths, streetStyle]);
  let railCount = 0;
  return <>
    {ground.map(g => {
      const col = g.x / C, row = g.y / C;
      const railN = g.kind === 'SQUARE' && !squares.has(`${col},${row - 1}`);
      const railW = g.kind === 'SQUARE' && !squares.has(`${col - 1},${row}`);
      const bulb = (railN || railW) && railCount++ % 2 === 1;
      return <div key={`gt-${g.x}-${g.y}`}>
        <VillagePatternTile x={g.x} y={g.y} w={C} h={C} kind={g.kind === 'ROAD' || g.kind === 'PATH' ? 'street' : 'floor'} styleKey={g.kind === 'ROAD' || g.kind === 'PATH' ? streetStyle : 'plaza'} />
        {railN && <div aria-hidden="true" style={{ position: 'absolute', left: g.x, top: g.y, width: C, height: 3, background: '#2f3560', zIndex: 2, pointerEvents: 'none' }} />}
        {railW && <div aria-hidden="true" style={{ position: 'absolute', left: g.x, top: g.y, width: 3, height: C, background: '#2f3560', zIndex: 2, pointerEvents: 'none' }} />}
        {bulb && <div aria-hidden="true" style={{ position: 'absolute', left: g.x, top: g.y, width: 4, height: 4, background: VILLAGE_GLOW, zIndex: 2, pointerEvents: 'none' }} />}
        {g.kind === 'LANDMARK' && <div style={{ position: 'absolute', left: g.x, top: g.y, zIndex: 3, pointerEvents: 'none' }}>
          <Pylon dimension="amber" size={20} />
          <div className="instrument-beacon-ring" style={{ position: 'absolute', inset: 0, border: '1px solid var(--instrument-beacon)', pointerEvents: 'none' }} />
        </div>}
      </div>;
    })}
    {edges.map(e => {
      const horizontal = e.side === 'n' || e.side === 's';
      const span = horizontal ? 40 : 4;
      return <div key={`${e.side}-${e.x}-${e.y}`} aria-hidden="true" className={`village-path-edge ${streetStyle === 'plates' ? 'village-path-edge-glow' : ''}`} style={{ left: e.x, top: e.y, width: e.w, height: e.h, backgroundImage: streetStyle === 'plates' ? undefined : fringeUri(e.side), backgroundSize: horizontal ? '40px 4px' : '4px 40px', backgroundPosition: horizontal ? `${-((e.x % span + span) % span)}px 0` : `0 ${-((e.y % 40 + 40) % 40)}px` }} />;
    })}
    {lamps.map(l => <Lamp key={`path-lamp-${l.x}-${l.y}`} x={l.x} y={l.y} />)}
    {emblems.map(e => <Emblem key={`em-${e.col}-${e.row}`} x={e.col * C} y={e.row * C} />)}
    {forest.map(f => {
      const col = Math.floor(f.x / C), row = Math.floor(f.y / C), s = C * 1.2;
      const cx = col * C + C / 2, cy = row * C + C / 2;
      return <VillagePatternTile key={`f-${f.x}-${f.y}`} x={cx - s / 2} y={cy - s / 2} w={s} h={s} kind="tree" styleKey={treeStyle(col, row, trees)} tint={TREE_TINTS[treeTint(col, row)]} />;
    })}
  </>;
});
