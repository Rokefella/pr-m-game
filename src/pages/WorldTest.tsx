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
import { BETA_MODE } from '@/lib/config';
import { getAllFlags, setFlag } from '@/lib/questFlags';
import { canAccessMaze, checkSubscriptionStatus, type SubscriptionStatus } from '@/lib/subscriptionStatus';
import { DOOR_FLAGS, doorRefusal, EXCHANGE_MIN_LEVEL, LIBRARY_MIN_LEVEL, type VillageDoorKind } from '@/lib/villageDoors';
import { saveWorldPos, saveWorldReturn, takeWorldOpening } from '@/lib/worldReturn';
import { clampWorld, eraAt, eraPointFor, fetchWorldChunk, layerSize, mazeOutcome, placeAction, placesOn, readWorldData, tileCost, worldArea, worldPhase, WORLD_MOVE_MS, WORLD_TILE, WorldChunkCache, type Place, type WorldLayer, type WorldPoint } from '@/lib/worldTest';
import { drawWorld, type WorldInk } from '@/lib/worldTestRender';
import './world-test.css';

type WorldData = Awaited<ReturnType<typeof readWorldData>>;
type Identity = { registration_number: number | null; aura_color: string | null; orb_dye?: string | null; level?: number | null };
const DEFAULT_IDENTITY: Identity = { registration_number: null, aura_color: null };
const UNDER_RADIUS = 6;
export default function WorldTest() {
  const { user, loading } = useAuth();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [checkedUser, setCheckedUser] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await supabase.from('users').select('registration_number, aura_color, orb_dye, level').eq('id', user.id).maybeSingle();
        if (cancelled) return;
        setIdentity(!error && data ? data as Identity : DEFAULT_IDENTITY); setCheckedUser(user.id);
      } catch { if (!cancelled) { setIdentity(DEFAULT_IDENTITY); setCheckedUser(user.id); } }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);
  if (loading || (user && checkedUser !== user.id)) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <WorldSandbox key={user.id} userId={user.id} identity={identity ?? DEFAULT_IDENTITY} />;
}

