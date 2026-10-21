import NpcOrb from '@/components/theme/objects/NpcOrb';
import GhostLayer from '@/components/theme/objects/GhostLayer';
import { corridorCell } from '@/lib/ghostMotion';
import { nearbyGhostLine, type GhostCell } from '@/lib/placedGhosts';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchOrCreateUser, updateUser } from '@/lib/userData';
import { useAuth } from '@/context/AuthContext';
import { getAllFlags, setFlag } from '@/lib/questFlags';
import { supabase } from '@/lib/supabase';
import { formatPrime } from '@/lib/format';
import { endRun } from '@/lib/runState';
import Thumbstick from '@/components/Thumbstick';
import PlayerAvatar, { orbLook } from '@/components/PlayerAvatar';
import { useOrbSync } from '@/lib/orb';
import { patternUri } from '@/lib/theme/patterns';
import { SHADOW } from '@/lib/theme/shadow';
import PlateFrame, { PlateCorners } from '@/components/theme/PlateFrame';
import PixelEye from '@/components/theme/PixelEye';
import FolderSlots from '@/components/theme/FolderSlots';
import GateScene, { DOOR_COLORS } from '@/components/theme/transition/GateScene';
import { TransitionFlash } from '@/components/theme/transition/DoorTransition';
import { useReducedMotion } from '@/components/theme/useReducedMotion';

const TRANSFER_EYE_MS = 800;
const TRANSFER_PRIME_MS = 1200;
const LEVEL_GATE_MS = 1400;
const NOTHING_MS = 1500;
const REDUCED_NAV_MS = 150;

const SHADOW_LANTERN_RADIUS_CELLS = 4;
const SHADOW_LANTERN_SOFT_CELLS = 2;
const SHADOW_FOG_OPACITY = 0.92;
const SHADOW_AVATAR_SIZE = 30;
const SHADOW_ENTRY_KEY = 'praem_shadow_entry';
const SHADOW_ENTRY_MAX_MS = 6 * 60 * 60 * 1000;

const STEP = 40; // matches Maze.tsx CELL

const ATMOSPHERE = [
  'You are between.',
  'The mathematics does not forget.',
  'Leave something permanent.',
  'She found this by accident.',
];

const GHOSTS: { left: string; top: string }[] = [
  { left: '30%', top: '40%' },
  { left: '65%', top: '35%' },
  { left: '45%', top: '70%' },
];

type RunFragment = {
  id: string;
  prime_number: number;
  level: number;
  image_data: string | null;
};

// ----- published shadow realm level data -----
type RealmCell = { col: number; row: number; type?: string; color?: string; name?: string; npc_key?: string; npc_name?: string; title?: string; line?: string; tone?: string };
type PlacedCell = { x: number; y: number; color?: string; name?: string; npc_key?: string; npc_name?: string };

const wallKey = (x: number, y: number): string => `${Math.round(x)},${Math.round(y)}`;

// GARDEN_DOOR — room key derived from the real current month,
// e.g. garden + season + month name ("gardenautumnseptember").
const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

import { GARDEN_LEVEL } from '@/lib/garden/gardenConfig';

const gardenRoomKey = (): string => {
  const month = new Date().getMonth();
  const season = month <= 1 || month === 11 ? 'winter' : month <= 4 ? 'spring' : month <= 7 ? 'summer' : 'autumn';
  return `garden${season}${MONTH_NAMES[month]}`;
};

/** Garden door opens on the 23rd; registration 1 can force it with localStorage praem_force_garden_open = '1'. */
export const isGardenOpen = (registrationNumber?: number | null): boolean => {
  if (registrationNumber === 1 && typeof window !== 'undefined' && window.localStorage.getItem('praem_force_garden_open') === '1') return true;
  return new Date().getDate() === 23;
};

const hasValidEntry = (): boolean => {
  try {
    const raw = sessionStorage.getItem(SHADOW_ENTRY_KEY);
    if (!raw) return false;
    const ts = Number((JSON.parse(raw) as { ts?: number }).ts);
    return Number.isFinite(ts) && Date.now() - ts <= SHADOW_ENTRY_MAX_MS;
  } catch {
    return false;
  }
};

const SHADOW_FOG_BG = `radial-gradient(circle at var(--lx) var(--ly), rgba(245,213,138,.08) 0, rgba(245,213,138,0) ${1.4 * STEP}px), radial-gradient(circle at var(--lx) var(--ly), rgba(${SHADOW.fogRgb},0) 0, rgba(${SHADOW.fogRgb},0) var(--r1), rgba(${SHADOW.fogRgb},calc(var(--fog) * .35)) calc(var(--r1) + (var(--r2) - var(--r1)) * .5), rgba(${SHADOW.fogRgb},var(--fog)) var(--r2))`;
const SHADOW_R1 = SHADOW_LANTERN_RADIUS_CELLS * STEP;
const SHADOW_R2 = SHADOW_R1 + SHADOW_LANTERN_SOFT_CELLS * STEP;

