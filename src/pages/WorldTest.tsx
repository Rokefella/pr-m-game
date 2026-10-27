import { latestBuiltAt, isStale, CHUNKS_BUILT_KEY } from '@/lib/worldFreshness';
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
import { effectiveWorldLevel, worldDoorRefusal, type WorldDoorKind } from '@/lib/worldHome';
import { claimDailyStepsOnce, takeDailyStepsAnnouncement } from '@/lib/dailySteps';
import { USER_STEPS_REFRESHED, USER_CREDITS_REFRESHED, WORLD_REVEALED, type MechanicResult } from '@/lib/mechanics';
import { refreshDrops } from '@/lib/carriedDrops';
import { ORB_EVENT, type OrbChange } from '@/lib/orb';
import GameHud from '@/components/GameHud';
import MerchantOverlay from '@/components/MerchantOverlay';
import SuppliesCard from '@/components/SuppliesCard';
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
import { npcFacingToward, npcSkin, setCurrentSkin, useSkins, type Facing } from '@/lib/skins';
import NpcOrb from '@/components/theme/objects/NpcOrb';
import { worldWalkable } from '@/lib/worldTest';
import { buildingBox, buildingOpacity, visibleBuildings, type WorldBuilding } from '@/lib/worldBuildings';
import { drawSpriteAtmosphere, terrainSprite } from '@/lib/terrainTile';
import { npcId, NpcWander, type NpcPose } from '@/lib/worldNpcMotion';
import { readWorldPlayers, shownPlayers, WorldPresence, writeWorldPlayer, type WorldPlayer } from '@/lib/worldPlayers';
import WorldVisitor from '@/components/WorldVisitor';
import './world-test.css';
import { useDevNoteContext } from '@/hooks/useDevNoteContext';
import { notepadFocused } from '@/lib/devNotes';
import { isIce, ICE_MOVE_MS, npcTerrainSafe } from '@/lib/worldIce';

