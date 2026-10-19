import { memo } from 'react';
import VillagePatternTile from './VillagePatternTile';
import { Pylon } from './objects';
import { streetStyle, treeStyle } from '@/lib/theme/villageRendering';

type Ground = { x: number; y: number; kind: 'PATH' | 'ROAD' | 'SQUARE' | 'LANDMARK' };
type Forest = { x: number; y: number; w: number; h: number };
type Props = { ground: Ground[]; forest: Forest[]; roads: ReadonlySet<string>; trees: ReadonlySet<string> };

export default memo(function VillageTerrain({ ground, forest, roads, trees }: Props) {
  return <>
    {ground.map(g => <div key={`gt-${g.x}-${g.y}`}>
      <VillagePatternTile x={g.x} y={g.y} w={20} h={20} kind={g.kind === 'ROAD' || g.kind === 'PATH' ? 'street' : 'floor'} styleKey={g.kind === 'ROAD' ? streetStyle(g.x / 20, g.y / 20, roads) : g.kind === 'PATH' ? 'h' : 'plaza'} />
      {g.kind === 'LANDMARK' && <div style={{ position: 'absolute', left: g.x, top: g.y, zIndex: 3, pointerEvents: 'none' }}>
        <Pylon dimension="amber" size={20} />
        <div className="instrument-beacon-ring" style={{ position: 'absolute', inset: 0, border: '1px solid var(--instrument-beacon)', pointerEvents: 'none' }} />
      </div>}
    </div>)}
    {forest.map(f => <VillagePatternTile key={`f-${f.x}-${f.y}`} x={f.x} y={f.y} w={f.w} h={f.h} kind="tree" styleKey={treeStyle(Math.floor(f.x / 20), Math.floor(f.y / 20), trees)} />)}
  </>;
});