const ShadowEye = () => (
  <svg width={STEP} height={STEP} viewBox="0 0 48 48" shapeRendering="crispEdges" style={{ display: 'block' }}>
    <circle cx="24" cy="24" r="20" fill="#6fcf97" opacity=".12">
      <animate attributeName="opacity" values=".08;.22;.08" dur="3s" repeatCount="indefinite" />
    </circle>
    {[[18, 14, 12], [12, 18, 24], [8, 22, 32], [12, 26, 24], [18, 30, 12]].map(([x, y, w]) => (
      <rect key={`${x},${y}`} x={x} y={y} width={w} height={4} fill="#0f1612" stroke="#3a6a4c" />
    ))}
    <g>
      <animateTransform attributeName="transform" type="translate" values="0 0;3 0;0 0;-3 0;0 0" dur="6s" repeatCount="indefinite" />
      <rect x="20" y="20" width="8" height="8" fill="#9fe08a" />
      <rect x="22" y="22" width="4" height="4" fill="#0a120c" />
      <rect x="21" y="21" width="2" height="2" fill="#eaffd0" />
    </g>
  </svg>
);

const TransferCircle = () => (
  <svg width={120} height={120} viewBox="-60 -60 120 120" shapeRendering="crispEdges" style={{ display: 'block', overflow: 'visible' }}>
    <circle r="64" fill={SHADOW.glow} opacity=".07" />
    <circle r="44" fill={SHADOW.glow} opacity=".11">
      <animate attributeName="opacity" values=".07;.16;.07" dur="2.4s" repeatCount="indefinite" />
    </circle>
    <g>
      <animateTransform attributeName="transform" type="rotate" from="0" to="90" dur="12s" repeatCount="indefinite" />
      <path d="M0,-44 L44,0 L0,44 L-44,0 Z" fill="none" stroke={SHADOW.glow} strokeWidth="2" opacity=".5" />
      <path d="M0,-30 L30,0 L0,30 L-30,0 Z" fill="none" stroke={SHADOW.glow} strokeWidth="2" opacity=".85" />
    </g>
    <path d="M0,-16 L16,0 L0,16 L-16,0 Z" fill={SHADOW.glow} opacity=".55" />
    <rect x="-3" y="-3" width="6" height="6" fill="#e8fff0" />
    <g fill={SHADOW.glow} opacity=".7">
      <rect x="-1" y="-52" width="2" height="6" /><rect x="-1" y="46" width="2" height="6" />
      <rect x="46" y="-1" width="6" height="2" /><rect x="-52" y="-1" width="6" height="2" />
    </g>
    {[{ x: -10, d: '0s' }, { x: 9, d: '1.4s' }].map((m) => (
      <rect key={m.x} x={m.x} y="10" width="2" height="2" fill="#e8fff0">
        <animate attributeName="y" values="10;-40" dur="2.8s" begin={m.d} repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;1;0" dur="2.8s" begin={m.d} repeatCount="indefinite" />
      </rect>
    ))}
  </svg>
);

const GardenDoorTile = ({ open }: { open: boolean }) => (
  <svg width={STEP} height={STEP} viewBox="0 0 48 48" shapeRendering="crispEdges" style={{ display: 'block' }}>
    <rect x="4" y="0" width="40" height="48" fill="#1f2b27" stroke="#3e5249" />
    <rect x="12" y="0" width="24" height="48" fill="#031208" />
    {open ? (
      <>
        <rect x="10" y="0" width="28" height="48" fill={SHADOW.door} opacity=".14" />
        <rect x="16" y="0" width="16" height="48" fill={SHADOW.door} opacity=".38" />
        <rect x="20" y="0" width="8" height="48" fill="#a8ffc8" />
        <rect x="23" y="0" width="2" height="48" fill="#fff" opacity=".9" />
      </>
    ) : (
      <rect x="22" y="0" width="4" height="48" fill={SHADOW.doorDormant} opacity=".6" />
    )}
  </svg>
);

type WallRun = { x: number; y: number; w: number };

