import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Map as MapIcon, Navigation, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PlayerAvatar, { orbLook } from '@/components/PlayerAvatar';
import Thumbstick from '@/components/Thumbstick';
import LoadingScreen from '@/components/LoadingScreen';
import { useReducedMotion } from '@/components/theme/useReducedMotion';
import { BETA_MODE } from '@/lib/config';
import { getAllFlags, getFlag, reconcileBernardAfterShadow, setFlag } from '@/lib/questFlags';
import { canAccessMaze, checkSubscriptionStatus, getDaysRemainingInTrial, type SubscriptionStatus } from '@/lib/subscriptionStatus';
import { DOOR_FLAGS, type VillageDoorKind } from '@/lib/villageDoors';
import { effectiveWorldLevel, worldDoorRefusal } from '@/lib/worldHome';
import { claimDailyStepsOnce, takeDailyStepsAnnouncement } from '@/lib/dailySteps';
import { USER_STEPS_REFRESHED } from '@/lib/mechanics';
import { refreshDrops } from '@/lib/carriedDrops';
import { ORB_EVENT, type OrbChange } from '@/lib/orb';
import GameHud from '@/components/GameHud';
import MerchantOverlay from '@/components/MerchantOverlay';
import { MERCHANT_LINES, merchantItems } from '@/lib/merchantItems';
import { bindWorldStepFlush, HEAVY_LEGS, stepWalkDuration, WorldSteps } from '@/lib/worldSteps';
import DevMenu from '@/components/DevMenu';
import LevelUpCard, { TITLES_BY_LEVEL } from '@/components/LevelUpCard';
import ProfileOverlay from '@/components/ProfileOverlay';
import { saveWorldPos, saveWorldReturn, takeWorldOpening } from '@/lib/worldReturn';
import { isSignpost, signpostLines, adjacentConversation, clampWorld, eraAt, eraPointFor, fetchWorldChunk, isWading, isWorldConversation, layerSize, mazeOutcome, nearestWorldWalkable, placeAction, placesOn, readWorldData, tileCost, worldArea, worldMoveDuration, worldPhase, WORLD_MOVE_MS, WORLD_TILE, WorldChunkCache, type Place, type WorldLayer, type WorldPoint } from '@/lib/worldTest';
import { drawWorld, drawWorldFireLight, type WorldInk } from '@/lib/worldTestRender';
import { gustStrength, terrainDrawInterval } from '@/lib/terrainMotion';
import WorldMap from '@/components/WorldMap';
import { WorldDiscovery } from '@/lib/worldDiscovery';
import SamCard from '@/components/SamCard';
import FindCard from '@/components/FindCard';
import { currentStage, loadSam, visiblePlaces } from '@/lib/worldSam';
import { approachedFind, bumpedFind, chebyshev, drawFindLight, drawFindMarkers, drawFinds, drawMarker, findMarked, findShows, findsOn, loadFinds, type WorldFind } from '@/lib/worldFinds';
import { setCurrentSkin, type Facing } from '@/lib/skins';
import './world-test.css';

/** The suited figure stands ~90% of a tile wide, feet on the tile. */
const WORLD_AVATAR_SIZE = Math.round(WORLD_TILE * 0.9);

type WorldData = Awaited<ReturnType<typeof readWorldData>>;
export type Identity = { registration_number: number | null; aura_color: string | null; orb_dye?: string | null; avatar_body?: string | null; level?: number | null; username?: string | null; maze_completed_level?: number | null; steps_remaining?: number; credits?: number; growth_points?: number; social?: number; perception?: number; trade?: number; title?: string; levelup_pending?: boolean; levelup_newlevel?: number | null; subscription_status?: string; trial_end?: string; first_launch_at?: string };
const DEFAULT_IDENTITY: Identity = { registration_number: null, aura_color: null };
export default function WorldTest() {
  const { user, loading } = useAuth();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [checkedUser, setCheckedUser] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
        if (cancelled) return;
        const row = (!error && data ? data : null) as Identity | null;
        setCurrentSkin(row?.avatar_body);
        setIdentity(row ?? DEFAULT_IDENTITY); setCheckedUser(user.id);
      } catch { if (!cancelled) { setIdentity(DEFAULT_IDENTITY); setCheckedUser(user.id); } }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);
  if (loading || (user && checkedUser !== user.id)) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <WorldSandbox key={user.id} userId={user.id} identity={identity ?? DEFAULT_IDENTITY} />;
}