/** The suited figure stands ~90% of a tile wide, feet on the tile. */
const WORLD_AVATAR_SIZE = Math.round(WORLD_TILE * 0.9);
const WORLD_NPC_SIZE = WORLD_AVATAR_SIZE;

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
  const [suppliesOpen, setSuppliesOpen] = useState(false);
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
  const [samStage, setSamStage] = useState(0);
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
  const slide = useRef<WorldPoint | null>(null);
  const [sliding, setSliding] = useState(false);
  const [facing, setFacing] = useState<Facing>('down');
  const [players, setPlayers] = useState<WorldPlayer[]>([]);
  const presence = useRef<WorldPresence | null>(null);
  const npcWanders = useRef(new Map<string, NpcWander>());
  const npcPoses = useRef(new Map<string, NpcPose>());
  const npcApproached = useRef(new Set<string>());
  const [npcPhases, setNpcPhases] = useState<Record<string, 'stand' | 'a' | 'b'>>({});
  const npcPhasesRef = useRef<Record<string, 'stand' | 'a' | 'b'>>({});
  const [buildings, setBuildings] = useState<WorldBuilding[]>([]);
  const buildingSignature = useRef('');
  const buildingEls = useRef(new Map<string, HTMLCanvasElement>());
  const markerCanvas = useRef<HTMLCanvasElement>(null);
  const currentPlaces = (list: Place[]) => list.map(p => { const pose = npcPoses.current.get(npcId(p)); return pose ? { ...p, ...pose.cell } : p; });
  useEffect(() => {
    if (!userId) return;
    const publisher = new WorldPresence(writeWorldPlayer); presence.current = publisher;
    let off = false;
    const read = () => { void readWorldPlayers().then(rows => { if (!off) setPlayers(rows); }); };
    read(); const timer = setInterval(read, 3000);
    return () => { off = true; clearInterval(timer); publisher.dispose(); presence.current = null; };
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    presence.current?.publish({ user_id: userId, ...pos, layer, facing, village_level: 0, avatar_body: identity.avatar_body, orb_dye: identity.orb_dye, aura_color: identity.aura_color, last_seen: new Date().toISOString() });
  }, [userId, pos, layer, facing, identity.avatar_body, identity.orb_dye, identity.aura_color]);
  useEffect(() => {
    if (!userId) return;
    const timer = setInterval(() => { const row = identityRef.current; presence.current?.publish({ user_id: userId, ...posRef.current, layer: layerRef.current, facing, village_level: 0, avatar_body: row.avatar_body, orb_dye: row.orb_dye, aura_color: row.aura_color, last_seen: new Date().toISOString() }); }, 30000);
    return () => clearInterval(timer);
  }, [userId, facing]);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [revealTarget, setRevealTarget] = useState<{ x: number; y: number; title: string } | null>(null);
  useEffect(() => {
    const reveal = (event: Event) => {
      const result = (event as CustomEvent<MechanicResult & { userId?: string }>).detail;
      if (result.userId !== userId || !Number.isFinite(result.x) || !Number.isFinite(result.y)) return;
      discovery.current?.reveal(result.x ?? 0, result.y ?? 0, result.radius ?? 40);
      setRevealTarget(result.nearest_find ?? null); keys.current.clear(); setProfileOpen(false); setMapOpen(true);
    };
    window.addEventListener(WORLD_REVEALED, reveal);
    return () => window.removeEventListener(WORLD_REVEALED, reveal);
  }, [userId]);
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
  const talkingNpc = useRef<string | null>(null);
  const npcCardOpen = Boolean(placeCard && (placeCard.npc_key || placeAction(placeCard) === 'merchant'));
  talkingNpc.current = npcCardOpen ? placeCard?.npc_key ?? 'merchant' : null;
  useEffect(() => { if (npcCardOpen) keys.current.clear(); }, [npcCardOpen]);
  const [finds, setFinds] = useState<WorldFind[]>([]);
  const findsRef = useRef<WorldFind[]>([]);
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const claimedRef = useRef<Set<string>>(new Set());
  const approached = useRef(new Set<string>());
  const samLineRef = useRef<Set<string>>(new Set());
  const [samTick, setSamTick] = useState(0);
  const skins = useSkins(); // loading the catalogue re-renders so NPC sprites appear
  const skinnedRef = useRef<Set<string>>(new Set());
  const npcEls = useRef(new Map<string, HTMLDivElement | null>());
  const npcFacingsRef = useRef<Record<string, Facing>>({});
  const [npcFacings, setNpcFacings] = useState<Record<string, Facing>>({});
  const [findCard, setFindCard] = useState<{ find: WorldFind; reading: boolean } | null>(null);
  useEffect(() => {
    if (!userId) return;
    let off = false;
    void loadFinds(userId).then(r => { if (off) return; findsRef.current = r.finds; setFinds(r.finds); claimedRef.current = r.claimed; setClaimed(r.claimed); }).catch(() => undefined);
    return () => { off = true; };
  }, [userId]);
  const markClaimed = useCallback((id: string) => { const next = new Set(claimedRef.current); next.add(id); claimedRef.current = next; setClaimed(next); }, []);
  const blocked = useRef(false);
  blocked.current = suppliesOpen || profileOpen || devOpen || Boolean(arrival) || jumpOpen || mapOpen || Boolean(placeCard) || Boolean(findCard);
  convoOpen.current = !npcCardOpen && !suppliesOpen && !profileOpen && !devOpen && !arrival && !jumpOpen && !mapOpen && (Boolean(findCard) || Boolean(placeCard && (isWorldConversation(placeCard) || isSignpost(placeCard))));
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
    void latestBuiltAt('world_chunk_cache').then(stamp => {
      if (cancelled || !isStale(CHUNKS_BUILT_KEY, stamp)) return;
      for (const cache of [caches.current[0], caches.current[1]]) { cache.chunks.clear(); cache.errors.clear(); cache.maintain(cache.center); }
    });
    setError('');
    void readWorldData().then(world => {
      if (cancelled) return;
      rawWorld.current = world;
      const shown = { ...world, places: visiblePlaces(world.places, completed, samStage) };
      dataRef.current = shown; setData(shown);
      const opening = takeWorldOpening();
      if (opening) { place(opening, opening.layer); pendingArrival.current = posRef.current; } else place(startPoint(world), 0);
    }).catch(() => { if (!cancelled) setError('The world could not be loaded.'); });
    return () => { cancelled = true; };
  }, [retry, place]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const world = rawWorld.current; if (!world) return;
    const shown = { ...world, places: visiblePlaces(world.places, completed, samStage) };
    dataRef.current = shown; setData(shown);
  }, [completed, samStage]);
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
    const flags = await getAllFlags(userId).catch(() => null);
    if (flags) setSamStage(parseInt(flags.sam_stage ?? '0', 10) || 0);
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
    const credits = (e: Event) => {
      const detail = (e as CustomEvent<{ userId: string; credits: number }>).detail;
      if (detail?.userId !== userId || !Number.isFinite(detail.credits)) return;
      identityRef.current = { ...identityRef.current, credits: detail.credits };
      setIdentity(row => ({ ...row, credits: detail.credits }));
    };
    window.addEventListener(USER_STEPS_REFRESHED, steps); window.addEventListener(ORB_EVENT, orb); window.addEventListener(USER_CREDITS_REFRESHED, credits);
    return () => { window.removeEventListener(USER_STEPS_REFRESHED, steps); window.removeEventListener(ORB_EVENT, orb); window.removeEventListener(USER_CREDITS_REFRESHED, credits); };
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
  const move = useCallback((dx: number, dy: number, autoSlide = false) => {
    if (slide.current && !autoSlide) return;
    if (notepadFocused()) { keys.current.clear(); return; }
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
      return worldWalkable(terrain);
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
    if (next.x < 0 || next.y < 0 || next.x >= size || next.y >= size || !walkable(next) || (stepX && stepY && !walkable({ x: next.x, y: from.y }) && !walkable({ x: from.x, y: next.y }))) { slide.current = null; setSliding(false); bumpUntil.current = performance.now() + 150; bumpOpen(next); return; }
    posRef.current = next; setPos(next); setWalking(true);
    setFacing(stepX > 0 ? 'right' : stepX < 0 ? 'left' : stepY < 0 ? 'up' : 'down');
    discovery.current?.walk(next.x, next.y, l);
    saveWorldPos({ layer: l, ...next });
    const terrain = world.terrain.find(t => t.key === cache.terrainKey(next.x, next.y));
    const ledger = stepLedger.current;
    const balance = ledger?.balance ?? 0;
    if (isIce(terrain)) { slide.current = { x: stepX, y: stepY }; setSliding(true); keys.current.clear(); }
    else { slide.current = null; setSliding(false); }
    moveDuration.current = autoSlide || isIce(terrain) ? ICE_MOVE_MS : stepWalkDuration(terrain ? worldMoveDuration(terrain) : WORLD_MOVE_MS, balance);
    if (balance <= 0 && !sessionStorage.getItem(`praem.heavyLegs.${userId}`)) {
      sessionStorage.setItem(`praem.heavyLegs.${userId}`, '1'); setHeavyMessage(true);
    }
    journey.current = { from: display.current, started: lastMove.current, duration: moveDuration.current };
    if (terrain) ledger?.move(tileCost(terrain, eraAt(eraPointFor(next, l), world.eras)));
    cache.maintain(next);
    if (slide.current) return;
    const layerPlaces = currentPlaces(placesOn(world.places, l));
    for (const p of layerPlaces) if (p.npc_key && chebyshev(p, next) > 1) npcApproached.current.delete(npcId(placesOn(world.places, l).find(home => home.npc_key === p.npc_key) ?? p));
    const spot = layerPlaces.find(p => !p.npc_key && p.x === next.x && p.y === next.y) ?? adjacentConversation(layerPlaces.filter(p => !p.npc_key), next);
    const layerFinds = findsOn(findsRef.current, l);
    for (const id of [...approached.current]) { const f = layerFinds.find(x => x.id === id); if (!f || chebyshev(f, next) > 1) approached.current.delete(id); }
    if (spot) { setEntryMessage(''); setPlaceCard(spot); return; }
    const near = approachedFind(layerFinds, claimedRef.current, approached.current, next, walkable);
    if (near) { approached.current.add(near.id); setFindCard({ find: near, reading: false }); }
  }, [userId]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (slide.current) { e.preventDefault(); return; } if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return; if (e.key.toLowerCase() === 'm' && !e.repeat) { if (blocked.current && !document.querySelector('[aria-label="World map"]')) return; e.preventDefault(); keys.current.clear(); setMapOpen(open => !open); return; } if (convoOpen.current && /^(Arrow|[wasd]$)/i.test(e.key)) { e.preventDefault(); setPlaceCard(null); setFindCard(null); return; } if (blocked.current) return; if (/^(Arrow|[wasd]$)/i.test(e.key)) { e.preventDefault(); keys.current.add(e.key.toLowerCase()); } };
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
    const markers = markerCanvas.current, markerCtx = markers?.getContext('2d');
    let width = innerWidth, height = innerHeight, frame = 0, lastDraw = -Infinity;
    const resize = () => { width = innerWidth; height = innerHeight; const dpr = Math.min(devicePixelRatio || 1, 2); el.width = Math.round(width * dpr); el.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); if (markers && markerCtx) { markers.width = el.width; markers.height = el.height; markerCtx.setTransform(dpr, 0, 0, dpr, 0, 0); } };
    resize(); window.addEventListener('resize', resize);
    const tick = (time: number) => {
      const k = keys.current;
      if (slide.current) move(slide.current.x, slide.current.y, true);
      else move((k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0), (k.has('arrowdown') || k.has('s') ? 1 : 0) - (k.has('arrowup') || k.has('w') ? 1 : 0));
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
      drawWorld(ctx, cache, types, data.eras, layerPlaces[l], camera.current, width, height, time, ink, reduced, l, clock, skinnedRef.current);
      const layerFinds = findsOn(findsRef.current, l);
      drawFinds(ctx, layerFinds, claimedRef.current, point, types, camera.current, width, height, time, ink, reduced);
      const phase = worldPhase(clock, data.cycle);
      // /world is fully visible: day/night colour tint only, no sight radius or vignette (underground darkens via drawWorld's flat tint).
      if (l === 0) {
        const tint = phase.phase === 'dusk' ? ink.dusk : phase.phase === 'night' ? ink.night : phase.phase === 'dawn' ? ink.dawn : null;
        if (tint) { ctx.globalAlpha = phase.phase === 'dawn' ? 1 - phase.progress : 1; ctx.fillStyle = tint; ctx.fillRect(0, 0, width, height); ctx.globalAlpha = 1; }
      }
      if (l === 0) { drawWorldFireLight(ctx, cache, types, camera.current, width, height, ink, phase.phase); drawFindLight(ctx, layerFinds, claimedRef.current, types, camera.current, ink, phase.phase); }
      if (markerCtx) { markerCtx.clearRect(0, 0, width, height); drawFindMarkers(markerCtx, layerFinds, claimedRef.current, camera.current, width, height, time, ink, reduced); }
      if (isWading(types.get(cache.terrainKey(point.x, point.y) ?? ''))) {
        const pulse = reduced ? 0 : (Math.sin(time / 240) + 1) / 2;
        ctx.save(); ctx.strokeStyle = ink.text; ctx.globalAlpha = .35 + pulse * .2; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(width / 2, height / 2 + 5, 10 + pulse * 4, 4 + pulse * 2, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      if (avatar.current) { avatar.current.style.transform = `translate(${width / 2 - WORLD_AVATAR_SIZE / 2 + (time < bumpUntil.current ? Math.sin(time * .1) * 3 : slide.current && !reduced ? Math.sin(time * .13) : 0)}px, ${height / 2 + WORLD_TILE / 2 - Math.round(WORLD_AVATAR_SIZE * 14 / 16)}px)`; avatar.current.style.zIndex = String(Math.round((display.current.y + 1) * WORLD_TILE)); }
      const visible = visibleBuildings(cache, types, camera.current, width, height);
      const sig = `${l}:` + visible.map(b => `${b.x},${b.y}:${b.terrain.key}`).join('|');
      if (sig !== buildingSignature.current) { buildingSignature.current = sig; setBuildings(visible); }
      for (const b of visible) {
        const el = buildingEls.current.get(`${b.x},${b.y}`), box = buildingBox(b), sprite = terrainSprite(b.terrain.key, b.x, b.y);
        if (!el) continue;
        el.style.transform = `translate(${box.x * WORLD_TILE - camera.current.x}px, ${(box.y - 1) * WORLD_TILE - camera.current.y}px)`;
        el.style.zIndex = String(Math.round(box.bottom * WORLD_TILE)); el.style.opacity = String(buildingOpacity(b, point));
        const c = el.getContext('2d'); if (c && sprite) { c.clearRect(0, 0, el.width, el.height); c.imageSmoothingEnabled = false; c.save(); c.translate(0, 16); c.drawImage(sprite, 0, 0); drawSpriteAtmosphere(c, b.terrain, sprite, b.x, b.y, clock, ink, reduced); c.restore(); }
      }
      for (const p of layerPlaces[l]) {
        if (!p.npc_key || !skinnedRef.current.has(p.npc_key)) continue;
        const key = npcId(p);
        let wander = npcWanders.current.get(key); if (!wander) { wander = new NpcWander(); npcWanders.current.set(key, wander); }
        if (Math.max(Math.abs(p.x - point.x), Math.abs(p.y - point.y)) > Math.max(width, height) / WORLD_TILE + 7) { const el = npcEls.current.get(key); if (el) el.style.display = 'none'; continue; }
        const pose = wander.sample(p, p.npc_key, clock, point, cell => { const t = types.get(cache.terrainKey(cell.x, cell.y) ?? ''); return npcTerrainSafe(t) && !layerPlaces[l].some(other => other !== p && other.x === cell.x && other.y === cell.y); }, reduced, talkingNpc.current === p.npc_key);
        npcPoses.current.set(key, pose);
        const el = npcEls.current.get(key);
        if (el) { el.style.display = ''; el.style.transform = `translate(${pose.x * WORLD_TILE - camera.current.x + (WORLD_TILE - WORLD_NPC_SIZE) / 2}px, ${pose.y * WORLD_TILE - camera.current.y + WORLD_TILE - Math.round(WORLD_NPC_SIZE * 14 / 16)}px)`; el.style.zIndex = String(Math.round((pose.y + 1) * WORLD_TILE)); }
        if (markerCtx && samLineRef.current.has(p.npc_key)) drawMarker(markerCtx, pose.x * WORLD_TILE - camera.current.x, pose.y * WORLD_TILE - camera.current.y - 10, time, ink, reduced);
        const f = pose.facing;
        if (npcFacingsRef.current[key] !== f) { npcFacingsRef.current[key] = f; setNpcFacings({ ...npcFacingsRef.current }); }
        if (npcPhasesRef.current[key] !== pose.phase) { npcPhasesRef.current[key] = pose.phase; setNpcPhases({ ...npcPhasesRef.current }); }
        if (chebyshev(pose.cell, point) > 1) npcApproached.current.delete(key);
        if (!blocked.current && !npcApproached.current.has(key) && chebyshev(pose.cell, point) <= 1) { npcApproached.current.add(key); keys.current.clear(); setPlaceCard({ ...p, ...pose.cell }); }
      }
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
  /** World door trigger: the maze waits for Sam; library and exchange are always open. */
  const openDoor = async (kind: WorldDoorKind) => {
    if (busy || !userId) return;
    setBusy(true); setEntryMessage('');
    try {
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
  useDevNoteContext(() => ({ x: posRef.current.x, y: posRef.current.y, layer: layerRef.current, era: data ? eraAt(eraPointFor(posRef.current, layerRef.current), data.eras)?.name : undefined, level, maze_completed_level: completed, steps_remaining: stepLedger.current?.balance, credits: identity.credits, facing, avatar_body: identity.avatar_body, open_card: placeCard?.name ?? findCard?.find.title ?? (profileOpen ? 'Profile' : mapOpen ? 'Map' : null), phase: data ? worldPhase(clock, data.cycle).phase : undefined }));
  if (!data) return error ? <div className="world-error"><p className="font-fell">{error}</p><Button onClick={() => setRetry(n => n + 1)}>RETRY</Button></div> : <LoadingScreen />;
  const cache = cacheOf(layer);
  const terrain = data.terrain.find(t => t.key === cache.terrainKey(pos.x, pos.y));
  const surfacePoint = layer === 1 ? { x: pos.x * 4, y: pos.y * 4 } : pos;
  const era = eraAt(eraPointFor(pos, layer), data.eras), area = worldArea(surfacePoint), phase = worldPhase(clock, data.cycle);
  const skinned = new Set(skins.filter(s => s.kind === 'npc' && s.enabled !== false && s.npc_key).map(s => s.npc_key as string));
  skinnedRef.current = skinned;
  const cardAction = placeCard ? placeAction(placeCard) : null;
  const outcome = placeCard && cardAction === 'maze' ? mazeOutcome(placeCard.maze_level, level) : null;
  const button = (label: string, onClick: () => void) => <Button className="world-jump" disabled={busy} onClick={onClick}>{busy ? '…' : label}</Button>;
  const jumpGroups = ([0, 1] as WorldLayer[]).flatMap(l => {
    const list = placesOn(data.places, l);
    return [...new Set(list.map(p => p.kind))].map(kind => ({ l, kind, items: list.filter(p => p.kind === kind).sort((a, b) => kind === 'maze_entrance' ? (a.maze_level ?? 0) - (b.maze_level ?? 0) : a.name.localeCompare(b.name)) }));
  });
  const visitors = shownPlayers(players, userId, layer, clock);
  return <div className="world-test" data-night={phase.phase === 'night' || phase.phase === 'dusk'}><div className="world-scene">
    <canvas ref={canvas} aria-label="Open world terrain" onClick={e => {
      if (blocked.current) return;
      const bounds = e.currentTarget.getBoundingClientRect();
      const x = Math.floor((e.clientX - bounds.left + camera.current.x) / WORLD_TILE), y = Math.floor((e.clientY - bounds.top + camera.current.y) / WORLD_TILE);
      const spot = currentPlaces(placesOn(data.places, layer)).find(p => (isWorldConversation(p) || isSignpost(p)) && p.x === x && p.y === y && Math.max(Math.abs(x - posRef.current.x), Math.abs(y - posRef.current.y)) <= 1);
      if (spot) { setEntryMessage(''); setPlaceCard(spot); return; }
      const f = findsOn(findsRef.current, layer).find(f => f.x === x && f.y === y && chebyshev(f, posRef.current) <= 1);
      if (!f) return;
      const isClaimed = claimedRef.current.has(f.id);
      if (findMarked(f, isClaimed) || (!isClaimed && findShows(f, posRef.current, false))) setFindCard({ find: f, reading: false });
      else if (isClaimed && (f.kind === 'words' || f.kind === 'landmark')) setFindCard({ find: f, reading: true });
    }} />
    {buildings.map(b => { const box = buildingBox(b), id = `${b.x},${b.y}`; return <canvas key={id} ref={el => { if (el) buildingEls.current.set(id, el); else buildingEls.current.delete(id); }} width={b.terrain.sprite_w ?? box.w * 16} height={(b.terrain.sprite_h ?? box.h * 16) + 16} className="world-building" style={{ width: box.w * WORLD_TILE, height: (box.h + 1) * WORLD_TILE }} aria-hidden="true" />; })}
    {visitors.map(p => <WorldVisitor key={p.user_id} player={p} at={pos} camera={camera} reduced={reduced} />)}
    <div ref={avatar} className="world-avatar"><PlayerAvatar size={WORLD_AVATAR_SIZE} palette={orbLook(identity.aura_color, identity.orb_dye, identity.registration_number)} walking={walking && !sliding} skin={identity.avatar_body} facing={facing} registrationNumber={identity.registration_number} auraColor={identity.aura_color} orbDye={identity.orb_dye} /></div>
    {placesOn(data.places, layer).filter(p => p.npc_key && skinned.has(p.npc_key)).map(p => {
      const key = `${p.npc_key}:${p.x}:${p.y}`;
      return <div key={key} ref={el => { if (el) npcEls.current.set(key, el); else npcEls.current.delete(key); }} className="world-avatar" style={{ pointerEvents: 'none' }}><NpcOrb npc={p.npc_key as string} size={WORLD_NPC_SIZE} facing={npcFacings[key] ?? 'down'} phase={npcPhases[key] ?? 'stand'} /></div>;
    })}
    <canvas ref={markerCanvas} className="world-markers" aria-hidden="true" /></div>
    <header className="world-hud font-mono">{dev && <div className="world-status"><span>{pos.x},{pos.y} · A {area.x},{area.y} · {era?.name ?? '—'}</span><span>{layer === 1 ? `UNDERGROUND · ABOVE ${surfacePoint.x},${surfacePoint.y}` : 'SURFACE'}</span><span>{terrain?.name ?? (cache.errors.size ? 'Window unavailable' : 'Loading…')} · COST {terrain ? tileCost(terrain, era) : '—'} · SPENT {Number(spent.toFixed(2))}</span>{layer === 0 && <span>{phase.phase.toUpperCase()} · {Math.ceil(phase.minutesLeft)} MIN</span>}</div>}<Button variant="ghost" size="icon" title="MAP" aria-label="MAP" onClick={() => { keys.current.clear(); setMapOpen(true); }}><MapIcon size={18} /></Button>{dev && <Button variant="outline" className="world-jump" onClick={() => { setJumpX(String(pos.x)); setJumpY(String(pos.y)); setJumpOpen(true); }}><Navigation size={14} />JUMP</Button>}</header>
    <GameHud stepsRemaining={stepBalance} stepsExhausted={stepBalance === 0} credits={identity.credits ?? 0} currentLevel={identity.level ?? 1} registrationNumber={identity.registration_number} growthPoints={identity.growth_points ?? 0} subscriptionStatus={subscription} trialDaysRemaining={identity.first_launch_at ? Math.max(0, 14 - Math.floor((Date.now() - new Date(identity.first_launch_at).getTime()) / 86400000)) : identity.trial_end ? getDaysRemainingInTrial(identity.trial_end) : 14} onOpenProfile={() => { keys.current.clear(); setProfileOpen(true); }} onOpenDevMenu={() => { keys.current.clear(); setDevOpen(true); }} onOpenSupplies={() => { keys.current.clear(); setSuppliesOpen(true); }} />
    {userId && <SuppliesCard open={suppliesOpen} onClose={() => setSuppliesOpen(false)} userId={userId} steps={stepBalance} credits={identity.credits ?? 0} beforeBuy={() => stepLedger.current?.flush()} onBalances={(steps, credits) => { if (steps !== stepLedger.current?.balance) stepLedger.current?.refresh(steps); identityRef.current = { ...identityRef.current, steps_remaining: steps, credits }; setIdentity(row => ({ ...row, steps_remaining: steps, credits })); }} />}
    <ProfileOverlay isOpen={profileOpen} onClose={() => { setProfileOpen(false); void refreshCompleted(); }} worldUse={{ position: () => posRef.current, layer }} beforeDropUse={async () => { await stepLedger.current?.flush(); }} context="village" growthPoints={identity.growth_points ?? 0} socialStat={identity.social ?? 0} perceptionStat={identity.perception ?? 0} tradeStat={identity.trade ?? 0} />
    {dev && <DevMenu open={devOpen} onClose={() => setDevOpen(false)} userId={userId} home="world" onBeforeTopup={() => stepLedger.current?.flush()} onChanged={() => void refreshCompleted()} onBeforeStart={async () => { await stepLedger.current?.flush(); await discovery.current?.flush(true); discovery.current?.abandon(); presence.current?.dispose(); stepLedger.current?.discard(); }} />}
    {arrival && <LevelUpCard newLevel={arrival.newLevel} titleUnlocked={arrival.titleUnlocked} auraColor={identity.aura_color} orbDye={identity.orb_dye} registrationNumber={identity.registration_number} avatarBody={identity.avatar_body} home="world" onContinue={async () => {
      if (!userId) return;
      const { error } = await supabase.from('users').update({ title: arrival.title, levelup_pending: false, levelup_newlevel: 0, level: arrival.newLevel, social: (identityRef.current.social ?? 0) + 1 } as never).eq('id', userId);
      if (error) throw error;
      setArrival(null); await refreshCompleted();
    }} />}
    {heavyMessage && <p role="status" className="font-fell italic pointer-events-none fixed left-4 right-4 top-[25%] z-[var(--z-hud)] m-0 mx-auto max-w-[520px] break-words text-center text-xl leading-relaxed text-foreground">{HEAVY_LEGS}</p>}
    {dailyMessage && <p role="status" className="font-fell italic pointer-events-none fixed left-4 right-4 top-[18%] z-[var(--z-hud)] m-0 mx-auto max-w-[520px] break-words text-center text-xl leading-relaxed text-foreground">{dailyMessage}</p>}
    <Thumbstick onMove={move} disabled={suppliesOpen || profileOpen || devOpen || Boolean(arrival) || jumpOpen || mapOpen || npcCardOpen || (Boolean(placeCard) && !(placeCard && (isWorldConversation(placeCard) || isSignpost(placeCard))))} />
    {mapOpen && <WorldMap bits={discoveryBits} player={pos} layer={layer} aura={identity.aura_color} dev={identity.registration_number === 1} types={data.terrain} places={data.places} finds={finds} claimed={claimed} players={visitors} target={revealTarget && !finds.some(f => f.x === revealTarget.x && f.y === revealTarget.y && claimed.has(f.id)) ? revealTarget : null} onClose={() => setMapOpen(false)} />}
    {findCard && <div className="world-dialog-backdrop" data-game-ui="open"><section className="world-dialog world-place-card" role="dialog" aria-label={findCard.find.title}><Button variant="ghost" size="icon" className="world-dialog-close" aria-label="Close" onClick={() => setFindCard(null)}><X size={18} /></Button><FindCard key={findCard.find.id + String(findCard.reading)} find={findCard.find} reading={findCard.reading} at={() => posRef.current} onClaimed={markClaimed} onRewarded={() => void refreshReward()} onClose={() => setFindCard(null)} auraColor={identity.aura_color} orbDye={identity.orb_dye ?? null} registrationNumber={identity.registration_number} /></section></div>}
    {jumpOpen && <div className="world-dialog-backdrop" data-game-ui="open"><section className="world-dialog" role="dialog" aria-label="Jump to a place"><Button variant="ghost" size="icon" className="world-dialog-close" aria-label="Close jump menu" onClick={() => setJumpOpen(false)}><X size={18} /></Button><h2 className="font-cinzel">JUMP</h2><form onSubmit={e => { e.preventDefault(); const x = Number(jumpX), y = Number(jumpY); if (Number.isFinite(x) && Number.isFinite(y)) place({ x, y }, layer); }}><label className="font-mono">X<Input aria-label="Jump X" type="number" min={0} max={layerSize(layer) - 1} value={jumpX} onChange={e => setJumpX(e.target.value)} required /></label><label className="font-mono">Y<Input aria-label="Jump Y" type="number" min={0} max={layerSize(layer) - 1} value={jumpY} onChange={e => setJumpY(e.target.value)} required /></label><Button type="submit" className="world-jump">GO</Button></form><Button variant="outline" className="world-jump" onClick={() => place(startPoint(data), 0)}>RESTART AT START</Button>{jumpGroups.map(({ l, kind, items }) => <div key={`${l}-${kind}`} className="world-place-group"><h3 className="font-mono">{l === 1 ? 'UNDERGROUND · ' : 'SURFACE · '}{kind.replace(/_/g, ' ').toUpperCase()}</h3>{items.map((p, i) => <Button key={`${p.name}-${i}`} variant="ghost" onClick={() => place(p, l)}>{p.name}{p.maze_level ? ` · L${p.maze_level}` : ''}<span className="font-mono">{p.x},{p.y}</span></Button>)}</div>)}</section></div>}
    {userId && <MerchantOverlay open={Boolean(placeCard && placeAction(placeCard) === 'merchant')} onClose={() => setPlaceCard(null)} palette="green" title="The Merchant." openingLines={MERCHANT_LINES} userId={userId} credits={identity.credits ?? 0} onCreditsChange={credits => { identityRef.current = { ...identityRef.current, credits }; setIdentity(row => ({ ...row, credits })); }} items={merchantItems(level, 'world', async (qty = 1) => {
      const ledger = stepLedger.current;
      // Settle pending step spending first, but never let a stuck flush block the purchase.
      if (ledger) await Promise.race([ledger.flush().catch(() => undefined), new Promise(r => window.setTimeout(r, 4000))]);
      const { data, error } = await supabase.rpc('buy_steps', { p_packs: qty });
      if (error) throw error;
      const r = data as { ok?: boolean; reason?: string; packs?: number; cost?: number; credits?: number; steps_remaining?: number } | null;
      if (!r?.ok) return { failure: r?.reason === 'steps_full' ? 'Your steps are full.' : 'Not enough credits.' };
      const steps = Number(r.steps_remaining) || 0;
      const credits = Number(r.credits) || 0;
      ledger?.refresh(steps);
      identityRef.current = { ...identityRef.current, steps_remaining: steps, credits };
      setIdentity(row => ({ ...row, steps_remaining: steps, credits }));
      return { receipt: `+${(Number(r.packs) || qty) * 500} steps · −${Number(r.cost) || qty * 5} credits`, credits };
    })} />}
    {placeCard && cardAction !== 'merchant' && <div className="world-dialog-backdrop" data-game-ui="open" data-no-thumbstick><section className="world-dialog world-place-card" role="dialog" aria-label={placeCard.name}><Button variant="ghost" size="icon" className="world-dialog-close" aria-label="Close place" onClick={() => setPlaceCard(null)}><X size={18} /></Button>{placeCard.action === 'npc' && placeCard.npc_key && userId ? <SamCard key={placeCard.npc_key} userId={userId} npcKey={placeCard.npc_key} playerName={identity.username || 'Wanderer'} fallbackName={placeCard.name} onRewarded={() => void refreshReward()} /> : isSignpost(placeCard) ? <><h2 className="font-cinzel">Signpost</h2>{signpostLines(placeCard.notes).map((line, i) => <p key={i} className="font-fell">{line.dir === 'onward' ? '▶ ' : line.dir === 'back' ? '◀ ' : ''}{line.text}</p>)}</> : <><h2 className="font-cinzel">{placeCard.name}{placeCard.maze_level ? `, Level ${placeCard.maze_level}` : ''}</h2>{placeCard.notes && <p className="font-fell">{placeCard.notes}</p>}
      {outcome === 'completed' && <p className="font-mono">Completed</p>}
      {outcome === 'locked' && <p className="font-mono">Locked: reach Level {placeCard.maze_level} first</p>}
      {entryMessage && <p className="font-fell">{entryMessage}</p>}
      {(outcome === 'enter' || cardAction === 'door_maze') && button('ENTER', () => void openDoor('maze'))}
      {cardAction === 'door_library' && button('OPEN', () => void openDoor('library'))}
      {cardAction === 'door_exchange' && button('OPEN', () => void openDoor('exchange'))}
      {(cardAction === 'descend' || cardAction === 'ascend') && button('GO', () => { const target = placeCard; place({ x: Number(target.target_x), y: Number(target.target_y) }, Number(target.target_layer) === 1 ? 1 : 0); })}
      {cardAction === 'shadow' && button('ENTER', openShadow)}
      {isWorldConversation(placeCard) && <Button variant="outline" className="world-jump" onClick={() => setPlaceCard(null)}>Close</Button>}</>}
    </section></div>}
  </div>;
}