const ShadowRealm = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // ----- existing user row / flags wiring (kept) -----
  const [currentLevel, setCurrentLevel] = useState(1);
  const currentLevelRef = useRef(1);
  const [entryOk] = useState(hasValidEntry);
  const [registrationNumber, setRegistrationNumber] = useState<number | null>(null);
  const registrationRef = useRef<number | null>(null);
  const [auraColor, setAuraColor] = useState<string | null>(null);
  const [orbDye, setOrbDye] = useState<string | null>(null);
  useOrbSync(setAuraColor, setOrbDye);
  const [walking, setWalking] = useState(false);
  const walkingRef = useRef(false);
  const displayRef = useRef({ x: 0, y: 0 });
  const worldRef = useRef<HTMLDivElement>(null);
  const fogRef = useRef<HTMLDivElement>(null);
  const beaconRef = useRef<HTMLDivElement>(null);
  const edgeGlowRef = useRef<HTMLDivElement>(null);
  const [wallRuns, setWallRuns] = useState<WallRun[]>([]);
  const [wallShadows, setWallShadows] = useState<PlacedCell[]>([]);
  const [mapRect, setMapRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // ----- realm state -----
  const [atmoIndex, setAtmoIndex] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // offset from screen center, px
  const [authoredGhosts, setAuthoredGhosts] = useState<GhostCell[]>([]);
  const authoredGhostsRef = useRef<GhostCell[]>([]);
  const ghostCooldowns = useRef(new Map<string, number>());
  const [ghostMessage, setGhostMessage] = useState<string | null>(null);
  const ghostTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (ghostTimer.current) clearTimeout(ghostTimer.current); }, []);
  const posRef = useRef({ x: 0, y: 0 });
  const [runCount, setRunCount] = useState(0);

  // ----- transfer sequence state -----
  const [transferring, setTransferring] = useState(false);
  const transferringRef = useRef(false);
  const [overlayIn, setOverlayIn] = useState(false);
  const [eyeRy, setEyeRy] = useState(2);
  const [typed, setTyped] = useState('');
  const [currentPrime, setCurrentPrime] = useState<number | null>(null);
  const [primeVisible, setPrimeVisible] = useState(false);
  const [nothingMsg, setNothingMsg] = useState(false);
  const [doneMsg, setDoneMsg] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const runFragsRef = useRef<RunFragment[]>([]);
  const [libraryCount, setLibraryCount] = useState<number | null>(null);
  const [shownCount, setShownCount] = useState(0);
  const [nextLevel, setNextLevel] = useState<number | null>(null);
  const [levelFlash, setLevelFlash] = useState(false);
  const reducedMotion = useReducedMotion();
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;

  // Fallback transfer point: centered on screen, slightly above player start.
  const TRANSFER_OFFSET_Y = -120;

  // ----- published level data (graceful fallback when nothing published) -----
  const [hasLevelData, setHasLevelData] = useState(false);
  const [ghostZones, setGhostZones] = useState<PlacedCell[]>([]);
  const [eyes, setEyes] = useState<PlacedCell[]>([]);
  const [npcs, setNpcs] = useState<PlacedCell[]>([]);
  const [drops, setDrops] = useState<PlacedCell[]>([]);
  const [transferOffset, setTransferOffset] = useState({ x: 0, y: TRANSFER_OFFSET_Y });
  const transferOffsetRef = useRef({ x: 0, y: TRANSFER_OFFSET_Y });
  const wallSetRef = useRef<Set<string>>(new Set());
  const roomDoorsRef = useRef<PlacedCell[]>([]);
  const [roomDoors, setRoomDoors] = useState<PlacedCell[]>([]);
  const [gateMsg, setGateMsg] = useState<string | null>(null);
  const gateTimerRef = useRef<number | null>(null);

  const showGateMsg = useCallback((line: string) => {
    setGateMsg(line);
    if (gateTimerRef.current) window.clearTimeout(gateTimerRef.current);
    gateTimerRef.current = window.setTimeout(() => setGateMsg(null), 3000);
  }, []);

  // Entry guard: only a recent golden-door exit from the maze may open the realm.
  useEffect(() => {
    if (!entryOk) navigate('/village', { replace: true });
  }, [entryOk, navigate]);

  // Load the published shadow realm layout for the player's current level.
  useEffect(() => {
    if (!entryOk || authLoading || !user) return;
    let cancelled = false;
    (async () => {
      const level = currentLevelRef.current;
      const { data } = await supabase
        .from('special_locations' as never)
        .select('data')
        .eq('level_number', level)
        .eq('location_key', 'shadow_realm')
        .maybeSingle();
      if (cancelled || !data) return;

      const d = (data as { data?: { extraCells?: RealmCell[]; start?: { col: number; row: number } | null; gridSize?: number } })?.data;
      const cells = Array.isArray(d?.extraCells) ? d!.extraCells! : [];
      if (cells.length === 0) return;

      // Origin: the published start cell if present, else the first cell.
      const origin = d?.start && typeof d.start.col === 'number'
        ? { col: d.start.col, row: d.start.row }
        : { col: cells[0].col, row: cells[0].row };
      const toPx = (c: RealmCell): PlacedCell => ({
        x: (c.col - origin.col) * STEP,
        y: (c.row - origin.row) * STEP,
        color: c.color,
        name: c.name,
        npc_key: c.npc_key,
        npc_name: c.npc_name,
      });
      const authored = cells.filter(c => c.type === 'GHOST' && Number.isFinite(c.col) && Number.isFinite(c.row))
        .map(c => ({ ...c, type: 'GHOST' as const, col: c.col - origin.col, row: c.row - origin.row }));
      authoredGhostsRef.current = authored;
      setAuthoredGhosts(authored);

      const nextWalls: PlacedCell[] = [];
      const nextGhosts: PlacedCell[] = [];
      const nextEyes: PlacedCell[] = [];
      const nextNpcs: PlacedCell[] = [];
      const nextDrops: PlacedCell[] = [];
      const nextDoors: PlacedCell[] = [];
      let transfer: PlacedCell | null = null;

      cells.forEach((c) => {
        if (!c || typeof c.col !== 'number' || typeof c.row !== 'number') return;
        const p = toPx(c);
        switch (c.type) {
          case 'WALL': nextWalls.push(p); break;
          case 'GHOST_ZONE': nextGhosts.push(p); break;
          case 'EYE': nextEyes.push(p); break;
          case 'NPC': nextNpcs.push(p); break;
          case 'DROP': nextDrops.push(p); break;
          case 'GARDEN_DOOR': nextDoors.push(p); break;
          case 'TRANSFER_POINT': if (!transfer) transfer = p; break;
          default: break;
        }
      });

      // Merge consecutive wall cells per row into one background div; add a drop shadow
      // under walls whose lower neighbour is open.
      const wallCells = new Set(cells.filter((c) => c?.type === 'WALL').map((c) => `${c.col},${c.row}`));
      const maxCol = cells.reduce((m, c) => Math.max(m, c.col), 0);
      const maxRow = cells.reduce((m, c) => Math.max(m, c.row), 0);
      const gridN = Math.max(Number(d?.gridSize) || 0, maxCol + 1, maxRow + 1);
      const runs: WallRun[] = [];
      const shadows: PlacedCell[] = [];
      for (let r = 0; r < gridN; r++) {
        let c = 0;
        while (c < gridN) {
          if (!wallCells.has(`${c},${r}`)) { c++; continue; }
          const first = c;
          while (c < gridN && wallCells.has(`${c},${r}`)) {
            if (!wallCells.has(`${c},${r + 1}`)) shadows.push(toPx({ col: c, row: r }));
            c++;
          }
          const p = toPx({ col: first, row: r });
          runs.push({ x: p.x, y: p.y, w: (c - first) * STEP });
        }
      }

      if (cancelled) return;
      setWallRuns(runs);
      setWallShadows(shadows);
      setMapRect({ x: -origin.col * STEP, y: -origin.row * STEP, w: gridN * STEP, h: gridN * STEP });
      setGhostZones(nextGhosts);
      setEyes(nextEyes);
      setNpcs(nextNpcs);
      setDrops(nextDrops);
      setRoomDoors(nextDoors);
      roomDoorsRef.current = nextDoors;
      const nextWallSet = new Set(nextWalls.map((w) => wallKey(w.x, w.y)));
      wallSetRef.current = nextWallSet;

      // Published layouts can omit a start cell, making the arbitrary origin
      // land on a wall. Move the logical player to the nearest open grid cell.
      if (nextWallSet.has(wallKey(0, 0))) {
        let safeSpawn: { x: number; y: number } | null = null;
        for (let radius = 1; radius <= nextWalls.length + 1 && !safeSpawn; radius++) {
          for (let dy = -radius; dy <= radius && !safeSpawn; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
              const candidate = { x: dx * STEP, y: dy * STEP };
              if (!nextWallSet.has(wallKey(candidate.x, candidate.y))) {
                safeSpawn = candidate;
                break;
              }
            }
          }
        }
        if (safeSpawn) {
          posRef.current = safeSpawn;
          setPos(safeSpawn);
        }
      }
      if (transfer) {
        const t = transfer as PlacedCell;
        setTransferOffset({ x: t.x, y: t.y });
        transferOffsetRef.current = { x: t.x, y: t.y };
      }
      setHasLevelData(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, currentLevel]);


  useEffect(() => {
    if (!entryOk || authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    let cancelled = false;
    (async () => {
      const row = await fetchOrCreateUser(user.id);
      if (cancelled) return;
      await getAllFlags(user.id);
      if (cancelled) return;
      setCurrentLevel(row.level);
      currentLevelRef.current = row.level;
      setRegistrationNumber(row.registration_number);
      registrationRef.current = row.registration_number;
      setAuraColor(row.aura_color ?? null);
      setOrbDye((row as { orb_dye?: string | null }).orb_dye ?? null);
      setFlag(user.id, 'shadow_visited', 'true');

      const { data } = await supabase
        .from('fragments')
        .select('id, prime_number, level, image_data')
        .eq('user_id', user.id)
        .eq('banked', false);
      if (cancelled) return;
      setRunCount((data ?? []).length);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // atmosphere cycling
  useEffect(() => {
    const t = window.setInterval(() => {
      setAtmoIndex((i) => (i + 1) % ATMOSPHERE.length);
    }, 12000);
    return () => window.clearInterval(t);
  }, []);

  // ---------------- transfer sequence ----------------

  const persistTransfer = useCallback(async () => {
    if (!user) return false;
    const frags = runFragsRef.current;
    // Level-up guard: with nothing to bank, nothing is written and no level is gained.
    if (frags.length === 0) return true;
    try {
      const { error: updErr } = await supabase
        .from('fragments')
        .update({ banked: true })
        .eq('user_id', user.id)
        .eq('banked', false);
      if (updErr) throw updErr;

      if (frags.length > 0) {
        const rows = frags.map((f) => ({
          user_id: user.id,
          prime_number: f.prime_number,
          level: f.level,
          transferred_at: new Date().toISOString(),
          image_data: f.image_data,
        }));
        const { error: insErr } = await supabase
          .from('library')
          .upsert(rows, { onConflict: 'user_id,prime_number' });
        if (insErr) throw insErr;

        // Cleanup: keep one Folder row per prime by removing older banked duplicates.
        try {
          const { error: cleanErr } = await supabase
            .from('fragments')
            .delete()
            .eq('user_id', user.id)
            .eq('banked', true)
            .in('prime_number', frags.map((f) => f.prime_number))
            .not('id', 'in', `(${frags.map((f) => f.id).join(',')})`);
          if (cleanErr) console.error('[ShadowRealm] duplicate cleanup failed', cleanErr);
        } catch (cleanErr) {
          console.error('[ShadowRealm] duplicate cleanup failed', cleanErr);
        }
      }

      await updateUser(user.id, {
        maze_completed_level: currentLevelRef.current,
        level: currentLevelRef.current + 1,
        levelup_pending: true,
        levelup_newlevel: currentLevelRef.current + 1,
      });
      endRun();
      sessionStorage.removeItem('visited_shadow_this_run');
      sessionStorage.removeItem(SHADOW_ENTRY_KEY);
      return true;
    } catch (e) {
      console.error('[ShadowRealm] transfer failed', e);
      return false;
    }
  }, [user]);

  // Bank first: snapshot the unbanked fragments and persist before any animation,
  // so leaving mid-sequence can no longer lose the transfer. A retry that finds
  // nothing unbanked reuses the earlier snapshot (the writes are idempotent).
  const bankFirst = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    const { data, error: fetchErr } = await supabase
      .from('fragments')
      .select('id, prime_number, level, image_data')
      .eq('user_id', user.id)
      .eq('banked', false)
      .order('prime_number', { ascending: true });
    if (fetchErr) return false;
    const frags = (data ?? []) as RunFragment[];
    if (frags.length > 0 || runFragsRef.current.length === 0) runFragsRef.current = frags;
    return persistTransfer();
  }, [user, persistTransfer]);

  const playPrimes = useCallback(async (frags: RunFragment[]) => {
    const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
    for (const f of frags) {
      setCurrentPrime(f.prime_number);
      setPrimeVisible(false);
      await wait(20);
      setPrimeVisible(true);
      setShownCount((n) => n + 1);
      await wait(reducedRef.current ? 0 : TRANSFER_PRIME_MS - 320);
      setPrimeVisible(false);
      await wait(reducedRef.current ? 0 : 300);
    }
  }, []);

  // Display-only sequence after the save succeeded.
  const playAfterBank = useCallback(() => {
    const frags = runFragsRef.current;
    const reduced = reducedRef.current;
    const line = 'Your fragments pass into the permanent record.';
    const after = async () => {
      if (frags.length === 0) {
        setNothingMsg(true);
        window.setTimeout(() => navigate('/village'), reduced ? REDUCED_NAV_MS : NOTHING_MS);
        return;
      }
      setRunCount(0);
      await playPrimes(frags);
      setDoneMsg(true);
      setNextLevel(currentLevelRef.current + 1);
      window.setTimeout(() => setLevelFlash(true), reduced ? 0 : 700);
      window.setTimeout(() => navigate('/village'), reduced ? REDUCED_NAV_MS : LEVEL_GATE_MS);
    };
    if (reduced) { setTyped(line); void after(); return; }
    let i = 0;
    const tick = () => {
      i += 1;
      setTyped(line.slice(0, i));
      if (i < line.length) { window.setTimeout(tick, 35); return; }
      window.setTimeout(() => void after(), 400);
    };
    window.setTimeout(tick, TRANSFER_EYE_MS);
  }, [navigate, playPrimes]);

  const finish = useCallback(async () => {
    setSaving(true);
    setError(false);
    const ok = await bankFirst();
    setSaving(false);
    if (!ok) { setError(true); return; }
    // Presentation-only read after saving; count failures cannot fail the transfer.
    if (user && runFragsRef.current.length > 0) {
      void (async () => {
        try {
          const { count, error: countError } = await supabase
            .from('library')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);
          if (!countError && count !== null) setLibraryCount(count);
        } catch { /* Hide unknown totals without interrupting the level gate. */ }
      })();
    }
    playAfterBank();
  }, [bankFirst, playAfterBank, user]);

  const transferStartedRef = useRef(false);
  const startTransfer = useCallback(() => {
    if (transferStartedRef.current || transferringRef.current || !user) return;
    transferStartedRef.current = true;
    transferringRef.current = true;
    setTransferring(true);
    requestAnimationFrame(() => setOverlayIn(true));

    const start = performance.now();
    const animateEye = (t: number) => {
      const p = Math.min(1, (t - start) / 800);
      const eased = 1 - Math.pow(1 - p, 3);
      setEyeRy(2 + (30 - 2) * eased);
      if (p < 1) requestAnimationFrame(animateEye);
    };
    requestAnimationFrame(animateEye);
    void finish();
  }, [user, finish]);

  // ---------------- movement ----------------

  const move = useCallback(
    (dx: number, dy: number) => {
      if (transferringRef.current) return;
      const next = { x: posRef.current.x + dx * STEP, y: posRef.current.y + dy * STEP };
      // Walls from the published layout block movement.
      if (wallSetRef.current.has(wallKey(next.x, next.y))) return;
      posRef.current = next;
      setPos(next);
      const ghostLine = nearbyGhostLine(authoredGhostsRef.current, next.x / STEP, next.y / STEP, ghostCooldowns.current);
      if (ghostLine) {
        setGhostMessage(ghostLine);
        if (ghostTimer.current) clearTimeout(ghostTimer.current);
        ghostTimer.current = setTimeout(() => setGhostMessage(null), 4000);
      }

      const t = transferOffsetRef.current;
      const dist = Math.hypot(next.x - t.x, next.y - t.y);
      if (dist <= STEP) startTransfer();

      // GARDEN_DOOR — only opens on the 23rd of any month; the room is
      // derived from the real current month.
      const door = roomDoorsRef.current.find((d) => d.x === next.x && d.y === next.y);
      if (door) {
        if (isGardenOpen(registrationRef.current)) {
          navigate(`/room/${GARDEN_LEVEL}/${gardenRoomKey()}`);
        } else {
          showGateMsg('This does not open yet.');
        }
      }
    },
    [startTransfer, navigate, showGateMsg],
  );


  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); move(0, -1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); move(0, 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1, 0); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); move(1, 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);

  const gardenOpen = isGardenOpen(registrationNumber);
  const gardenOpenRef = useRef(gardenOpen);
  gardenOpenRef.current = gardenOpen;

  // One rAF loop eases the camera, then writes world transform, lantern centre,
  // and the garden beacon / edge glow through refs (no per-frame React state).
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = posRef.current;
      const d = displayRef.current;
      const dx = t.x - d.x;
      const dy = t.y - d.y;
      const moving = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
      displayRef.current = moving ? { x: d.x + dx * 0.18, y: d.y + dy * 0.18 } : { x: t.x, y: t.y };
      if (moving !== walkingRef.current) { walkingRef.current = moving; setWalking(moving); }
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const cam = displayRef.current;
      if (worldRef.current) worldRef.current.style.transform = `translate(${-cam.x}px, ${-cam.y}px)`;
      if (fogRef.current) {
        fogRef.current.style.setProperty('--lx', `${cx}px`);
        fogRef.current.style.setProperty('--ly', `${cy}px`);
      }
      const door = roomDoorsRef.current[0];
      const beacon = beaconRef.current;
      const edge = edgeGlowRef.current;
      if (door && gardenOpenRef.current) {
        const sx = cx + door.x - cam.x;
        const sy = cy + door.y - cam.y;
        const W = window.innerWidth, H = window.innerHeight;
        if (beacon) { beacon.style.display = 'block'; beacon.style.transform = `translate(${sx}px, ${sy}px)`; }
        const off = sx < 0 || sx > W || sy < 0 || sy > H;
        if (edge) {
          edge.style.display = off ? 'block' : 'none';
          if (off) edge.style.transform = `translate(${Math.min(W, Math.max(0, sx))}px, ${Math.min(H, Math.max(0, sy))}px)`;
        }
      } else {
        if (beacon) beacon.style.display = 'none';
        if (edge) edge.style.display = 'none';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const ghostDelays = useMemo(() => ghostZones.map(() => `${(Math.random() * 1.3).toFixed(2)}s`), [ghostZones]);
  const palette = orbLook(auraColor, orbDye, registrationNumber);
  const floorUri = useMemo(() => patternUri('floor', 'shadow', SHADOW.seam), []);
  const wallUri = useMemo(() => patternUri('wall', 'shadow', SHADOW.seam), []);
  const ghostFree = useCallback((col: number, row: number) => {
    const x = col * STEP, y = row * STEP;
    return !wallSetRef.current.has(wallKey(x, y)) && (!mapRect || (x >= mapRect.x && y >= mapRect.y && x < mapRect.x + mapRect.w && y < mapRect.y + mapRect.h));
  }, [mapRect]);
  const ghostPath = useCallback((col: number, row: number) => corridorCell(col, row, ghostFree), [ghostFree]);
  const cellAt = (p: { x: number; y: number }, w = STEP, h = STEP): CSSProperties => ({
    position: 'absolute', left: '50%', top: '50%', width: w, height: h,
    marginLeft: -w / 2 + p.x, marginTop: -h / 2 + p.y, pointerEvents: 'none',
  });

  if (!entryOk) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0f0d', overflow: 'hidden' }}>
      {/* World container — eased camera written through a ref */}
      <div ref={worldRef} style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        {mapRect && (
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            marginLeft: mapRect.x - STEP / 2, marginTop: mapRect.y - STEP / 2,
            width: mapRect.w, height: mapRect.h,
            backgroundImage: floorUri, backgroundSize: `${STEP}px ${STEP}px`, imageRendering: 'pixelated', pointerEvents: 'none',
          }} />
        )}
        {!hasLevelData && <div style={{ ...cellAt({ x: 0, y: 0 }, 31 * STEP, 31 * STEP), backgroundImage: floorUri, backgroundSize: `${STEP}px ${STEP}px` }} />}

        {wallShadows.map((w, i) => (
          <div key={`ws${i}`} style={{ ...cellAt({ x: w.x, y: w.y + STEP / 2 + 5 }, STEP, 10), background: 'rgba(0,0,0,.4)' }} />
        ))}
        {wallRuns.map((r, i) => (
          <div key={`w${i}`} style={{
            position: 'absolute', left: '50%', top: '50%', width: r.w, height: STEP,
            marginLeft: -STEP / 2 + r.x, marginTop: -STEP / 2 + r.y,
            backgroundImage: wallUri, backgroundSize: `${STEP}px ${STEP}px`, imageRendering: 'pixelated', pointerEvents: 'none',
          }} />
        ))}

        {ghostZones.map((g, i) => (
          <div key={`g${i}`} style={{
            ...cellAt(g),
            background: 'repeating-linear-gradient(0deg, rgba(184,172,220,.22) 0 1px, transparent 1px 4px), rgba(140,127,191,.10)',
            animation: 'shadowGhostFlicker 1.3s steps(4) infinite',
            animationDelay: ghostDelays[i],
          }} />
        ))}

        {eyes.map((e, i) => <div key={`e${i}`} style={cellAt(e)}><ShadowEye /></div>)}

        {npcs.map((n, i) => <div key={`n${i}`} style={cellAt(n, 0, 0)}><NpcOrb npc={n.npc_key || n.npc_name || n.name || ''} /></div>)}
        <div style={cellAt({ x: 0, y: 0 }, 0, 0)}><GhostLayer ghosts={authoredGhosts} size={SHADOW_AVATAR_SIZE} cellSize={STEP} offset={0} free={ghostFree} path={ghostPath} player={() => ({ col: posRef.current.x / STEP, row: posRef.current.y / STEP })} /></div>
        {drops.map((d, i) => <div key={`d${i}`} style={{ ...cellAt(d, 6, 6), background: SHADOW.glow, opacity: 0.7 }} />)}

        {roomDoors.map((d, i) => <div key={`rd${i}`} style={cellAt(d)}><GardenDoorTile open={gardenOpen} /></div>)}

        <div style={cellAt(transferOffset, 120, 120)}><TransferCircle /></div>
      </div>

      {/* Player — fixed at screen centre; the world moves instead */}
      <div style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 30, pointerEvents: 'none' }}>
        <PlayerAvatar palette={palette} walking={walking} size={SHADOW_AVATAR_SIZE} />
      </div>

      {/* Lantern fog: above world, below beacon/HUD/overlays */}
      <div ref={fogRef} aria-hidden="true" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 40, background: SHADOW_FOG_BG,
        '--lx': '50vw', '--ly': '50vh', '--r1': `${SHADOW_R1}px`, '--r2': `${SHADOW_R2}px`, '--fog': SHADOW_FOG_OPACITY,
      } as CSSProperties} />

      {/* Garden door beacon — above the fog, positioned per frame through refs */}
      <div ref={beaconRef} aria-hidden="true" style={{ position: 'fixed', left: 0, top: 0, zIndex: 45, pointerEvents: 'none', display: 'none', willChange: 'transform' }}>
        <div style={{ position: 'absolute', left: -3 * STEP, top: -3 * STEP, width: 6 * STEP, height: 6 * STEP, borderRadius: '50%', background: `radial-gradient(circle, rgba(92,255,154,.22) 0, rgba(92,255,154,0) 70%)` }} />
        <div style={{ position: 'absolute', left: -STEP * 1.25, top: STEP / 2, width: STEP * 2.5, height: STEP * 2.5, clipPath: 'polygon(35% 0, 65% 0, 100% 100%, 0 100%)', background: `linear-gradient(rgba(92,255,154,1), rgba(92,255,154,0))`, opacity: 0.14, animation: 'shadowConePulse 2.2s ease-in-out infinite' }} />
        {[-8, 2, 10].map((x, i) => (
          <div key={x} style={{ position: 'absolute', left: x, top: 0, width: 2, height: 2, background: '#eafff2', animation: `shadowMote 2.6s linear ${i * 0.8}s infinite` }} />
        ))}
      </div>
      <div ref={edgeGlowRef} aria-hidden="true" style={{ position: 'fixed', left: -60, top: -60, width: 120, height: 120, borderRadius: '50%', zIndex: 45, pointerEvents: 'none', display: 'none', background: 'radial-gradient(circle, rgba(92,255,154,.35) 0, rgba(92,255,154,0) 70%)' }} />

      {/* Atmosphere */}
      <div className="font-fell italic" style={{ position: 'fixed', top: 24, left: 0, right: 0, textAlign: 'center', fontSize: 13, color: 'rgba(111,211,154,0.55)', pointerEvents: 'none', zIndex: 50 }}>
        {ATMOSPHERE[atmoIndex]}
      </div>

      {ghostMessage && <p className="ghost-proximity-whisper font-fell italic">{ghostMessage}</p>}
      {gateMsg && (
        <div className="font-fell italic" style={{ position: 'fixed', left: 0, right: 0, top: '38%', textAlign: 'center', fontSize: 16, color: 'rgba(111,211,154,0.8)', pointerEvents: 'none', animation: 'shadowFadeIn 400ms ease-out', zIndex: 50 }}>
          {gateMsg}
        </div>
      )}

      <Thumbstick onMove={(dc, dr) => move(dc, dr)} disabled={transferring} />

      {/* HUD */}
      <div className="font-mono" style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', borderTop: '1px solid rgba(111,211,154,0.15)', background: 'rgba(6,10,8,0.92)', fontSize: 11, letterSpacing: '0.18em', zIndex: 60,
      }}>
        <div style={{ color: SHADOW.glow }}>FRAGMENTS&nbsp;&nbsp;{runCount}</div>
        <div style={{ color: 'rgba(111,211,154,0.6)' }}>LEVEL&nbsp;&nbsp;{String(currentLevel).padStart(2, '0')}</div>
      </div>

      {transferring && (() => {
        const transferCount = runFragsRef.current.length;
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,10,8,.96)', opacity: overlayIn ? 1 : 0, transition: 'opacity 600ms ease-in', zIndex: 100, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', justifyContent: 'center', padding: 'max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))', overflowY: 'auto' }}>
            <PlateFrame tone="shadow" glow={SHADOW.glow} width="min(92vw, 340px)">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
                {error ? (
                  <>
                    <p className="font-fell italic" style={{ margin: 0, fontSize: 17, color: SHADOW.eye }}>The transfer failed. Try again.</p>
                    <button className="font-cinzel transition-btn transition-btn-primary" style={{ width: '100%' }} disabled={saving} onClick={() => void finish()}>RETRY</button>
                  </>
                ) : nothingMsg ? (
                  <p className="font-fell italic" style={{ margin: 0, fontSize: 17, color: SHADOW.eye }}>Nothing to transfer.</p>
                ) : (
                  <>
                    <PixelEye tone="green" animate size={128} />
                    <p className="font-fell italic" style={{ margin: 0, fontSize: 17, minHeight: 46, color: SHADOW.eye }}>{typed}</p>
                    <div style={{ position: 'relative', width: '100%', background: '#0f1612', border: '1px solid #26312e', padding: '12px 8px', minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', '--plate-gold': '#c8963a' } as CSSProperties}>
                      <PlateCorners />
                      <span className="font-cinzel" style={{ fontSize: 'clamp(40px, 14vw, 56px)', color: '#f5c060', opacity: primeVisible && currentPrime !== null ? 1 : 0, transition: 'opacity 300ms ease-out' }}>
                        {currentPrime === null ? '\u00a0' : formatPrime(currentPrime)}
                      </span>
                    </div>
                    {transferCount > 0 && (
                      <>
                        <FolderSlots total={Math.max(5, transferCount)} filled={Math.max(0, shownCount - 1)} revealed={shownCount > 0} />
                        <p className="font-mono" style={{ margin: 0, fontSize: 11, color: SHADOW.glow, letterSpacing: '0.12em' }}>Banking {shownCount} of {transferCount}</p>
                      </>
                    )}
                    {doneMsg && libraryCount !== null && <p className="font-mono" style={{ margin: 0, fontSize: 11, color: SHADOW.glow }}>Library {libraryCount}</p>}
                    {doneMsg && <p className="font-fell italic" style={{ margin: 0, fontSize: 16, color: SHADOW.eye, animation: 'shadowFadeIn 500ms ease-out' }}>The record is permanent now.</p>}
                  </>
                )}
              </div>
            </PlateFrame>
            {nextLevel !== null && doneMsg && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, pointerEvents: 'none' }}>
                <div className="font-cinzel" style={{ fontSize: 28, color: '#f5c060', letterSpacing: '0.12em' }}>LEVEL {nextLevel}</div>
                <GateScene kind="maze" open width="clamp(90px, 26vw, 120px)" />
              </div>
            )}
            <TransitionFlash color={DOOR_COLORS.maze} on={levelFlash} />
          </div>
        );
      })()}

      <style>{`
        @keyframes shadowGhostFlicker { 0%, 100% { opacity: .06; } 50% { opacity: .16; } }
        @keyframes shadowConePulse { 0%, 100% { opacity: .10; } 50% { opacity: .24; } }
        @keyframes shadowMote { 0% { transform: translateY(0); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(-60px); opacity: 0; } }
        @keyframes shadowFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default ShadowRealm;