export function WorldSandbox({ identity: initialIdentity, userId }: { identity: Identity; userId?: string }) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [identity, setIdentity] = useState(initialIdentity);
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const [profileOpen, setProfileOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [arrival, setArrival] = useState<{ newLevel: number; title: string; titleUnlocked: boolean } | null>(null);
  const [dailyMessage, setDailyMessage] = useState<string | null>(null);
  const [heavyMessage, setHeavyMessage] = useState(false);
  const [stepBalance, setStepBalance] = useState(initialIdentity.steps_remaining ?? 0);
  const stepLedger = useRef<WorldSteps | null>(null);
  if (!stepLedger.current) stepLedger.current = new WorldSteps(initialIdentity.steps_remaining ?? 0, async amount => {
    if (!userId) throw new Error('No player');
    const { data, error } = await supabase.rpc('spend_world_steps', { p_amount: amount });
    if (error || typeof data !== 'number') throw error ?? new Error('Missing step balance');
    return data;
  }, () => {
    const ledger = stepLedger.current;
    if (ledger) { setStepBalance(ledger.balance); setSpent(ledger.total); }
  });
  useEffect(() => {
    const ledger = stepLedger.current;
    if (!ledger) return;
    return bindWorldStepFlush(ledger);
  }, []);
  useEffect(() => {
    if (!heavyMessage) return;
    const timer = setTimeout(() => setHeavyMessage(false), 5000);
    return () => clearTimeout(timer);
  }, [heavyMessage]);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(BETA_MODE ? 'active' : null);
  const dev = identity.registration_number === 1;
  const level = effectiveWorldLevel(identity.level, identity.maze_completed_level);
  const [data, setData] = useState<WorldData | null>(null);
  const rawWorld = useRef<WorldData | null>(null);
  const [completed, setCompleted] = useState(Number(identity.maze_completed_level) || 0);
  const convoOpen = useRef(false);
  const dataRef = useRef<WorldData | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [pos, setPos] = useState<WorldPoint>({ x: 25, y: 25 });
  const posRef = useRef(pos);
  const display = useRef(pos);
  const [layer, setLayer] = useState<WorldLayer>(0);
  const layerRef = useRef<WorldLayer>(0);
  const [spent, setSpent] = useState(0);

  const [clock, setClock] = useState(Date.now());
  const caches = useRef({ 0: new WorldChunkCache((x, y) => fetchWorldChunk(x, y, 0)), 1: new WorldChunkCache((x, y) => fetchWorldChunk(x, y, 1), layerSize(1)) });
  const cacheOf = (l: WorldLayer) => caches.current[l];
  const canvas = useRef<HTMLCanvasElement>(null);
  const avatar = useRef<HTMLDivElement>(null);
  const camera = useRef({ x: 0, y: 0 });
  const keys = useRef(new Set<string>());
  const lastMove = useRef(0);
  const moveDuration = useRef(WORLD_MOVE_MS);
  const journey = useRef({ from: pos, started: 0, duration: WORLD_MOVE_MS });
  const bumpUntil = useRef(0);
  const [walking, setWalking] = useState(false);
  const [facing, setFacing] = useState<Facing>('down');
  const [jumpOpen, setJumpOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [discoveryBits, setDiscoveryBits] = useState('');
  const discovery = useRef<WorldDiscovery | null>(null);
  useEffect(() => {
    if (!userId) return;
    const session = new WorldDiscovery(userId); discovery.current = session; setDiscoveryBits(session.bits);
    const unsubscribe = session.subscribe(() => setDiscoveryBits(session.bits));
    const hidden = () => { if (document.visibilityState === 'hidden') void session.flush(true); };
    document.addEventListener('visibilitychange', hidden);
    return () => { document.removeEventListener('visibilitychange', hidden); unsubscribe(); session.dispose(); discovery.current = null; };
  }, [userId]);
  const [jumpX, setJumpX] = useState('25');
  const [jumpY, setJumpY] = useState('25');
  const [placeCard, setPlaceCard] = useState<Place | null>(null);
  const [finds, setFinds] = useState<WorldFind[]>([]);
  const findsRef = useRef<WorldFind[]>([]);
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const claimedRef = useRef<Set<string>>(new Set());
  const approached = useRef(new Set<string>());
  const samLineRef = useRef<Set<string>>(new Set());
  const [samTick, setSamTick] = useState(0);
  const [findCard, setFindCard] = useState<{ find: WorldFind; reading: boolean } | null>(null);
  useEffect(() => {
    if (!userId) return;
    let off = false;
    void loadFinds(userId).then(r => { if (off) return; findsRef.current = r.finds; setFinds(r.finds); claimedRef.current = r.claimed; setClaimed(r.claimed); }).catch(() => undefined);
    return () => { off = true; };
  }, [userId]);
  const markClaimed = useCallback((id: string) => { const next = new Set(claimedRef.current); next.add(id); claimedRef.current = next; setClaimed(next); }, []);
  const blocked = useRef(false);
  blocked.current = profileOpen || devOpen || Boolean(arrival) || jumpOpen || mapOpen || Boolean(placeCard) || Boolean(findCard);
  convoOpen.current = !profileOpen && !devOpen && !arrival && !jumpOpen && !mapOpen && (Boolean(findCard) || Boolean(placeCard && (isWorldConversation(placeCard) || isSignpost(placeCard))));
  const [busy, setBusy] = useState(false);
  const [entryMessage, setEntryMessage] = useState('');
  const [chunkTick, setChunkTick] = useState(0);
  const pendingArrival = useRef<WorldPoint | null>(null);

  /** Places the player without firing any place action (jumps, stairs, page load). */
  const place = useCallback((point: WorldPoint, nextLayer: WorldLayer) => {
    const size = layerSize(nextLayer);
    const next = { x: clampWorld(point.x, size), y: clampWorld(point.y, size) };
    layerRef.current = nextLayer; setLayer(nextLayer);
    posRef.current = next; display.current = next; setPos(next); caches.current[nextLayer].maintain(next);
    pendingArrival.current = null; setWalking(false);
    saveWorldPos({ layer: nextLayer, ...next });
    setJumpOpen(false); setPlaceCard(null); keys.current.clear();
  }, []);
  const startPoint = (world: WorldData) => world.places.find(p => p.kind === 'start' && (Number(p.layer) || 0) === 0) ?? { x: 25, y: 25 };
  useEffect(() => {
    let cancelled = false;
    setError('');
    void readWorldData().then(world => {
      if (cancelled) return;
      rawWorld.current = world;
      const shown = { ...world, places: visiblePlaces(world.places, completed) };
      dataRef.current = shown; setData(shown);
      const opening = takeWorldOpening();
      if (opening) { place(opening, opening.layer); pendingArrival.current = posRef.current; } else place(startPoint(world), 0);
    }).catch(() => { if (!cancelled) setError('The world could not be loaded.'); });
    return () => { cancelled = true; };
  }, [retry, place]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const world = rawWorld.current; if (!world) return;
    const shown = { ...world, places: visiblePlaces(world.places, completed) };
    dataRef.current = shown; setData(shown);
  }, [completed]);
  const npcKeys = (data?.places ?? []).filter(p => p.action === 'npc' && p.npc_key).map(p => p.npc_key as string).join(',');
  useEffect(() => {
    if (!userId || !npcKeys) { samLineRef.current = new Set(); return; }
    let off = false;
    void Promise.all(npcKeys.split(',').map(async key => { const d = await loadSam(key); return d && await currentStage(userId, d.stages) ? key : null; }))
      .then(keys => { if (!off) samLineRef.current = new Set(keys.filter((k): k is string => Boolean(k))); }).catch(() => undefined);
    return () => { off = true; };
  }, [userId, npcKeys, samTick]);
  const refreshCompleted = useCallback(async () => {
    if (!userId) return;
    const ledger = stepLedger.current;
    await ledger?.settled().catch(() => undefined);
    const revision = ledger?.revision;
    const { data: row, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    if (!error && row) {
      const next = row as unknown as Identity;
      if (ledger?.revision === revision) ledger?.refresh(next.steps_remaining ?? 0);
      setCurrentSkin(next.avatar_body);
      identityRef.current = next; setIdentity(next);
      setCompleted(Number(next.maze_completed_level) || 0);
    }
  }, [userId]);
  const refreshReward = useCallback(async () => {
    await refreshCompleted();
    if (userId) await refreshDrops(userId);
    setSamTick(n => n + 1);
  }, [refreshCompleted, userId]);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let arrivalTimer: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      let granted = 0;
      try {
        granted = await claimDailyStepsOnce(userId, async () => {
          const { data, error } = await supabase.rpc('claim_daily_steps');
          if (error) throw error;
          return typeof data === 'number' ? data : 0;
        });
      } catch { /* A fresh row still recovers a grant whose response was lost. */ }
      if (cancelled) return;
      await refreshCompleted();
      if (cancelled) return;
      if (takeDailyStepsAnnouncement(userId, granted)) setDailyMessage(`The day gives you ${granted} steps.`);
      const row = identityRef.current;
      window.dispatchEvent(new CustomEvent(USER_STEPS_REFRESHED, { detail: { userId, steps: row.steps_remaining ?? 0 } }));
      await reconcileBernardAfterShadow(userId);
      if (cancelled) return;
      const newLevel = row.levelup_newlevel ?? row.level ?? 1;
      if (row.levelup_pending && newLevel >= 2) {
        const titleUnlocked = (parseInt(getFlag('bernard_stage') || '0', 10) || 0) >= 5;
        const title = titleUnlocked ? TITLES_BY_LEVEL[newLevel] || row.title || '' : row.title || '';
        arrivalTimer = setTimeout(() => { if (!cancelled) { keys.current.clear(); setArrival({ newLevel, title, titleUnlocked }); } }, 2000);
      }
    })();
    return () => { cancelled = true; if (arrivalTimer) clearTimeout(arrivalTimer); };
  }, [userId, refreshCompleted]);
  useEffect(() => {
    if (!dailyMessage || !data) return;
    const timer = setTimeout(() => setDailyMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [dailyMessage, data]);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const override = sessionStorage.getItem('dev_sub_override') as SubscriptionStatus | null;
    void (BETA_MODE ? Promise.resolve('active' as const) : override ? Promise.resolve(override) : checkSubscriptionStatus(userId)).then(status => { if (!cancelled) setSubscription(status); });
    return () => { cancelled = true; };
  }, [userId, devOpen]);
  useEffect(() => {
    const steps = (e: Event) => {
      const detail = (e as CustomEvent<{ userId: string; steps: number }>).detail;
      if (detail?.userId !== userId) return;
      if (Number.isFinite(detail.steps)) { stepLedger.current?.refresh(detail.steps); setIdentity(row => ({ ...row, steps_remaining: detail.steps })); }
      void refreshCompleted();
    };
    const orb = (e: Event) => { const change = (e as CustomEvent<OrbChange>).detail; if (change) setIdentity(row => ({ ...row, ...change })); };
    window.addEventListener(USER_STEPS_REFRESHED, steps); window.addEventListener(ORB_EVENT, orb);
    return () => { window.removeEventListener(USER_STEPS_REFRESHED, steps); window.removeEventListener(ORB_EVENT, orb); };
  }, [userId, refreshCompleted]);
  useEffect(() => {
    const timer = setInterval(() => { setClock(Date.now()); setChunkTick(t => t + 1); }, 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const arrival = pendingArrival.current;
    if (!data || !arrival) return;
    const l = layerRef.current, cache = caches.current[l];
    const key = cache.terrainKey(arrival.x, arrival.y);
    if (!key) return;
    pendingArrival.current = null;
    void nearestWorldWalkable(cache, new Map(data.terrain.map(t => [t.key, t])), arrival).then(safe => {
      if (safe && posRef.current === arrival && layerRef.current === l) place(safe, l);
    });
  }, [data, chunkTick, place]);
  const move = useCallback((dx: number, dy: number) => {
    if (convoOpen.current && (dx || dy)) { convoOpen.current = false; blocked.current = false; setPlaceCard(null); setFindCard(null); return; }
    if (blocked.current || !dataRef.current || performance.now() - lastMove.current < moveDuration.current) return;
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
    const bumpOpen = (cell: WorldPoint) => {
      const f = bumpedFind(findsOn(findsRef.current, l), claimedRef.current, cell);
      const sign = f ? null : placesOn(world.places, l).find(p => isSignpost(p) && p.x === cell.x && p.y === cell.y);
      if (!f && !sign) return;
      blocked.current = true; keys.current.clear();
      setTimeout(() => { if (f) setFindCard({ find: f, reading: false }); else if (sign) setPlaceCard(sign); }, 160);
    };
    lastMove.current = performance.now();
    moveDuration.current = WORLD_MOVE_MS;
    if (next.x < 0 || next.y < 0 || next.x >= size || next.y >= size || !walkable(next) || (stepX && stepY && !walkable({ x: next.x, y: from.y }) && !walkable({ x: from.x, y: next.y }))) { bumpUntil.current = performance.now() + 150; bumpOpen(next); return; }
    posRef.current = next; setPos(next); setWalking(true);
    setFacing(stepX > 0 ? 'right' : stepX < 0 ? 'left' : stepY < 0 ? 'up' : 'down');
    discovery.current?.walk(next.x, next.y, l);
    saveWorldPos({ layer: l, ...next });
    const terrain = world.terrain.find(t => t.key === cache.terrainKey(next.x, next.y));
    const ledger = stepLedger.current;
    const balance = ledger?.balance ?? 0;
    moveDuration.current = stepWalkDuration(terrain ? worldMoveDuration(terrain) : WORLD_MOVE_MS, balance);
    if (balance <= 0 && !sessionStorage.getItem(`praem.heavyLegs.${userId}`)) {
      sessionStorage.setItem(`praem.heavyLegs.${userId}`, '1'); setHeavyMessage(true);
    }
    journey.current = { from: display.current, started: lastMove.current, duration: moveDuration.current };
    if (terrain) ledger?.move(tileCost(terrain, eraAt(eraPointFor(next, l), world.eras)));
    cache.maintain(next);
    const layerPlaces = placesOn(world.places, l);
    const spot = layerPlaces.find(p => p.x === next.x && p.y === next.y) ?? adjacentConversation(layerPlaces, next);
    const layerFinds = findsOn(findsRef.current, l);
    for (const id of [...approached.current]) { const f = layerFinds.find(x => x.id === id); if (!f || chebyshev(f, next) > 1) approached.current.delete(id); }
    if (spot) { setEntryMessage(''); setPlaceCard(spot); return; }
    const near = approachedFind(layerFinds, claimedRef.current, approached.current, next, walkable);
    if (near) { approached.current.add(near.id); setFindCard({ find: near, reading: false }); }
  }, [userId]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return; if (e.key.toLowerCase() === 'm' && !e.repeat) { if (blocked.current && !document.querySelector('[aria-label="World map"]')) return; e.preventDefault(); keys.current.clear(); setMapOpen(open => !open); return; } if (convoOpen.current && /^(Arrow|[wasd]$)/i.test(e.key)) { e.preventDefault(); setPlaceCard(null); setFindCard(null); return; } if (blocked.current) return; if (/^(Arrow|[wasd]$)/i.test(e.key)) { e.preventDefault(); keys.current.add(e.key.toLowerCase()); } };
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
    let width = innerWidth, height = innerHeight, frame = 0, lastDraw = -Infinity;
    const resize = () => { width = innerWidth; height = innerHeight; const dpr = Math.min(devicePixelRatio || 1, 2); el.width = Math.round(width * dpr); el.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); window.addEventListener('resize', resize);
    const tick = (time: number) => {
      const k = keys.current;
      move((k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0), (k.has('arrowdown') || k.has('s') ? 1 : 0) - (k.has('arrowup') || k.has('w') ? 1 : 0));
      const l = layerRef.current, cache = caches.current[l];
      const point = posRef.current;
      const progress = Math.min(1, Math.max(0, (time - journey.current.started) / journey.current.duration));
      display.current = walking || display.current.x !== point.x || display.current.y !== point.y
        ? { x: journey.current.from.x + (point.x - journey.current.from.x) * progress, y: journey.current.from.y + (point.y - journey.current.from.y) * progress } : point;
      camera.current = { x: (display.current.x + .5) * WORLD_TILE - width / 2, y: (display.current.y + .5) * WORLD_TILE - height / 2 };
      const clock = Date.now(), moving = progress < 1 || time < bumpUntil.current;
      let gust = false;
      if (!reduced) for (let x = Math.floor(camera.current.x / WORLD_TILE); x <= Math.ceil((camera.current.x + width) / WORLD_TILE); x++) {
        if (gustStrength(x, point.y, clock) > 0) { gust = true; break; }
      }
      if (time - lastDraw < terrainDrawInterval(moving, gust)) { frame = requestAnimationFrame(tick); return; }
      lastDraw = time;
      drawWorld(ctx, cache, types, data.eras, layerPlaces[l], camera.current, width, height, time, ink, reduced, l, clock);
      const layerFinds = findsOn(findsRef.current, l);
      drawFinds(ctx, layerFinds, claimedRef.current, point, types, camera.current, width, height, time, ink, reduced);
      const phase = worldPhase(clock, data.cycle);
      // /world is fully visible: day/night colour tint only, no sight radius or vignette (underground darkens via drawWorld's flat tint).
      if (l === 0) {
        const tint = phase.phase === 'dusk' ? ink.dusk : phase.phase === 'night' ? ink.night : phase.phase === 'dawn' ? ink.dawn : null;
        if (tint) { ctx.globalAlpha = phase.phase === 'dawn' ? 1 - phase.progress : 1; ctx.fillStyle = tint; ctx.fillRect(0, 0, width, height); ctx.globalAlpha = 1; }
      }
      if (l === 0) { drawWorldFireLight(ctx, cache, types, camera.current, width, height, ink, phase.phase); drawFindLight(ctx, layerFinds, claimedRef.current, types, camera.current, ink, phase.phase); }
      drawFindMarkers(ctx, layerFinds, claimedRef.current, camera.current, width, height, time, ink, reduced);
      for (const p of layerPlaces[l]) if (p.npc_key && samLineRef.current.has(p.npc_key)) drawMarker(ctx, p.x * WORLD_TILE - camera.current.x, p.y * WORLD_TILE - camera.current.y - 10, time, ink, reduced);
      if (isWading(types.get(cache.terrainKey(point.x, point.y) ?? ''))) {
        const pulse = reduced ? 0 : (Math.sin(time / 240) + 1) / 2;
        ctx.save(); ctx.strokeStyle = ink.text; ctx.globalAlpha = .35 + pulse * .2; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(width / 2, height / 2 + 5, 10 + pulse * 4, 4 + pulse * 2, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      if (avatar.current) avatar.current.style.transform = `translate(${width / 2 - WORLD_AVATAR_SIZE / 2 + (time < bumpUntil.current ? Math.sin(time * .1) * 3 : 0)}px, ${height / 2 - WORLD_AVATAR_SIZE / 2}px)`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, [data, reduced, move]);
  useEffect(() => { if (!walking) return; const timer = setTimeout(() => setWalking(false), moveDuration.current); return () => clearTimeout(timer); }, [walking, pos]);

  /** Leave the world through a place: remember the place cell so the trip returns here. */
  const leave = async (path: string) => {
    saveWorldReturn({ layer: layerRef.current, ...posRef.current });
    await stepLedger.current?.flush();
    navigate(path);
  };
  /** Mirrors Village's door trigger: touched flag, the same refusals and the same destinations. */
  const openDoor = async (kind: VillageDoorKind) => {
    if (busy || !userId) return;
    setBusy(true); setEntryMessage('');
    try {
      void setFlag(userId, DOOR_FLAGS[kind], 'true');
      const flags = await getAllFlags(userId);
      const refusal = worldDoorRefusal(kind, level, flags.sam_stage);
      if (refusal) { setEntryMessage(refusal); return; }
      let target = kind === 'library' ? '/library-door' : '/exchange-door';
      if (kind === 'maze') {
        const override = sessionStorage.getItem('dev_sub_override') as SubscriptionStatus | null;
        const status = BETA_MODE ? 'active' : override ?? await checkSubscriptionStatus(userId);
        target = BETA_MODE || canAccessMaze(status) ? '/door' : '/paywall';
      }
      await leave(target);
    } catch { setEntryMessage('The door will not open right now.'); }
    finally { setBusy(false); }
  };
  const openShadow = async () => {
    sessionStorage.setItem('praem_shadow_entry', JSON.stringify({ level, ts: Date.now() }));
    try { await leave('/shadow'); } catch { setEntryMessage('The door will not open right now.'); }
  };
  if (!data) return error ? <div className="world-error"><p className="font-fell">{error}</p><Button onClick={() => setRetry(n => n + 1)}>RETRY</Button></div> : <LoadingScreen />;
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
    <canvas ref={canvas} aria-label="Open world terrain" onClick={e => {
      if (blocked.current) return;
      const bounds = e.currentTarget.getBoundingClientRect();
      const x = Math.floor((e.clientX - bounds.left + camera.current.x) / WORLD_TILE), y = Math.floor((e.clientY - bounds.top + camera.current.y) / WORLD_TILE);
      const spot = placesOn(data.places, layer).find(p => (isWorldConversation(p) || isSignpost(p)) && p.x === x && p.y === y && Math.max(Math.abs(x - posRef.current.x), Math.abs(y - posRef.current.y)) <= 1);
      if (spot) { setEntryMessage(''); setPlaceCard(spot); return; }
      const f = findsOn(findsRef.current, layer).find(f => f.x === x && f.y === y && chebyshev(f, posRef.current) <= 1);
      if (!f) return;
      const isClaimed = claimedRef.current.has(f.id);
      if (findMarked(f, isClaimed) || (!isClaimed && findShows(f, posRef.current, false))) setFindCard({ find: f, reading: false });
      else if (isClaimed && f.visibility === 'visible' && f.kind === 'landmark') setFindCard({ find: f, reading: true });
    }} />
    <div ref={avatar} className="world-avatar"><PlayerAvatar size={WORLD_AVATAR_SIZE} palette={orbLook(identity.aura_color, identity.orb_dye, identity.registration_number)} walking={walking} skin={identity.avatar_body} facing={facing} registrationNumber={identity.registration_number} auraColor={identity.aura_color} orbDye={identity.orb_dye} /></div>
    <header className="world-hud font-mono">{dev && <div className="world-status"><span>{pos.x},{pos.y} · A {area.x},{area.y} · {era?.name ?? '—'}</span><span>{layer === 1 ? `UNDERGROUND · ABOVE ${surfacePoint.x},${surfacePoint.y}` : 'SURFACE'}</span><span>{terrain?.name ?? (cache.errors.size ? 'Window unavailable' : 'Loading…')} · COST {terrain ? tileCost(terrain, era) : '—'} · SPENT {Number(spent.toFixed(2))}</span>{layer === 0 && <span>{phase.phase.toUpperCase()} · {Math.ceil(phase.minutesLeft)} MIN</span>}</div>}<Button variant="ghost" size="icon" title="MAP" aria-label="MAP" onClick={() => { keys.current.clear(); setMapOpen(true); }}><MapIcon size={18} /></Button>{dev && <Button variant="outline" className="world-jump" onClick={() => { setJumpX(String(pos.x)); setJumpY(String(pos.y)); setJumpOpen(true); }}><Navigation size={14} />JUMP</Button>}</header>
    <GameHud stepsRemaining={stepBalance} stepsExhausted={stepBalance === 0} credits={identity.credits ?? 0} currentLevel={identity.level ?? 1} registrationNumber={identity.registration_number} growthPoints={identity.growth_points ?? 0} subscriptionStatus={subscription} trialDaysRemaining={identity.first_launch_at ? Math.max(0, 14 - Math.floor((Date.now() - new Date(identity.first_launch_at).getTime()) / 86400000)) : identity.trial_end ? getDaysRemainingInTrial(identity.trial_end) : 14} onOpenProfile={() => { keys.current.clear(); setProfileOpen(true); }} onOpenDevMenu={() => { keys.current.clear(); setDevOpen(true); }} />
    <ProfileOverlay isOpen={profileOpen} onClose={() => { setProfileOpen(false); void refreshCompleted(); }} context="village" growthPoints={identity.growth_points ?? 0} socialStat={identity.social ?? 0} perceptionStat={identity.perception ?? 0} tradeStat={identity.trade ?? 0} />
    {dev && <DevMenu open={devOpen} onClose={() => setDevOpen(false)} userId={userId} home="world" onChanged={() => void refreshCompleted()} />}
    {arrival && <LevelUpCard newLevel={arrival.newLevel} titleUnlocked={arrival.titleUnlocked} auraColor={identity.aura_color} orbDye={identity.orb_dye} registrationNumber={identity.registration_number} home="world" onContinue={async () => {
      if (!userId) return;
      const { error } = await supabase.from('users').update({ title: arrival.title, levelup_pending: false, levelup_newlevel: 0, level: arrival.newLevel, social: (identityRef.current.social ?? 0) + 1 } as never).eq('id', userId);
      if (error) throw error;
      setArrival(null); await refreshCompleted();
    }} />}
    {heavyMessage && <p role="status" className="font-fell italic pointer-events-none fixed left-4 right-4 top-[25%] z-[var(--z-hud)] m-0 mx-auto max-w-[520px] break-words text-center text-xl leading-relaxed text-foreground">{HEAVY_LEGS}</p>}
    {dailyMessage && <p role="status" className="font-fell italic pointer-events-none fixed left-4 right-4 top-[18%] z-[var(--z-hud)] m-0 mx-auto max-w-[520px] break-words text-center text-xl leading-relaxed text-foreground">{dailyMessage}</p>}
    <Thumbstick onMove={move} disabled={profileOpen || devOpen || Boolean(arrival) || jumpOpen || mapOpen || (Boolean(placeCard) && !(placeCard && (isWorldConversation(placeCard) || isSignpost(placeCard))))} />
    {mapOpen && <WorldMap bits={discoveryBits} player={pos} layer={layer} aura={identity.aura_color} dev={identity.registration_number === 1} types={data.terrain} places={data.places} finds={finds} claimed={claimed} onClose={() => setMapOpen(false)} />}
    {findCard && <div className="world-dialog-backdrop" data-game-ui="open"><section className="world-dialog world-place-card" role="dialog" aria-label={findCard.find.title}><Button variant="ghost" size="icon" className="world-dialog-close" aria-label="Close" onClick={() => setFindCard(null)}><X size={18} /></Button><FindCard key={findCard.find.id + String(findCard.reading)} find={findCard.find} reading={findCard.reading} at={() => posRef.current} onClaimed={markClaimed} onRewarded={() => void refreshReward()} onClose={() => setFindCard(null)} auraColor={identity.aura_color} orbDye={identity.orb_dye ?? null} registrationNumber={identity.registration_number} /></section></div>}
    {jumpOpen && <div className="world-dialog-backdrop" data-game-ui="open"><section className="world-dialog" role="dialog" aria-label="Jump to a place"><Button variant="ghost" size="icon" className="world-dialog-close" aria-label="Close jump menu" onClick={() => setJumpOpen(false)}><X size={18} /></Button><h2 className="font-cinzel">JUMP</h2><form onSubmit={e => { e.preventDefault(); const x = Number(jumpX), y = Number(jumpY); if (Number.isFinite(x) && Number.isFinite(y)) place({ x, y }, layer); }}><label className="font-mono">X<Input aria-label="Jump X" type="number" min={0} max={layerSize(layer) - 1} value={jumpX} onChange={e => setJumpX(e.target.value)} required /></label><label className="font-mono">Y<Input aria-label="Jump Y" type="number" min={0} max={layerSize(layer) - 1} value={jumpY} onChange={e => setJumpY(e.target.value)} required /></label><Button type="submit" className="world-jump">GO</Button></form><Button variant="outline" className="world-jump" onClick={() => place(startPoint(data), 0)}>RESTART AT START</Button>{jumpGroups.map(({ l, kind, items }) => <div key={`${l}-${kind}`} className="world-place-group"><h3 className="font-mono">{l === 1 ? 'UNDERGROUND · ' : 'SURFACE · '}{kind.replace(/_/g, ' ').toUpperCase()}</h3>{items.map((p, i) => <Button key={`${p.name}-${i}`} variant="ghost" onClick={() => place(p, l)}>{p.name}{p.maze_level ? ` · L${p.maze_level}` : ''}<span className="font-mono">{p.x},{p.y}</span></Button>)}</div>)}</section></div>}
    {userId && <MerchantOverlay open={Boolean(placeCard && placeAction(placeCard) === 'merchant')} onClose={() => setPlaceCard(null)} palette="green" title="The Merchant." openingLines={MERCHANT_LINES} userId={userId} credits={identity.credits ?? 0} onCreditsChange={credits => { identityRef.current = { ...identityRef.current, credits }; setIdentity(row => ({ ...row, credits })); }} items={merchantItems(level, 'world', async () => {
      const ledger = stepLedger.current;
      await ledger?.flush();
      const { data: row, error } = await supabase.from('users').select('steps_remaining').eq('id', userId).maybeSingle();
      if (error || !row) throw error ?? new Error('Missing player');
      const next = (Number(row.steps_remaining) || 0) + 500;
      const { error: saveError } = await supabase.from('users').update({ steps_remaining: next }).eq('id', userId);
      if (saveError) throw saveError;
      ledger?.refresh(next);
      identityRef.current = { ...identityRef.current, steps_remaining: next };
      setIdentity(row => ({ ...row, steps_remaining: next }));
    })} />}
    {placeCard && cardAction !== 'merchant' && <div className="world-dialog-backdrop" data-game-ui="open"><section className="world-dialog world-place-card" role="dialog" aria-label={placeCard.name}><Button variant="ghost" size="icon" className="world-dialog-close" aria-label="Close place" onClick={() => setPlaceCard(null)}><X size={18} /></Button>{placeCard.action === 'npc' && placeCard.npc_key && userId ? <SamCard userId={userId} npcKey={placeCard.npc_key} playerName={identity.username || 'Wanderer'} fallbackName={placeCard.name} onRewarded={() => void refreshReward()} /> : isSignpost(placeCard) ? <><h2 className="font-cinzel">Signpost</h2>{signpostLines(placeCard.notes).map((line, i) => <p key={i} className="font-fell">{line.dir === 'onward' ? '▶ ' : line.dir === 'back' ? '◀ ' : ''}{line.text}</p>)}</> : <><h2 className="font-cinzel">{placeCard.name}{placeCard.maze_level ? `, Level ${placeCard.maze_level}` : ''}</h2>{placeCard.notes && <p className="font-fell">{placeCard.notes}</p>}
      {outcome === 'completed' && <p className="font-mono">Completed</p>}
      {outcome === 'locked' && <p className="font-mono">Locked: reach Level {placeCard.maze_level} first</p>}
      {entryMessage && <p className="font-fell">{entryMessage}</p>}
      {(outcome === 'enter' || cardAction === 'door_maze') && button('ENTER', () => void openDoor('maze'))}
      {cardAction === 'door_library' && button('OPEN', () => void openDoor('library'))}
      {cardAction === 'door_exchange' && button('OPEN', () => void openDoor('exchange'))}
      {(cardAction === 'descend' || cardAction === 'ascend') && button('GO', () => { const target = placeCard; place({ x: Number(target.target_x), y: Number(target.target_y) }, Number(target.target_layer) === 1 ? 1 : 0); })}
      {cardAction === 'shadow' && button('ENTER', openShadow)}
      {isWorldConversation(placeCard) && <><p className="font-fell">Talking to Bernard arrives in the next build.</p><Button variant="outline" className="world-jump" onClick={() => setPlaceCard(null)}>Close</Button></>}</>}
    </section></div>}
  </div>;
}
