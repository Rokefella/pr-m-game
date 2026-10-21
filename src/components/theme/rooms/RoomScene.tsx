import { forwardRef, memo } from 'react';
import { patternUri } from '@/lib/theme/patterns';
import { DIMENSION_GLOW } from '@/lib/theme/tokens';
import PlayerAvatar, { type OrbLook } from '@/components/PlayerAvatar';
import OrbLabels from '@/components/OrbLabels';
import { ConsoleDesk, ConsoleTile, DataShelf, FloorLamp, RoomExit, type ExitDir } from '../objects';
import { ROOM_AVATAR_SIZE, ROOM_CELL as CELL, ROOM_WALL_STYLE } from './roomConfig';
import type { Run } from './roomGeometry';

const GLOW = DIMENSION_GLOW.teal;
type Pos = { x: number; y: number };
export type RugTrim = { top: boolean; bottom: boolean; left: boolean; right: boolean };

const CSS = `
@keyframes roomExitPulse { 0%,100% { opacity: .35 } 50% { opacity: 1 } }
@keyframes roomLampGlow { 0%,100% { opacity: .16 } 50% { opacity: .3 } }
.room-exit-arrow { animation: roomExitPulse 1.6s ease-in-out infinite; }
.room-exit-arrow-2 { animation-delay: -.8s; }
.room-lamp-glow { animation: roomLampGlow 3.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .room-exit-arrow, .room-lamp-glow { animation: none; } }
`;

export const RugTile = memo(function RugTile({ trim, size }: { trim: RugTrim; size: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 48 48" shapeRendering="crispEdges" style={{ display: 'block', imageRendering: 'pixelated' }}>
    <rect width="48" height="48" fill="#4a2a78" />
    <path d="M24 10L38 24L24 38L10 24Z" fill="none" stroke="#f5c060" strokeWidth="1.5" opacity=".45" />
    {trim.top && <><path d="M0 1H48" stroke="#b79bff" strokeWidth="2" /><path d="M0 5H48" stroke="#7a4fb8" /></>}
    {trim.bottom && <><path d="M0 47H48" stroke="#b79bff" strokeWidth="2" /><path d="M0 43H48" stroke="#7a4fb8" /></>}
    {trim.left && <><path d="M1 0V48" stroke="#b79bff" strokeWidth="2" /><path d="M5 0V48" stroke="#7a4fb8" /></>}
    {trim.right && <><path d="M47 0V48" stroke="#b79bff" strokeWidth="2" /><path d="M43 0V48" stroke="#7a4fb8" /></>}
  </svg>;
});

const Runs = memo(function Runs({ runs, uri, z }: { runs: Run[]; uri: string; z: number }) {
  return <>{runs.map(r => <div key={`${r.row}-${r.col}`} aria-hidden="true" style={{ position: 'absolute', left: r.col * CELL, top: r.row * CELL, width: r.n * CELL, height: CELL, backgroundImage: uri, backgroundSize: `${CELL}px ${CELL}px`, imageRendering: 'pixelated', pointerEvents: 'none', zIndex: z }} />)}</>;
});
export const FloorRuns = memo(function FloorRuns({ runs }: { runs: Run[] }) { return <Runs runs={runs} uri={patternUri('floor', 'deck', GLOW)} z={0} />; });
export const WallRuns = memo(function WallRuns({ runs }: { runs: Run[] }) { return <Runs runs={runs} uri={patternUri('wall', ROOM_WALL_STYLE, GLOW)} z={3} />; });

const at = (p: Pos, z: number) => ({ position: 'absolute' as const, left: p.x, top: p.y, width: CELL, height: CELL, pointerEvents: 'none' as const, zIndex: z });

type SceneProps = {
  floorRuns: Run[]; wallRuns: Run[];
  furniture: Pos[]; bookcases: Pos[]; lights: (Pos & { color?: string | null })[];
  rugs: (Pos & { trim: RugTrim })[]; exits: (Pos & { dir: ExitDir })[];
  consoleCell?: Pos | null;
};

/** Shared Instrument interior: merged floor/wall runs plus one inline svg per object cell. */
export const RoomScene = memo(function RoomScene({ floorRuns, wallRuns, furniture, bookcases, lights, rugs, exits, consoleCell }: SceneProps) {
  return <>
    <style>{CSS}</style>
    <FloorRuns runs={floorRuns} />
    {rugs.map(r => <div key={`rug-${r.x}-${r.y}`} style={at(r, 1)}><RugTile trim={r.trim} size={CELL} /></div>)}
    {exits.map(e => <div key={`exit-${e.x}-${e.y}`} style={at(e, 2)}><RoomExit size={CELL} dir={e.dir} /></div>)}
    <WallRuns runs={wallRuns} />
    {consoleCell && <div data-object="CONSOLE" style={at(consoleCell, 3)}><ConsoleTile size={CELL} /></div>}
    {furniture.map(f => <div key={`furn-${f.x}-${f.y}`} style={at(f, 3)}><ConsoleDesk size={CELL} /></div>)}
    {bookcases.map(b => <div key={`book-${b.x}-${b.y}`} style={at(b, 3)}><DataShelf size={CELL} seed={Math.round(b.x / CELL) * 3 + Math.round(b.y / CELL)} /></div>)}
    {lights.map(l => <div key={`light-${l.x}-${l.y}`} style={at(l, 3)}><FloorLamp size={CELL} color={l.color ?? undefined} /></div>)}
  </>;
});

/** Avatar positioned by the caller writing style.transform each frame. */
export const RoomAvatar = memo(forwardRef<HTMLDivElement, { palette: OrbLook; walking: boolean; title?: string | null; name?: string | null }>(function RoomAvatar({ palette, walking, title, name }, ref) {
  return <div ref={ref} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 5, willChange: 'transform' }}>
    <PlayerAvatar palette={palette} walking={walking} size={ROOM_AVATAR_SIZE} />
    <OrbLabels title={title} name={name} size={ROOM_AVATAR_SIZE} />
  </div>;
}));

export const avatarTransform = (p: Pos) => `translate(${p.x - ROOM_AVATAR_SIZE / 2}px, ${p.y - ROOM_AVATAR_SIZE / 2}px)`;
