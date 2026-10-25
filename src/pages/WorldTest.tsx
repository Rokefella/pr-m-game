import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Navigation, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PlayerAvatar, { orbLook } from '@/components/PlayerAvatar';
import Thumbstick from '@/components/Thumbstick';
import LoadingScreen from '@/components/LoadingScreen';
import { useReducedMotion } from '@/components/theme/useReducedMotion';
import { loadLevelFromSupabase, type LoadedLevelConfig } from '@/lib/levelLoader';
import { clampWorld, devWorldAllowed, eraAt, fetchWorldChunk, readWorldData, tileCost, worldArea, worldPhase, WORLD_MOVE_MS, WORLD_TILE, WorldChunkCache, type Place, type WorldPoint } from '@/lib/worldTest';
import { drawWorld, type WorldInk } from '@/lib/worldTestRender';
import './world-test.css';

type WorldData = Awaited<ReturnType<typeof readWorldData>>;
type Identity = { registration_number: number; aura_color: string | null; orb_dye?: string | null };
export default function WorldTest() {
  const { user, loading } = useAuth();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [checkedUser, setCheckedUser] = useState<string | null>(null);
  const [accessError, setAccessError] = useState(false);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setAccessError(false);
    void (async () => {
      try {
        const { data, error } = await supabase.from('users').select('registration_number, aura_color, orb_dye').eq('id', user.id).maybeSingle();
        if (cancelled) return;
        setIdentity(!error && data ? data as Identity : null); setCheckedUser(user.id); setAccessError(Boolean(error));
      } catch { if (!cancelled) { setAccessError(true); setCheckedUser(user.id); } }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);
  if (loading || (user && checkedUser !== user.id)) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (accessError || !identity || !devWorldAllowed(identity.registration_number)) return <Navigate to="/village" replace />;
  return <WorldSandbox identity={identity} />;
}

export function WorldSandbox({ identity }: { identity: Identity }) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [data, setData] = useState<WorldData | null>(null);
  const dataRef = useRef<WorldData | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [pos, setPos] = useState<WorldPoint>({ x: 25, y: 25 });
  const posRef = useRef(pos);
  const display = useRef(pos);
  const [spent, setSpent] = useState(0);
  const spentRef = useRef(0);
  const [clock, setClock] = useState(Date.now());
  const cache = useRef(new WorldChunkCache(fetchWorldChunk));
  const canvas = useRef<HTMLCanvasElement>(null);
  const avatar = useRef<HTMLDivElement>(null);
  const camera = useRef({ x: 0, y: 0 });
  const keys = useRef(new Set<string>());
  const lastMove = useRef(0);
  const bumpUntil = useRef(0);
  const [walking, setWalking] = useState(false);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpX, setJumpX] = useState('25');
  const [jumpY, setJumpY] = useState('25');
  const [placeCard, setPlaceCard] = useState<Place | null>(null);
  const blocked = useRef(false);
  blocked.current = jumpOpen || Boolean(placeCard);
  const [maze, setMaze] = useState<LoadedLevelConfig | null>(null);
  const mazeRef = useRef(maze);
  mazeRef.current = maze;
  const [mazeLevel, setMazeLevel] = useState<number | null>(null);
  const [entering, setEntering] = useState(false);
  const [entryMessage, setEntryMessage] = useState('');
  const worldReturn = useRef<WorldPoint>({ x: 25, y: 25 });
  const [, setChunkTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setError('');
    void readWorldData().then(world => {
      if (cancelled) return;
      dataRef.current = world; setData(world);
      const start = world.places.find(place => place.kind === 'start') ?? { x: 25, y: 25 };
      const point = { x: clampWorld(start.x), y: clampWorld(start.y) };
      posRef.current = point; display.current = point; setPos(point); cache.current.maintain(point);
    }).catch(() => { if (!cancelled) setError('The world could not be loaded.'); });
    return () => { cancelled = true; };
  }, [retry]);
  useEffect(() => {
    const timer = setInterval(() => { setClock(Date.now()); setChunkTick(t => t + 1); }, 1000);
    return () => clearInterval(timer);
  }, []);
  const teleport = useCallback((point: WorldPoint) => {
    const next = { x: clampWorld(point.x), y: clampWorld(point.y) };
    posRef.current = next; display.current = next; setPos(next); cache.current.maintain(next);
    setJumpOpen(false); setPlaceCard(null); keys.current.clear();
  }, []);
  const move = useCallback((dx: number, dy: number) => {
    if (blocked.current || !dataRef.current || performance.now() - lastMove.current < WORLD_MOVE_MS) return;
    if (dx === 0 && dy === 0) return;
    const from = posRef.current, stepX = Math.sign(dx), stepY = Math.sign(dy);
    const next = { x: from.x + stepX, y: from.y + stepY };
    const activeMaze = mazeRef.current;
    const world = dataRef.current;
    const walkable = (point: WorldPoint) => {
      if (activeMaze) return activeMaze.openSet.has(`${point.x},${point.y}`);
      const terrainKey = cache.current.terrainKey(point.x, point.y);
      const terrain = world.terrain.find(t => t.key === terrainKey);
      if (!terrainKey) void cache.current.load(point.x, point.y);
      return terrain?.walkable === true && terrain.enabled !== false;
    };
    lastMove.current = performance.now();
    if (next.x < 0 || next.y < 0 || next.x > 999 || next.y > 999 || !walkable(next) || (stepX && stepY && !walkable({ x: next.x, y: from.y }) && !walkable({ x: from.x, y: next.y }))) { bumpUntil.current = performance.now() + 150; return; }
    posRef.current = next; setPos(next); setWalking(true);
    if (!activeMaze) {
      const terrain = world.terrain.find(t => t.key === cache.current.terrainKey(next.x, next.y));
      if (terrain) { spentRef.current += tileCost(terrain, eraAt(next, world.eras)); setSpent(spentRef.current); }
      cache.current.maintain(next);
      const place = world.places.find(p => p.x === next.x && p.y === next.y);
      if (place) { setEntryMessage(''); setPlaceCard(place); }
    } else { spentRef.current += 1; setSpent(spentRef.current); }
  }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.target instanceof HTMLInputElement || blocked.current) return; if (/^(Arrow|[wasd]$)/i.test(e.key)) { e.preventDefault(); keys.current.add(e.key.toLowerCase()); } };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const clear = () => keys.current.clear();
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); };
  }, []);
  useEffect(() => {
    if (!data) return;
    const el = canvas.current, ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const styles = getComputedStyle(document.documentElement);
    const token = (name: string) => styles.getPropertyValue(name).trim();
    const ink: WorldInk = { background: token('--auth-backdrop'), grid: token('--plate-edge'), text: token('--auth-text'), muted: token('--plate-label'), gold: token('--instrument-beacon'), cyan: token('--console-teal'), shadow: token('--instrument-shadow'), dusk: token('--world-dusk'), night: token('--world-night'), dawn: token('--world-dawn') };
    const types = new Map(data.terrain.map(t => [t.key, t]));
    let width = innerWidth, height = innerHeight, frame = 0;
    const resize = () => { width = innerWidth; height = innerHeight; const dpr = Math.min(devicePixelRatio || 1, 2); el.width = Math.round(width * dpr); el.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); window.addEventListener('resize', resize);
    const tick = (time: number) => {
      const k = keys.current;
      move((k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0), (k.has('arrowdown') || k.has('s') ? 1 : 0) - (k.has('arrowup') || k.has('w') ? 1 : 0));
      const point = posRef.current;
      display.current = { x: display.current.x + (point.x - display.current.x) * .2, y: display.current.y + (point.y - display.current.y) * .2 };
      camera.current = { x: (display.current.x + .5) * WORLD_TILE - width / 2, y: (display.current.y + .5) * WORLD_TILE - height / 2 };
      const activeMaze = mazeRef.current;
      if (!activeMaze) drawWorld(ctx, cache.current, types, data.eras, data.places, camera.current, width, height, time, ink, reduced);
      else {
        ctx.fillStyle = ink.background; ctx.fillRect(0, 0, width, height);
        const x0 = Math.max(0, Math.floor(camera.current.x / WORLD_TILE)), y0 = Math.max(0, Math.floor(camera.current.y / WORLD_TILE));
        for (let y = y0; y <= Math.min(activeMaze.rows - 1, y0 + Math.ceil(height / WORLD_TILE) + 1); y++) for (let x = x0; x <= Math.min(activeMaze.cols - 1, x0 + Math.ceil(width / WORLD_TILE) + 1); x++) {
          const px = x * WORLD_TILE - camera.current.x, py = y * WORLD_TILE - camera.current.y;
          ctx.fillStyle = activeMaze.openSet.has(`${x},${y}`) ? ink.background : ink.grid; ctx.fillRect(px, py, WORLD_TILE - 1, WORLD_TILE - 1);
          if (activeMaze.fragments.some(f => f.col === x && f.row === y) || (activeMaze.door.col === x && activeMaze.door.row === y)) { ctx.strokeStyle = ink.gold; ctx.strokeRect(px + 12, py + 12, 16, 16); }
        }
      }
      const era = eraAt(point, data.eras), terrain = types.get(cache.current.terrainKey(point.x, point.y) ?? '');
      const phase = worldPhase(Date.now(), data.cycle);
      const tint = phase.phase === 'dusk' ? ink.dusk : phase.phase === 'night' ? ink.night : phase.phase === 'dawn' ? ink.dawn : null;
      if (tint) { ctx.globalAlpha = phase.phase === 'dawn' ? 1 - phase.progress : 1; ctx.fillStyle = tint; ctx.fillRect(0, 0, width, height); ctx.globalAlpha = 1; }
      const radiusCells = Math.max(2, (terrain?.light_radius ?? 8) + (phase.phase === 'night' ? data.cycle.night_view_delta : 0));
      const radius = radiusCells * WORLD_TILE;
      const vignette = ctx.createRadialGradient(width / 2, height / 2, radius * .6, width / 2, height / 2, radius);
      vignette.addColorStop(0, 'transparent'); vignette.addColorStop(1, ink.shadow); ctx.fillStyle = vignette; ctx.globalAlpha = activeMaze ? .9 : Math.max(phase.phase === 'night' ? .85 : .25, Math.min(.95, Number(era?.darkness) || 0)); ctx.fillRect(0, 0, width, height); ctx.globalAlpha = 1;
      if (avatar.current) avatar.current.style.transform = `translate(${width / 2 - 15 + (time < bumpUntil.current ? Math.sin(time * .1) * 3 : 0)}px, ${height / 2 - 15}px)`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, [data, reduced, move]);
  useEffect(() => { if (!walking) return; const timer = setTimeout(() => setWalking(false), 180); return () => clearTimeout(timer); }, [walking, pos]);
  const enterMaze = async () => {
    if (!placeCard?.maze_level || entering) return;
    setEntering(true); setEntryMessage('');
    try {
      const config = await loadLevelFromSupabase(placeCard.maze_level);
      if (!config) { setEntryMessage('Not built yet'); return; }
      worldReturn.current = posRef.current; setMazeLevel(placeCard.maze_level); setMaze(config); mazeRef.current = config;
      const start = { x: config.spawn.col, y: config.spawn.row };
      posRef.current = start; display.current = start; setPos(start); setPlaceCard(null); keys.current.clear();
    } catch { setEntryMessage('Not built yet'); }
    finally { setEntering(false); }
  };
  const back = () => {
    if (!maze) { navigate('/village'); return; }
    setMaze(null); mazeRef.current = null; setMazeLevel(null); teleport(worldReturn.current);
  };
  if (!data) return error ? <div className="world-error"><p className="font-fell">{error}</p><Button onClick={() => setRetry(n => n + 1)}>RETRY</Button><Button variant="ghost" onClick={() => navigate('/village')}>RETURN</Button></div> : <LoadingScreen />;
  const terrain = data.terrain.find(t => t.key === cache.current.terrainKey(pos.x, pos.y));
  const era = eraAt(pos, data.eras), area = worldArea(pos), phase = worldPhase(clock, data.cycle);
  const groups = [...new Set(data.places.map(p => p.kind))];
  return <div className="world-test">
    <canvas ref={canvas} aria-label="Open world terrain" />
    <div ref={avatar} className="world-avatar"><PlayerAvatar size={30} palette={orbLook(identity.aura_color, identity.orb_dye, identity.registration_number)} walking={walking} /></div>
    <header className="world-hud font-mono"><Button variant="ghost" size="icon" onClick={back} aria-label={maze ? 'Return to world' : 'Return to village'} title="Return"><ArrowLeft size={18} /></Button><div className="world-status"><span>{pos.x},{pos.y} · A {area.x},{area.y} · {maze ? `MAZE ${mazeLevel}` : era?.name ?? '—'}</span><span>{maze ? 'Maze' : terrain?.name ?? (cache.current.errors.size ? 'Window unavailable' : 'Loading…')} · COST {maze ? 1 : terrain ? tileCost(terrain, era) : '—'} · SPENT {Number(spent.toFixed(2))}</span><span>{phase.phase.toUpperCase()} · {Math.ceil(phase.minutesLeft)} MIN</span></div><Button variant="outline" className="world-jump" disabled={Boolean(maze)} onClick={() => { setJumpX(String(pos.x)); setJumpY(String(pos.y)); setJumpOpen(true); }}><Navigation size={14} />JUMP</Button></header>
    <Thumbstick onMove={move} disabled={jumpOpen || Boolean(placeCard)} />
    {jumpOpen && <div className="world-dialog-backdrop" data-game-ui="open"><section className="world-dialog" role="dialog" aria-label="Jump to a place"><Button variant="ghost" size="icon" className="world-dialog-close" aria-label="Close jump menu" onClick={() => setJumpOpen(false)}><X size={18} /></Button><h2 className="font-cinzel">JUMP</h2><form onSubmit={e => { e.preventDefault(); const x = Number(jumpX), y = Number(jumpY); if (Number.isFinite(x) && Number.isFinite(y)) teleport({ x, y }); }}><label className="font-mono">X<Input aria-label="Jump X" type="number" min={0} max={999} value={jumpX} onChange={e => setJumpX(e.target.value)} required /></label><label className="font-mono">Y<Input aria-label="Jump Y" type="number" min={0} max={999} value={jumpY} onChange={e => setJumpY(e.target.value)} required /></label><Button type="submit" className="world-jump">GO</Button></form>{groups.map(kind => <div key={kind} className="world-place-group"><h3 className="font-mono">{kind.replace(/_/g, ' ').toUpperCase()}</h3>{data.places.filter(p => p.kind === kind).sort((a, b) => kind === 'maze_entrance' ? (a.maze_level ?? 0) - (b.maze_level ?? 0) : a.name.localeCompare(b.name)).map((p, i) => <Button key={`${p.name}-${i}`} variant="ghost" onClick={() => { teleport(p); setEntryMessage(''); setPlaceCard(p); }}>{p.name}{p.maze_level ? ` · L${p.maze_level}` : ''}<span className="font-mono">{p.x},{p.y}</span></Button>)}</div>)}</section></div>}
    {placeCard && <div className="world-dialog-backdrop" data-game-ui="open"><section className="world-dialog world-place-card" role="dialog" aria-label={placeCard.name}><Button variant="ghost" size="icon" className="world-dialog-close" aria-label="Close place" onClick={() => setPlaceCard(null)}><X size={18} /></Button><h2 className="font-cinzel">{placeCard.name}{placeCard.maze_level ? `, Level ${placeCard.maze_level}` : ''}</h2>{placeCard.notes && <p className="font-fell">{placeCard.notes}</p>}{entryMessage && <p className="font-fell">{entryMessage}</p>}{placeCard.kind === 'maze_entrance' && <Button className="world-jump" disabled={entering} onClick={enterMaze}>{entering ? '…' : 'ENTER'}</Button>}</section></div>}
  </div>;
}