export function WorldSandbox({ identity, userId }: { identity: Identity; userId?: string }) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const level = Math.max(1, Number(identity.level) || 1);
  const [data, setData] = useState<WorldData | null>(null);
  const dataRef = useRef<WorldData | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [pos, setPos] = useState<WorldPoint>({ x: 25, y: 25 });
  const posRef = useRef(pos);
  const display = useRef(pos);
  const [layer, setLayer] = useState<WorldLayer>(0);
  const layerRef = useRef<WorldLayer>(0);
  const [spent, setSpent] = useState(0);
  const spentRef = useRef(0);
  const [clock, setClock] = useState(Date.now());
  const caches = useRef({ 0: new WorldChunkCache((x, y) => fetchWorldChunk(x, y, 0)), 1: new WorldChunkCache((x, y) => fetchWorldChunk(x, y, 1), layerSize(1)) });
  const cacheOf = (l: WorldLayer) => caches.current[l];
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
  const [busy, setBusy] = useState(false);
  const [entryMessage, setEntryMessage] = useState('');
  const [, setChunkTick] = useState(0);

  /** Places the player without firing any place action (jumps, stairs, page load). */
  const place = useCallback((point: WorldPoint, nextLayer: WorldLayer) => {
    const size = layerSize(nextLayer);
    const next = { x: clampWorld(point.x, size), y: clampWorld(point.y, size) };
    layerRef.current = nextLayer; setLayer(nextLayer);
    posRef.current = next; display.current = next; setPos(next); caches.current[nextLayer].maintain(next);
    saveWorldPos({ layer: nextLayer, ...next });
    setJumpOpen(false); setPlaceCard(null); keys.current.clear();
  }, []);
  const startPoint = (world: WorldData) => world.places.find(p => p.kind === 'start' && (Number(p.layer) || 0) === 0) ?? { x: 25, y: 25 };
  useEffect(() => {
    let cancelled = false;
    setError('');
    void readWorldData().then(world => {
      if (cancelled) return;
      dataRef.current = world; setData(world);
      const opening = takeWorldOpening();
      if (opening) place(opening, opening.layer); else place(startPoint(world), 0);
    }).catch(() => { if (!cancelled) setError('The world could not be loaded.'); });
    return () => { cancelled = true; };
  }, [retry, place]);
  useEffect(() => {
    const timer = setInterval(() => { setClock(Date.now()); setChunkTick(t => t + 1); }, 1000);
    return () => clearInterval(timer);
  }, []);
  const move = useCallback((dx: number, dy: number) => {
    if (blocked.current || !dataRef.current || performance.now() - lastMove.current < WORLD_MOVE_MS) return;
    if (dx === 0 && dy === 0) return;
    const l = layerRef.current, cache = caches.current[l], size = layerSize(l);
    const from = posRef.current, stepX = Math.sign(dx), stepY = Math.sign(dy);
    const next = { x: from.x + stepX, y: from.y + stepY };
    const world = dataRef.current;
    const walkable = (point: WorldPoint) => {
      const terrainKey = cache.terrainKey(point.x, point.y);
      const terrain = world.terrain.find(t => t.key === terrainKey);
      if (!terrainKey) void cache.load(point.x, point.y);
      return terrain?.walkable === true && terrain.enabled !== false;
    };
    lastMove.current = performance.now();
    if (next.x < 0 || next.y < 0 || next.x >= size || next.y >= size || !walkable(next) || (stepX && stepY && !walkable({ x: next.x, y: from.y }) && !walkable({ x: from.x, y: next.y }))) { bumpUntil.current = performance.now() + 150; return; }
    posRef.current = next; setPos(next); setWalking(true);
    saveWorldPos({ layer: l, ...next });
    const terrain = world.terrain.find(t => t.key === cache.terrainKey(next.x, next.y));
    if (terrain) { spentRef.current += tileCost(terrain, eraAt(eraPointFor(next, l), world.eras)); setSpent(spentRef.current); }
    cache.maintain(next);
    const spot = placesOn(world.places, l).find(p => p.x === next.x && p.y === next.y);
    if (spot) { setEntryMessage(''); setPlaceCard(spot); }
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
    const layerPlaces = { 0: placesOn(data.places, 0), 1: placesOn(data.places, 1) };
    let width = innerWidth, height = innerHeight, frame = 0;
    const resize = () => { width = innerWidth; height = innerHeight; const dpr = Math.min(devicePixelRatio || 1, 2); el.width = Math.round(width * dpr); el.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); window.addEventListener('resize', resize);
    const tick = (time: number) => {
      const k = keys.current;
      move((k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0), (k.has('arrowdown') || k.has('s') ? 1 : 0) - (k.has('arrowup') || k.has('w') ? 1 : 0));
      const l = layerRef.current, cache = caches.current[l];
      const point = posRef.current;
      display.current = { x: display.current.x + (point.x - display.current.x) * .2, y: display.current.y + (point.y - display.current.y) * .2 };
      camera.current = { x: (display.current.x + .5) * WORLD_TILE - width / 2, y: (display.current.y + .5) * WORLD_TILE - height / 2 };
      drawWorld(ctx, cache, types, data.eras, layerPlaces[l], camera.current, width, height, time, ink, reduced, l);
      const phase = worldPhase(Date.now(), data.cycle);
      // /world is fully visible: day/night colour tint only, no sight radius or vignette (underground darkens via drawWorld's flat tint).
      if (l === 0) {
        const tint = phase.phase === 'dusk' ? ink.dusk : phase.phase === 'night' ? ink.night : phase.phase === 'dawn' ? ink.dawn : null;
        if (tint) { ctx.globalAlpha = phase.phase === 'dawn' ? 1 - phase.progress : 1; ctx.fillStyle = tint; ctx.fillRect(0, 0, width, height); ctx.globalAlpha = 1; }
      }
      if (avatar.current) avatar.current.style.transform = `translate(${width / 2 - 15 + (time < bumpUntil.current ? Math.sin(time * .1) * 3 : 0)}px, ${height / 2 - 15}px)`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, [data, reduced, move]);
  useEffect(() => { if (!walking) return; const timer = setTimeout(() => setWalking(false), 180); return () => clearTimeout(timer); }, [walking, pos]);

  /** Leave the world through a place: remember the place cell so the trip returns here. */
  const leave = (path: string) => { saveWorldReturn({ layer: layerRef.current, ...posRef.current }); navigate(path); };
  /** Mirrors Village's door trigger: touched flag, the same refusals and the same destinations. */
  const openDoor = async (kind: VillageDoorKind) => {
    if (busy || !userId) return;
    setBusy(true); setEntryMessage('');
    try {
      void setFlag(userId, DOOR_FLAGS[kind], 'true');
      const flags = await getAllFlags(userId);
      const refusal = doorRefusal(kind, level, parseInt(flags.bernard_stage || '0', 10), LIBRARY_MIN_LEVEL, EXCHANGE_MIN_LEVEL);
      if (refusal) { setEntryMessage(refusal); return; }
      let target = kind === 'library' ? '/library-door' : '/exchange-door';
      if (kind === 'maze') {
        const override = sessionStorage.getItem('dev_sub_override') as SubscriptionStatus | null;
        const status = BETA_MODE ? 'active' : override ?? await checkSubscriptionStatus(userId);
        target = BETA_MODE || canAccessMaze(status) ? '/door' : '/paywall';
      }
      leave(target);
    } catch { setEntryMessage('The door will not open right now.'); }
    finally { setBusy(false); }
  };
  const openShadow = () => {
    sessionStorage.setItem('praem_shadow_entry', JSON.stringify({ level, ts: Date.now() }));
    leave('/shadow');
  };
  const back = () => navigate('/village');
  if (!data) return error ? <div className="world-error"><p className="font-fell">{error}</p><Button onClick={() => setRetry(n => n + 1)}>RETRY</Button><Button variant="ghost" onClick={() => navigate('/village')}>RETURN</Button></div> : <LoadingScreen />;
  const cache = cacheOf(layer);
  const terrain = data.terrain.find(t => t.key === cache.terrainKey(pos.x, pos.y));
  const surfacePoint = layer === 1 ? { x: pos.x * 4, y: pos.y * 4 } : pos;
  const era = eraAt(eraPointFor(pos, layer), data.eras), area = worldArea(surfacePoint), phase = worldPhase(clock, data.cycle);
  const cardAction = placeCard ? placeAction(placeCard) : null;
  const outcome = placeCard && cardAction === 'maze' ? mazeOutcome(placeCard.maze_level, level) : null;
  const button = (label: string, onClick: () => void) => <Button className="world-jump" disabled={busy} onClick={onClick}>{busy ? '…' : label}</Button>;
  const jumpGroups = ([0, 1] as WorldLayer[]).flatMap(l => {
    const list = placesOn(data.places, l);
    return [...new Set(list.map(p => p.kind))].map(kind => ({ l, kind, items: list.filter(p => p.kind === kind).sort((a, b) => kind === 'maze_entrance' ? (a.maze_level ?? 0) - (b.maze_level ?? 0) : a.name.localeCompare(b.name)) }));
  });
  return <div className="world-test">
    <canvas ref={canvas} aria-label="Open world terrain" />
    <div ref={avatar} className="world-avatar"><PlayerAvatar size={30} palette={orbLook(identity.aura_color, identity.orb_dye, identity.registration_number)} walking={walking} /></div>
    <header className="world-hud font-mono"><Button variant="ghost" size="icon" onClick={back} aria-label="Return to village" title="Return"><ArrowLeft size={18} /></Button><div className="world-status"><span>{pos.x},{pos.y} · A {area.x},{area.y} · {era?.name ?? '—'}</span><span>{layer === 1 ? `UNDERGROUND · ABOVE ${surfacePoint.x},${surfacePoint.y}` : 'SURFACE'}</span><span>{terrain?.name ?? (cache.errors.size ? 'Window unavailable' : 'Loading…')} · COST {terrain ? tileCost(terrain, era) : '—'} · SPENT {Number(spent.toFixed(2))}</span>{layer === 0 && <span>{phase.phase.toUpperCase()} · {Math.ceil(phase.minutesLeft)} MIN</span>}</div><Button variant="outline" className="world-jump" onClick={() => { setJumpX(String(pos.x)); setJumpY(String(pos.y)); setJumpOpen(true); }}><Navigation size={14} />JUMP</Button></header>
    <Thumbstick onMove={move} disabled={jumpOpen || Boolean(placeCard)} />
    {jumpOpen && <div className="world-dialog-backdrop" data-game-ui="open"><section className="world-dialog" role="dialog" aria-label="Jump to a place"><Button variant="ghost" size="icon" className="world-dialog-close" aria-label="Close jump menu" onClick={() => setJumpOpen(false)}><X size={18} /></Button><h2 className="font-cinzel">JUMP</h2><form onSubmit={e => { e.preventDefault(); const x = Number(jumpX), y = Number(jumpY); if (Number.isFinite(x) && Number.isFinite(y)) place({ x, y }, layer); }}><label className="font-mono">X<Input aria-label="Jump X" type="number" min={0} max={layerSize(layer) - 1} value={jumpX} onChange={e => setJumpX(e.target.value)} required /></label><label className="font-mono">Y<Input aria-label="Jump Y" type="number" min={0} max={layerSize(layer) - 1} value={jumpY} onChange={e => setJumpY(e.target.value)} required /></label><Button type="submit" className="world-jump">GO</Button></form><Button variant="outline" className="world-jump" onClick={() => place(startPoint(data), 0)}>RESTART AT START</Button>{jumpGroups.map(({ l, kind, items }) => <div key={`${l}-${kind}`} className="world-place-group"><h3 className="font-mono">{l === 1 ? 'UNDERGROUND · ' : 'SURFACE · '}{kind.replace(/_/g, ' ').toUpperCase()}</h3>{items.map((p, i) => <Button key={`${p.name}-${i}`} variant="ghost" onClick={() => place(p, l)}>{p.name}{p.maze_level ? ` · L${p.maze_level}` : ''}<span className="font-mono">{p.x},{p.y}</span></Button>)}</div>)}</section></div>}
    {placeCard && <div className="world-dialog-backdrop" data-game-ui="open"><section className="world-dialog world-place-card" role="dialog" aria-label={placeCard.name}><Button variant="ghost" size="icon" className="world-dialog-close" aria-label="Close place" onClick={() => setPlaceCard(null)}><X size={18} /></Button><h2 className="font-cinzel">{placeCard.name}{placeCard.maze_level ? `, Level ${placeCard.maze_level}` : ''}</h2>{placeCard.notes && <p className="font-fell">{placeCard.notes}</p>}
      {outcome === 'completed' && <p className="font-mono">Completed</p>}
      {outcome === 'locked' && <p className="font-mono">Locked: reach Level {placeCard.maze_level} first</p>}
      {entryMessage && <p className="font-fell">{entryMessage}</p>}
      {(outcome === 'enter' || cardAction === 'door_maze') && button('ENTER', () => void openDoor('maze'))}
      {cardAction === 'door_library' && button('OPEN', () => void openDoor('library'))}
      {cardAction === 'door_exchange' && button('OPEN', () => void openDoor('exchange'))}
      {(cardAction === 'descend' || cardAction === 'ascend') && button('GO', () => { const target = placeCard; place({ x: Number(target.target_x), y: Number(target.target_y) }, Number(target.target_layer) === 1 ? 1 : 0); })}
      {cardAction === 'shadow' && button('ENTER', openShadow)}
    </section></div>}
  </div>;
}
