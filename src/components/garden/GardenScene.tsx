import { memo, useMemo } from 'react';
import { generateGarden, type GeneratedGarden } from '@/lib/garden/generateGarden';
import { seasonPalette, type GardenConfig } from '@/lib/garden/gardenConfig';
import { patternUri } from '@/lib/theme/patterns';
import { toRuns } from '@/components/theme/rooms/roomGeometry';

const CELL = 20;

/** True square spiral, one-cell gap between turns, on a 13x13 grid (cell units). */
const SPIRAL_RECTS: [number, number, number, number][] = [
  [6, 6, 3, 1], [8, 4, 1, 3], [4, 4, 5, 1], [4, 4, 1, 5], [4, 8, 7, 1],
  [10, 2, 1, 7], [2, 2, 9, 1], [2, 2, 1, 9], [2, 10, 11, 1], [12, 0, 1, 11],
];

const CSS = `
@keyframes gardenHalo { 0%,100% { opacity: .05 } 50% { opacity: .14 } }
@keyframes gardenBulb { 0%,100% { opacity: .1 } 50% { opacity: .3 } }
.garden-halo { animation: gardenHalo 3s ease-in-out infinite; }
.garden-bulb-halo { animation: gardenBulb 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .garden-halo, .garden-bulb-halo { animation: none; } }
`;

const GardenLamp = memo(function GardenLamp({ glow }: { glow: string }) {
  return (
    <svg width="20" height="36" viewBox="0 0 20 36" style={{ display: 'block' }}>
      <circle cx="10" cy="10" r="12" fill={glow} opacity=".2" />
      <rect x="8" y="14" width="4" height="22" fill="#2f3560" />
      <circle cx="10" cy="10" r="4" fill="#fff0c0" />
    </svg>
  );
});

