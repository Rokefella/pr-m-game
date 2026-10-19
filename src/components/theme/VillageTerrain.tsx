import { memo } from 'react';
import VillagePatternTile from './VillagePatternTile';
import { Pylon } from './objects';
import { lampSide, streetStyle, treeStyle, treeTint } from '@/lib/theme/villageRendering';
import { TREE_TINTS } from '@/lib/theme/svgSources';
import { VILLAGE_GLOW } from '@/lib/theme/tokens';

type Ground = { x: number; y: number; kind: 'PATH' | 'ROAD' | 'SQUARE' | 'LANDMARK' };
type Forest = { x: number; y: number; w: number; h: number };
type Props = { ground: Ground[]; forest: Forest[]; roads: ReadonlySet<string>; trees: ReadonlySet<string>; squares?: ReadonlySet<string>; emblems?: { col: number; row: number }[] };
const C = 20;
const EMPTY = new Set<string>();

const Lamp = memo(function Lamp({ x, y }: { x: number; y: number }) {
  return <div aria-hidden="true" style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, zIndex: 3, pointerEvents: 'none' }}>
    <div style={{ position: 'absolute', left: -9, top: -23, width: 18, height: 18, borderRadius: '50%', background: VILLAGE_GLOW, opacity: 0.22 }} />
    <div style={{ position: 'absolute', left: -2, top: -14, width: 4, height: 14, background: '#2f3560' }} />
    <div style={{ position: 'absolute', left: -3, top: -17, width: 6, height: 6, borderRadius: '50%', background: '#fff3c4' }} />
  </div>;
});

const Emblem = memo(function Emblem({ x, y }: { x: number; y: number }) {
  return <svg aria-hidden="true" width={C * 3} height={C * 3} viewBox="0 0 60 60" style={{ position: 'absolute', left: x - C, top: y - C, opacity: 0.8, zIndex: 2, pointerEvents: 'none' }}>
    <circle cx="30" cy="30" r="24" fill="none" stroke={VILLAGE_GLOW} strokeWidth="2" />
    <path d="M30 12L48 30L30 48L12 30Z" fill="none" stroke={VILLAGE_GLOW} strokeWidth="2" />
    <rect x="27" y="27" width="6" height="6" fill={VILLAGE_GLOW} />
  </svg>;
});

export default memo(function VillageTerrain({ ground, forest, roads, trees, squares = EMPTY, emblems = [] }: Props) {
  let railCount = 0;
  return <>
    {ground.map(g => {
      const col = g.x / C, row = g.y / C;
      const lamp = g.kind === 'ROAD' ? lampSide(col, row, roads) : null;
      const railN = g.kind === 'SQUARE' && !squares.has(`${col},${row - 1}`);
      const railW = g.kind === 'SQUARE' && !squares.has(`${col - 1},${row}`);
      const bulb = (railN || railW) && railCount++ % 2 === 1;
      return <div key={`gt-${g.x}-${g.y}`}>
        <VillagePatternTile x={g.x} y={g.y} w={C} h={C} kind={g.kind === 'ROAD' || g.kind === 'PATH' ? 'street' : 'floor'} styleKey={g.kind === 'ROAD' ? streetStyle(col, row, roads) : g.kind === 'PATH' ? 'h' : 'plaza'} />
        {railN && <div aria-hidden="true" style={{ position: 'absolute', left: g.x, top: g.y, width: C, height: 3, background: '#2f3560', zIndex: 2, pointerEvents: 'none' }} />}
        {railW && <div aria-hidden="true" style={{ position: 'absolute', left: g.x, top: g.y, width: 3, height: C, background: '#2f3560', zIndex: 2, pointerEvents: 'none' }} />}
        {bulb && <div aria-hidden="true" style={{ position: 'absolute', left: g.x, top: g.y, width: 4, height: 4, background: VILLAGE_GLOW, zIndex: 2, pointerEvents: 'none' }} />}
        {lamp === 'n' && <Lamp x={g.x + C / 2} y={g.y + 4} />}
        {lamp === 'w' && <Lamp x={g.x + 3} y={g.y + C / 2} />}
        {g.kind === 'LANDMARK' && <div style={{ position: 'absolute', left: g.x, top: g.y, zIndex: 3, pointerEvents: 'none' }}>
          <Pylon dimension="amber" size={20} />
          <div className="instrument-beacon-ring" style={{ position: 'absolute', inset: 0, border: '1px solid var(--instrument-beacon)', pointerEvents: 'none' }} />
        </div>}
      </div>;
    })}
    {emblems.map(e => <Emblem key={`em-${e.col}-${e.row}`} x={e.col * C} y={e.row * C} />)}
    {forest.map(f => {
      const col = Math.floor(f.x / C), row = Math.floor(f.y / C), s = C * 1.2;
      const cx = col * C + C / 2, cy = row * C + C / 2;
      return <VillagePatternTile key={`f-${f.x}-${f.y}`} x={cx - s / 2} y={cy - s / 2} w={s} h={s} kind="tree" styleKey={treeStyle(col, row, trees)} tint={TREE_TINTS[treeTint(col, row)]} />;
    })}
  </>;
});
