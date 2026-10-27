import { memo } from 'react';

export type SigilId = 'fire' | 'gods' | 'atoms' | 'stars' | 'quantum' | 'swerve' | 'praem';
type R = [number, number, number, number];
type Group = { color: string; opacity?: number; rects: R[] };

const cells = (pts: [number, number][]): R[] => pts.map(([x, y]) => [x, y, 1, 1]);

const GLYPHS: Record<SigilId, Group[]> = {
  fire: [
    { color: '#e0993a', rects: [[7,0,2,1],[7,1,2,1],[6,2,4,1],[6,3,4,1],[5,4,6,1],[4,5,8,1],[4,6,8,1],[3,7,10,1],[3,8,10,1],[3,9,10,1],[3,10,10,1],[4,11,8,1],[5,12,6,1],[6,13,4,1]] },
    { color: '#ffe27a', rects: [[7,6,2,1],[6,7,4,1],[6,8,4,1],[6,9,4,1],[6,10,4,1],[7,11,2,1]] },
  ],
  gods: [
    { color: '#f5c060', rects: [[6,5,4,1],[5,6,6,1],[5,7,6,1],[5,8,6,1],[5,9,6,1],[6,10,4,1],[7,0,2,3],[7,13,2,3],[0,7,3,2],[13,7,3,2],[2,2,1,1],[3,3,1,1],[12,2,1,1],[11,3,1,1],[2,13,1,1],[3,12,1,1],[12,13,1,1],[11,12,1,1]] },
    { color: '#1c2038', rects: [[7,7,2,2]] },
  ],
  atoms: [
    { color: '#62e6f0', rects: cells([[7,1],[8,1],[6,2],[9,2],[5,3],[10,3],[4,4],[11,4],[3,5],[12,5],[2,6],[13,6],[1,7],[14,7],[1,8],[14,8],[2,9],[13,9],[3,10],[12,10],[4,11],[11,11],[5,12],[10,12],[6,13],[9,13],[7,14],[8,14]]) },
    { color: '#d9fbff', rects: [[7,7,2,2]] },
    { color: '#ffffff', rects: [[7,0,2,2],[13,7,2,2],[3,10,2,2]] },
  ],
  stars: [
    { color: '#e8e4ff', rects: [[5,3,1,5],[3,5,5,1]] },
    { color: '#ffffff', rects: [[5,5,1,1]] },
    { color: '#b79bff', rects: [[11,3,1,3],[10,4,3,1],[9,10,1,3],[8,11,3,1]] },
    { color: '#e8e4ff', rects: [[2,12,1,1],[13,11,1,1],[14,1,1,1]] },
  ],
  quantum: [
    { color: '#b79bff', rects: [7,5,4,4,5,7,9,10,10,9,7,5,4,4,5,7].map((y, x) => [x, y, 1, 2] as R) },
    { color: '#7a6ee8', opacity: 0.6, rects: cells([[3,2],[8,1],[12,2],[2,12],[7,13],[13,12],[10,14],[5,0]]) },
  ],
  swerve: [
    { color: '#8e99d0', rects: [2, 5, 8].flatMap(x => [1,3,5,7,9,11,13].map(y => [x, y, 1, 1] as R)) },
    { color: '#f5c060', rects: cells([[11,1],[11,3],[11,5],[12,6],[13,7],[13,9],[13,11],[13,13]]) },
  ],
  praem: [
    { color: '#f5c060', rects: [[0,0,16,1],[0,0,1,15],[0,14,13,1],[12,4,1,11],[4,4,9,1],[4,4,1,7],[4,10,5,1],[8,8,1,3],[6,8,3,1],[6,6,1,3],[6,6,5,1],[10,6,1,7],[2,12,9,1],[2,2,1,11],[2,2,13,1],[14,2,1,14],[14,15,2,1]] },
    { color: '#fff3c4', rects: [[6,8,1,1]] },
  ],
};

const CSS = `@keyframes sigilIn { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: translateY(0); } }
.sigil-rect { animation: sigilIn 600ms steps(4, end) both; }
@media (prefers-reduced-motion: reduce) { .sigil-rect { animation: none !important; } }`;

export default memo(function PixelSigil({ id, size = 128 }: { id: SigilId; size?: number }) {
  let i = 0;
  return <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
    <style>{CSS}</style>
    {GLYPHS[id].flatMap(g => g.rects.map(([x, y, w, h]) => {
      const n = i++;
      return <rect key={n} className="sigil-rect" x={x} y={y} width={w} height={h} fill={g.color} opacity={g.opacity} style={{ animationDelay: `${n * 25}ms` }} />;
    }))}
  </svg>;
});