/** Procedural seasonal garden: CSS-background layers only, no per-cell svg. */
const GardenScene = memo(function GardenScene({ config }: { config: GardenConfig }) {
  const garden: GeneratedGarden = useMemo(() => generateGarden(config), [config]);
  const season = seasonPalette(config);
  const N = garden.size;
  const world = N * CELL;

  const floorUri = useMemo(
    () => patternUri('floor', 'garden', season.glow, undefined, { GA: season.ground, GB: season.alt, GS: season.specks, GL: season.leaf, GV: season.veins }),
    [season],
  );
  const plazaUri = useMemo(() => patternUri('floor', 'plaza', season.glow), [season]);

  // One cached URI per flower colour and per tree tint.
  const flowerUris = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of garden.flowers) if (!m.has(f.color)) m.set(f.color, patternUri('flower', 'bloom', season.glow, undefined, { F: f.color }));
    return m;
  }, [garden, season]);
  const treeUris = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of garden.trees) if (!m.has(t.tint)) m.set(t.tint, patternUri('tree', 'garden', season.glow, t.tint));
    return m;
  }, [garden, season]);
  const hedgeUris = useMemo(
    () => season.trees.map((t) => patternUri('tree', 'hedge', season.glow, t)),
    [season],
  );

  // Hedge merged into one div per row run.
  const hedgeRuns = useMemo(() => toRuns(garden.ring.map((h) => `${h.col},${h.row}`)), [garden]);

  const circle = garden.circle;
  const circlePx = { x: circle.cx * CELL + CELL / 2, y: circle.cy * CELL + CELL / 2 };
  const circleSize = (circle.r + 3) * 2 * CELL;

  // Path rows merged into runs for fewer divs.
  const pathRuns = useMemo(() => toRuns(garden.path.map((p) => `${p.col},${p.row}`)), [garden]);

  const sortedTrees = useMemo(() => [...garden.trees].sort((a, b) => a.row - b.row), [garden]);

  return (
    <>
      <style>{CSS}</style>
      {/* Floor: one repeating layer */}
      <div aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, width: world, height: world, backgroundImage: floorUri, backgroundSize: '40px', backgroundRepeat: 'repeat', imageRendering: 'pixelated', pointerEvents: 'none', zIndex: 0 }} />
      {/* Path plates */}
      {pathRuns.map((r) => (
        <div key={`path-${r.row}-${r.col}`} aria-hidden="true" style={{ position: 'absolute', left: r.col * CELL, top: r.row * CELL, width: r.n * CELL, height: CELL, backgroundImage: plazaUri, backgroundSize: '40px', backgroundRepeat: 'repeat', imageRendering: 'pixelated', pointerEvents: 'none', zIndex: 0 }} />
      ))}
      {/* Communion circle */}
      <svg aria-hidden="true" width={circleSize} height={circleSize} style={{ position: 'absolute', left: circlePx.x - circleSize / 2, top: circlePx.y - circleSize / 2, pointerEvents: 'none', zIndex: 1 }}>
        <circle cx={circleSize / 2} cy={circleSize / 2} r={(circle.r + 2) * CELL} fill={season.glow} opacity=".08" className="garden-halo" />
        <circle cx={circleSize / 2} cy={circleSize / 2} r={circle.r * CELL} fill="rgba(0,0,0,.25)" stroke={season.glow} strokeOpacity=".55" strokeWidth="2" />
        <circle cx={circleSize / 2} cy={circleSize / 2} r={(circle.r - 2) * CELL} fill="rgba(0,0,0,.3)" />
        <g transform={`translate(${circleSize / 2} ${circleSize / 2}) translate(-187 -176) scale(22)`} fill={season.glow}>
          <path d={SPIRAL_PATH} />
          <rect x="8" y="8" width="1" height="1" fill="#fff3c4" />
        </g>
      </svg>
      {/* Flowers */}
      {garden.flowers.map((f) => (
        <div key={`flower-${f.col}-${f.row}`} aria-hidden="true" style={{ position: 'absolute', left: f.col * CELL + 4, top: f.row * CELL + 4, width: 12, height: 12, backgroundImage: flowerUris.get(f.color), backgroundSize: '12px 12px', backgroundRepeat: 'no-repeat', imageRendering: 'pixelated', pointerEvents: 'none', zIndex: 1 }} />
      ))}
      {/* Hedge ring */}
      {hedgeRuns.map((r) => (
        <div key={`hedge-${r.row}-${r.col}`} aria-hidden="true" style={{ position: 'absolute', left: r.col * CELL, top: r.row * CELL, width: r.n * CELL, height: CELL, backgroundImage: hedgeUris[Math.floor(r.col / 4) % hedgeUris.length], backgroundSize: '20px', backgroundRepeat: 'repeat', imageRendering: 'pixelated', pointerEvents: 'none', zIndex: 2 }} />
      ))}
      {/* Interior trees, lower rows drawn last so they overlap higher ones */}
      {sortedTrees.map((t) => (
        <div key={`tree-${t.col}-${t.row}`} aria-hidden="true" style={{ position: 'absolute', left: t.col * CELL - 10, top: t.row * CELL - 20, width: 40, height: 40, backgroundImage: treeUris.get(t.tint), backgroundSize: '40px 40px', backgroundRepeat: 'no-repeat', imageRendering: 'pixelated', pointerEvents: 'none', zIndex: 2 }} />
      ))}
      {/* Lamps */}
      {garden.lamps.map((l) => (
        <div key={`lamp-${l.col}-${l.row}`} aria-hidden="true" style={{ position: 'absolute', left: l.col * CELL, top: l.row * CELL - 16, width: 20, height: 36, pointerEvents: 'none', zIndex: 2 }}>
          <GardenLamp glow={season.glow} />
        </div>
      ))}
      {/* String lights above the avatar */}
      <svg aria-hidden="true" width={world} height={world} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 6 }}>
        {garden.strings.map((s, si) => {
          const x1 = s.c1 * CELL + 10;
          const x2 = s.c2 * CELL + 10;
          const y = s.row * CELL;
          return <path key={`string-${si}`} d={`M${x1} ${y} Q${(x1 + x2) / 2} ${y + s.sag * 40} ${x2} ${y}`} stroke="#2a2038" strokeWidth="1.5" fill="none" />;
        })}
        {garden.bulbs.flatMap((bs, si) =>
          bs.map((b, bi) => (
            <g key={`bulb-${si}-${bi}`}>
              <circle cx={b.x} cy={b.y} r="9" fill={b.color} opacity=".18" className="garden-bulb-halo" style={{ animationDelay: `${-((si * 7 + bi) % 24) / 10}s` }} />
              <circle cx={b.x} cy={b.y} r="3" fill={b.color} />
            </g>
          )),
        )}
      </svg>
    </>
  );
});

export default GardenScene;
