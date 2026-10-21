import NpcOrb from '@/components/theme/objects/NpcOrb';
import LoadingScreen, { useMinLoading } from '@/components/LoadingScreen';
import { type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PlayerAvatar, { paletteFromColor } from '@/components/PlayerAvatar';
import { useNavigate } from 'react-router-dom';
import FragmentOverlay from '@/components/FragmentOverlay';
import PaywallOverlay from '@/components/PaywallOverlay';
import { BETA_MODE } from '@/lib/config';
import { CONSOLE_ROOM_KEY, CONSOLE_ROOM_LEVEL } from '@/lib/console';
import { getAllFlags, getFlag } from '@/lib/questFlags';
import ProfileOverlay, { ProfileButton } from '@/components/ProfileOverlay';
import { fetchOrCreateUser, updateUser } from '@/lib/userData';
import { waitForDailySteps } from '@/lib/dailySteps';
import { endRun, forfeitUnbanked, getActiveRun, markRunComplete, startRun, STRICT_FORFEIT } from '@/lib/runState';
import PlateFrame, { PlateCorners } from '@/components/theme/PlateFrame';
import PixelEye from '@/components/theme/PixelEye';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { generateFragmentImage } from '@/lib/fragmentImage';
import { loadLevelFromSupabase, type Dimension, type DoorToRoom } from '@/lib/levelLoader';
import Thumbstick from '@/components/Thumbstick';
import StepExchangeSheet from '@/components/StepExchangeSheet';
import WallTile from '@/components/theme/WallTile';
import FloorLayer from '@/components/theme/FloorLayer';
import PrimeGlowLayer from '@/components/theme/PrimeGlowLayer';
import { Gate, PrimeShard, Veil, RoomDoorTile, ConsoleDoorTile, DropCrate, StartPad, Pylon } from '@/components/theme/objects';
import { getThemeForLevel } from '@/lib/theme/themes';
import { DIMENSION_GLOW, mazeGlowForLevel } from '@/lib/theme/tokens';
import { pylonCells, visibleBounds } from '@/lib/theme/mazeRendering';
import type { VisualCell } from '@/lib/levelLoader';
import '@/components/theme/maze.css';

// TODO: restore to real walking steps via HealthKit for production.
const INITIAL_STEPS = 1000;
const CELL = 40;
// Lantern: clear radius around the player, widened by Perception; beyond it a dim (not black) fog.
const LANTERN_BASE_RADIUS_CELLS = 5;
const LANTERN_PERCEPTION_BONUS = 0.5;
const LANTERN_SOFT_CELLS = 2;
const FOG_OPACITY = 0.9;
const FOG_RGB = '8,10,24';
const lanternRadii = (perception: number) => {
  const r1 = (LANTERN_BASE_RADIUS_CELLS + Math.min(3, Math.max(0, perception) * LANTERN_PERCEPTION_BONUS)) * CELL;
  return { r1, r2: r1 + LANTERN_SOFT_CELLS * CELL };
};
const LANTERN_BG = `radial-gradient(circle at var(--lx) var(--ly), rgba(245,213,138,.08) 0, rgba(245,213,138,0) ${1.4 * CELL}px), radial-gradient(circle at var(--lx) var(--ly), rgba(${FOG_RGB},0) 0, rgba(${FOG_RGB},0) var(--r1), rgba(${FOG_RGB},calc(var(--fog) * .35)) calc(var(--r1) + (var(--r2) - var(--r1)) * .5), rgba(${FOG_RGB},var(--fog)) var(--r2))`;

// HUD bar reserves enough height for the two-line state ("tap to exchange"
// sub-label) at all times, so its height never shifts with content.
const HUD_HEIGHT = 60;
// Buttons sit above the HUD with a fixed gap; spacing between them preserved.
const HUD_BUTTON_GAP = 12;

type Cell = { col: number; row: number };
type FragmentDef = Cell & { prime: number };
type EggDef = Cell & { line: string };
type UserFragmentRow = { prime_number: number; banked: boolean | null; level: number | null };

type LevelConfig = {
  cols: number;
  rows: number;
  spawn: Cell;
  openSet: Set<string>;
  specialSet: Set<string>;
  fragments: FragmentDef[];
  door: Cell;
  creditDoors: Cell[];
  eggs: EggDef[];
  alexandra?: Cell;
  claire?: Cell;
  fragmentsRequired: number;
  doorsToRoom?: DoorToRoom[];
  veilSet?: Set<string>;
  theme?: string;
  visualCells?: VisualCell[];
};

// =================== LEVEL 1 — corrected corridor layout ===================
const LEVEL1_HINTS: Cell[] = [
  { col: 8, row: 26 },
  { col: 24, row: 8 },
  { col: 26, row: 22 },
  { col: 14, row: 26 },
];

const buildLevel1 = (): LevelConfig => {
  const COLS = 30;
  const ROWS = 30;
  const open = new Set<string>();
  const carve = (c: number, r: number) => {
    if (c >= 0 && c < COLS && r >= 0 && r < ROWS) open.add(`${c},${r}`);
  };
  const hCorr = (r: number, c1: number, c2: number) => { for (let c = c1; c <= c2; c++) carve(c, r); };
  const vCorr = (c: number, r1: number, r2: number) => { for (let r = r1; r <= r2; r++) carve(c, r); };
  const carveRect = (c1: number, c2: number, r1: number, r2: number) => {
    for (let c = c1; c <= c2; c++) for (let r = r1; r <= r2; r++) carve(c, r);
  };

  // Horizontal corridors
  hCorr(2, 1, 28);
  hCorr(6, 1, 13); hCorr(6, 15, 28);
  hCorr(8, 6, 22);
  hCorr(10, 1, 13); hCorr(10, 15, 28);
  hCorr(12, 8, 20);
  hCorr(14, 1, 28);
  hCorr(16, 8, 20);
  hCorr(18, 1, 13); hCorr(18, 15, 28);
  hCorr(20, 6, 22);
  hCorr(24, 1, 28);
  hCorr(26, 6, 10); hCorr(26, 12, 16); hCorr(26, 22, 26);
  hCorr(27, 1, 28);

  // Vertical corridors
  vCorr(4, 2, 13);
  vCorr(8, 6, 10); vCorr(8, 8, 20);
  vCorr(10, 12, 16);
  vCorr(12, 8, 20);
  vCorr(14, 1, 28);
  vCorr(15, 1, 3);
  vCorr(16, 12, 16);
  vCorr(18, 6, 10); vCorr(18, 8, 20);
  vCorr(20, 12, 16);
  vCorr(24, 2, 13); vCorr(24, 24, 28);
  vCorr(25, 2, 6);
  vCorr(28, 24, 28);

  // Pockets
  carveRect(1, 4, 3, 3);
  carveRect(23, 27, 4, 4);
  carveRect(1, 3, 14, 14);
  carveRect(24, 28, 25, 25);
  carveRect(1, 4, 24, 24);
  carveRect(24, 28, 27, 27);

  const fragments: FragmentDef[] = [
    { col: 4, row: 3, prime: 23 },
    { col: 25, row: 4, prime: 47 },
    { col: 15, row: 2, prime: 89 },
    { col: 3, row: 24, prime: 139 },
    { col: 26, row: 25, prime: 211 },
  ];
  const door: Cell = { col: 27, row: 27 };
  const creditDoors: Cell[] = [{ col: 2, row: 14 }];

  // Force special cells open
  fragments.forEach((f) => carve(f.col, f.row));
  carve(door.col, door.row);
  creditDoors.forEach((d) => carve(d.col, d.row));
  LEVEL1_HINTS.forEach((h) => carve(h.col, h.row));

  const special = new Set<string>();
  fragments.forEach((f) => special.add(`${f.col},${f.row}`));
  special.add(`${door.col},${door.row}`);
  creditDoors.forEach((d) => special.add(`${d.col},${d.row}`));
  LEVEL1_HINTS.forEach((h) => special.add(`${h.col},${h.row}`));

  return {
    cols: COLS, rows: ROWS,
    spawn: { col: 14, row: 14 },
    openSet: open, specialSet: special,
    fragments, door, creditDoors, eggs: [],
    fragmentsRequired: 5,
    veilSet: new Set(),
  };
};

const LEVEL1_CONFIG_CACHED = buildLevel1();
const LEVEL1_WALL_SET = (() => {
  const s = new Set<string>();
  for (let r = 0; r < 30; r++) for (let c = 0; c < 30; c++) {
    const k = `${c},${r}`;
    if (!LEVEL1_CONFIG_CACHED.openSet.has(k)) s.add(k);
  }
  return s;
})();

// =================== LEVEL 2 ===================
// Single source of truth: explicit list of wall cells. Used for BOTH render and collision.
// Special cell positions — must NOT be walls. Kept in sync with buildLevel2() below.
const LEVEL2_SPECIAL_POSITIONS: Array<[number, number]> = (() => {
  const base: Array<[number, number]> = [
    // fragments
    [15, 20], [110, 15], [35, 65], [120, 60], [20, 120], [95, 130], [135, 140],
    // golden door
    [145, 145],
    // credit doors
    [140, 20], [10, 110],
    // alexandra, claire
    [55, 72], [120, 125],
  ];
  // Spawn corridors — guarantee path from spawn (5,5) into the maze
  for (let r = 1; r <= 20; r++) base.push([5, r]);
  for (let c = 1; c <= 20; c++) base.push([c, 5]);
  return base;
})();

const buildLevel2Walls = (): Cell[] => {
  const COLS = 150;
  const ROWS = 150;
  const set = new Set<string>();

  // STEP 1 — Outer border
  for (let c = 0; c < COLS; c++) { set.add(`${c},0`); set.add(`${c},${ROWS - 1}`); }
  for (let r = 0; r < ROWS; r++) { set.add(`0,${r}`); set.add(`${COLS - 1},${r}`); }

  // STEP 2 — Fill all interior cells as walls
  for (let c = 1; c <= 148; c++) {
    for (let r = 1; r <= 148; r++) {
      set.add(`${c},${r}`);
    }
  }

  const carve = (c: number, r: number) => set.delete(`${c},${r}`);
  const carveRect = (c1: number, c2: number, r1: number, r2: number) => {
    for (let c = c1; c <= c2; c++) for (let r = r1; r <= r2; r++) carve(c, r);
  };

  // MAIN CROSS CORRIDORS
  for (let c = 1; c <= 148; c++) { carve(c, 74); carve(c, 75); }
  for (let r = 1; r <= 148; r++) { carve(74, r); carve(75, r); }

  // TOWN SQUARE 12×12
  carveRect(69, 80, 69, 80);

  // HORIZONTAL CORRIDORS — top half
  const hTopRows = [4, 12, 20, 28, 36, 44, 52, 60, 68];
  for (const r of hTopRows) {
    for (let c = 1; c <= 68; c++) carve(c, r);
    for (let c = 81; c <= 148; c++) carve(c, r);
  }
  // HORIZONTAL CORRIDORS — bottom half
  const hBotRows = [76, 84, 92, 100, 108, 116, 124, 132, 140, 148];
  for (const r of hBotRows) {
    for (let c = 1; c <= 68; c++) carve(c, r);
    for (let c = 81; c <= 148; c++) carve(c, r);
  }

  // VERTICAL CORRIDORS — left half
  const vLeftCols = [4, 12, 20, 28, 36, 44, 52, 60, 68];
  for (const c of vLeftCols) {
    for (let r = 1; r <= 68; r++) carve(c, r);
    for (let r = 81; r <= 148; r++) carve(c, r);
  }
  // VERTICAL CORRIDORS — right half
  const vRightCols = [76, 84, 92, 100, 108, 116, 124, 132, 140, 148];
  for (const c of vRightCols) {
    for (let r = 1; r <= 68; r++) carve(c, r);
    for (let r = 81; r <= 148; r++) carve(c, r);
  }

  // APPROACH CORRIDORS TO TOWN SQUARE (2 cells wide)
  carveRect(67, 68, 50, 68);
  carveRect(67, 68, 81, 100);
  carveRect(50, 68, 67, 68);
  carveRect(81, 100, 67, 68);
  carveRect(81, 82, 50, 68);
  carveRect(81, 82, 81, 100);
  carveRect(50, 68, 81, 82);
  carveRect(81, 100, 81, 82);

  // DEAD END BRANCHES
  carveRect(1, 6, 4, 4);
  carveRect(143, 148, 4, 4);
  carveRect(4, 4, 1, 6);
  carveRect(144, 144, 1, 6);
  carveRect(1, 6, 68, 68);
  carveRect(143, 148, 68, 68);
  carveRect(4, 4, 143, 148);
  carveRect(144, 144, 143, 148);
  carveRect(94, 94, 128, 140);

  // Ensure special cells are NEVER walls
  for (const [c, r] of LEVEL2_SPECIAL_POSITIONS) set.delete(`${c},${r}`);

  // Convert set → Cell[]
  const walls: Cell[] = [];
  set.forEach((k) => {
    const [cs, rs] = k.split(',');
    walls.push({ col: Number(cs), row: Number(rs) });
  });
  return walls;
};

// Module-level single source of truth for Level 2 walls — used for both rendering and collision.
const LEVEL2_WALLS: Cell[] = buildLevel2Walls();

const buildLevel2 = (): LevelConfig => {
  const COLS = 150;
  const ROWS = 150;

  const wallKeys = new Set(LEVEL2_WALLS.map((w) => `${w.col},${w.row}`));

  const fragments: FragmentDef[] = [
    { col: 15, row: 20, prime: 23 },
    { col: 110, row: 15, prime: 47 },
    { col: 35, row: 65, prime: 89 },
    { col: 120, row: 60, prime: 139 },
    { col: 20, row: 120, prime: 211 },
    { col: 95, row: 130, prime: 257 },
    { col: 135, row: 140, prime: 293 },
  ];
  const door: Cell = { col: 145, row: 145 };
  const creditDoors: Cell[] = [
    { col: 140, row: 20 },
    { col: 10, row: 110 },
  ];
  const alexandra: Cell = { col: 55, row: 72 };
  const claire: Cell = { col: 120, row: 125 };
  const eggs: EggDef[] = [
    { col: 30, row: 90, line: 'She went deeper. Follow the orange corridor.' },
    { col: 80, row: 100, line: 'The mathematics took her to the far corner.' },
    { col: 100, row: 110, line: 'You are getting closer. Do not lose the path.' },
    { col: 115, row: 120, line: 'She is near. She cannot find the way out alone.' },
  ];

  // Carve walls out of any key gameplay cell so they remain reachable.
  const carve = (c: number, r: number) => { wallKeys.delete(`${c},${r}`); };
  carve(5, 5);
  fragments.forEach((f) => carve(f.col, f.row));
  carve(door.col, door.row);
  creditDoors.forEach((d) => carve(d.col, d.row));
  carve(alexandra.col, alexandra.row);
  carve(claire.col, claire.row);
  eggs.forEach((e) => carve(e.col, e.row));

  // openSet = every cell NOT in wallKeys (within border)
  const open = new Set<string>();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const k = `${c},${r}`;
      if (!wallKeys.has(k)) open.add(k);
    }
  }

  const special = new Set<string>();
  fragments.forEach((f) => special.add(`${f.col},${f.row}`));
  special.add(`${door.col},${door.row}`);
  creditDoors.forEach((d) => special.add(`${d.col},${d.row}`));

  return {
    cols: COLS, rows: ROWS,
    spawn: { col: 5, row: 5 },
    openSet: open, specialSet: special,
    fragments, door, creditDoors, eggs,
    alexandra, claire,
    fragmentsRequired: 7,
    veilSet: new Set(),
  };
};

const QUOTES = [
  'Navigate.',
  'The spiral remembers.',
  'You are inside her instrument.',
  'Find the fragments.',
  '89 is the center of everything.',
];

// ----- plated maze dialogs (Instrument format) -----
const BTN_BASE: CSSProperties = { minHeight: 44, flex: '1 1 120px', fontSize: 14, letterSpacing: '0.24em', cursor: 'pointer', padding: '10px 18px' };
const PRIMARY_BTN: CSSProperties = { ...BTN_BASE, background: '#c8963a', color: '#1a1448', border: 'none', borderTop: '3px solid #f5c060', borderBottom: '3px solid #8a6420' };
const SECONDARY_BTN: CSSProperties = { ...BTN_BASE, background: 'transparent', color: '#8e99d0', border: '1px solid #4a5385' };
const DANGER_BTN: CSSProperties = { ...BTN_BASE, background: '#a83a3a', color: '#fff', border: 'none', borderTop: '3px solid #c85a5a', borderBottom: '3px solid #6e1a1a' };

const MazeDialog = ({ glow, zIndex, children }: { glow: string; zIndex: number; children: ReactNode }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(14,18,40,0.94)', zIndex, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))', animation: 'mazeDoorFade 400ms ease-in' }}>
    <PlateFrame glow={glow} style={{ maxHeight: '100%', overflowY: 'auto' }}>{children}</PlateFrame>
  </div>
);

const DialogButtons = ({ children }: { children: ReactNode }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>{children}</div>
);

const ShardPlate = ({ filled, caption }: { filled: boolean[]; caption?: string }) => (
  <div style={{ position: 'relative', marginTop: 16, background: '#0f1329', border: '1px solid #2f3560', padding: '12px 10px' }}>
    <PlateCorners />
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
      {filled.map((on, i) => (
        <span key={i} aria-hidden="true" style={{ width: 12, height: 18, clipPath: on ? 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' : undefined, background: on ? '#b79bff' : 'transparent', outline: on ? undefined : '1.5px dashed #f5c060', outlineOffset: -2 }} />
      ))}
    </div>
    {caption && <p className="font-mono" style={{ margin: '10px 0 0', fontSize: 11, color: '#8e99d0', textAlign: 'center', letterSpacing: '0.12em' }}>{caption}</p>}
  </div>
);

const Maze = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Current position (level + dimension) is sourced ONLY from the users row.
  // Structured as a single object so future fields (era/time) can be added without rework.
  const [position, setPosition] = useState<{ level: number; dimension: Dimension } | null>(null);
  const currentLevel = position?.level ?? 1;
  const currentLevelRef = useRef(1);
  const [levelLoaded, setLevelLoaded] = useState(false);
  const [credits, setCredits] = useState(50);
  const [auraColor, setAuraColor] = useState<string>('#5b4fd4');
  const [registrationNumber, setRegistrationNumber] = useState<number | null>(null);
  const registrationNumberRef = useRef(0);
  const [doorConfirmOpen, setDoorConfirmOpen] = useState(false);
  const [insufficientFragmentsOpen, setInsufficientFragmentsOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const profileOpenRef = useRef(false);
  const [profileOpenDisplay, setProfileOpenDisplay] = useState(false);
  const openProfile = useCallback(() => { profileOpenRef.current = true; setProfileOpenDisplay(true); }, []);
  const closeProfile = useCallback(() => { profileOpenRef.current = false; setProfileOpenDisplay(false); }, []);

  // Capture the room return before config initialization consumes its coordinates.
  const roomReturnRef = useRef(Boolean(sessionStorage.getItem('praem_maze_return_col')));
  const runResumeRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  useEffect(() => { userIdRef.current = user?.id ?? null; }, [user]);
  const leavingRef = useRef(false);
  const fragmentWritesRef = useRef(new Set<Promise<void>>());
  const leaveMaze = useCallback(async () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    stepsReadyRef.current = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const uid = userIdRef.current;
    if (uid) {
      await Promise.race([
        (async () => {
          await Promise.allSettled([...fragmentWritesRef.current]);
          return forfeitUnbanked(uid);
        })(),
        new Promise<boolean>((resolve) => {
          timeout = setTimeout(() => {
            console.error('[Maze] fragment forfeiture timed out');
            resolve(false);
          }, 1500);
        }),
      ]);
    }
    if (timeout !== undefined) clearTimeout(timeout);
    endRun();
    sessionStorage.removeItem('praem_maze_return_col');
    sessionStorage.removeItem('praem_maze_return_row');
    window.dispatchEvent(new Event('praem:exit-maze-to-village'));
    navigate('/village');
  }, [navigate]);

  // Subscription status from the users row + quest flags gate the paywall moment.
  const subStatusRef = useRef<string>('trial');
  const SUBBED = ['active', 'lifetime', 'dev', 'beta'];
  useEffect(() => {
    const handler = () => {
      if (BETA_MODE) return;
      const bernard06 = Number(getFlag('bernard_stage') ?? 0) >= 6;
      if (bernard06 && !SUBBED.includes(subStatusRef.current)) {
        setPaywallOpen(true);
      }
    };
    window.addEventListener('praem:open-paywall', handler);
    return () => window.removeEventListener('praem:open-paywall', handler);
  }, []);

  // Dimension is part of position; default 'purple'. Kept here pending dimension column.
  const dimension: Dimension = position?.dimension ?? 'purple';
  // Rendering-only glow colour per level; the gameplay dimension above is unchanged.
  const glow: Dimension = mazeGlowForLevel(currentLevel);

  // Level config — loaded async from Supabase `levels` table, with buildLevel1 fallback.
  // Guarded: do NOT load until the user row (position) has resolved.
  const [config, setConfig] = useState<LevelConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  useEffect(() => {
    if (!position) return;
    let cancelled = false;
    setConfigLoading(true);
    (async () => {
      const loaded = await loadLevelFromSupabase(position.level, position.dimension);
      if (cancelled) return;
      if (loaded) {
        setConfig(loaded as LevelConfig);
      } else if (position.level === 1) {
        setConfig(buildLevel1());
      } else if (position.level === 2) {
        setConfig(buildLevel2());
      } else {
        setConfig(null);
      }
      setConfigLoading(false);
    })();
    return () => { cancelled = true; };
  }, [position]);

  // wallSet derived for rendering: a cell is visually a wall if not in openSet OR it is a veil.
  const wallSet = useMemo(() => {
    const s = new Set<string>();
    if (!config) return s;
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        const k = `${c},${r}`;
        if (!config.openSet.has(k) || config.veilSet?.has(k)) s.add(k);
      }
    }
    return s;
  }, [config]);

  // Refs so the rAF movement loop (registered once with empty deps) always reads current values
  // instead of stale closure values captured when config was still null.
  const configRef = useRef<LevelConfig | null>(null);
  const wallSetRef = useRef<Set<string>>(new Set());
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { wallSetRef.current = wallSet; }, [wallSet]);

  const isWall = (c: number, r: number) => {
    const cfg = configRef.current;
    if (!cfg) return true;
    if (c < 0 || c >= cfg.cols || r < 0 || r >= cfg.rows) return true;
    return !cfg.openSet.has(`${c},${r}`);
  };



  const [pos, setPos] = useState<Cell>({ col: 0, row: 0 });
  const posRef = useRef<Cell>({ col: 0, row: 0 });
  const [displayPos, setDisplayPos] = useState<Cell>({ col: 0, row: 0 });
  const displayPosRef = useRef<Cell>({ col: 0, row: 0 });
  const prevPosRef = useRef<Cell>({ col: 0, row: 0 });

  const eggsTriggeredRef = useRef<Set<string>>(new Set());
  // `collected` / collectedRef = RUN fragments (this visit, this level, banked=false).
  // bankedRef = all permanently-banked primes (across all levels). Doesn't satisfy doors.
  const [collected, setCollected] = useState<Set<number>>(new Set());
  const collectedRef = useRef<Set<number>>(new Set());
  const bankedRef = useRef<Set<number>>(new Set());
  const [userFragments, setUserFragments] = useState<UserFragmentRow[]>([]);

  const [stepsRemaining, setStepsRemaining] = useState(INITIAL_STEPS);
  const stepsRemainingRef = useRef(INITIAL_STEPS);
  const stepsReadyRef = useRef(false);

  const [whisper, setWhisper] = useState<string | null>(null);
  const [whisperColor, setWhisperColor] = useState<string>('rgba(160,140,200,0.85)');
  const whisperTimer = useRef<number | null>(null);

  const [quoteIdx, setQuoteIdx] = useState(0);
  const worldRef = useRef<HTMLDivElement>(null);
  const fogRef = useRef<HTMLDivElement>(null);
  const [perception, setPerception] = useState(0);
  const camRef = useRef({ x: 0, y: 0 });
  const heldKeysRef = useRef<Set<string>>(new Set());
  const lastMoveTimeRef = useRef(0);
  const moveCountRef = useRef(0);
  const [activeFragment, setActiveFragment] = useState<{ prime: number; index: number } | null>(null);

  // Alexandra / Claire state
  const [alexandraFound, setAlexandraFound] = useState(false);
  const alexandraFoundRef = useRef(false);
  const [alexandraVisible, setAlexandraVisible] = useState(true);
  const [whisperIndex, setWhisperIndex] = useState(0);
  const whisperIndexRef = useRef(0);
  const [claireFound, setClaireFound] = useState(false);
  const claireFoundRef = useRef(false);
  const [claireFollowing, setClaireFollowing] = useState(false);
  const claireFollowingRef = useRef(false);
  const [claireVisible, setClaireVisible] = useState(true);
  const [clairePos, setClairePos] = useState<Cell>({ col: 0, row: 0 });
  const clairePosRef = useRef<Cell>({ col: 0, row: 0 });
  const reunionDoneRef = useRef(false);

  // Init position when config arrives
  useEffect(() => {
    if (!config) return;
    let spawn = { ...config.spawn };
    if (typeof window !== 'undefined') {
      const rc = window.sessionStorage.getItem('praem_maze_return_col');
      const rr = window.sessionStorage.getItem('praem_maze_return_row');
      if (rc !== null && rr !== null) {
        const c = parseInt(rc, 10);
        const r = parseInt(rr, 10);
        if (!Number.isNaN(c) && !Number.isNaN(r)) spawn = { col: c, row: r };
        window.sessionStorage.removeItem('praem_maze_return_col');
        window.sessionStorage.removeItem('praem_maze_return_row');
      }
    }
    posRef.current = { ...spawn };
    displayPosRef.current = { ...spawn };
    prevPosRef.current = { ...spawn };
    setPos({ ...spawn });
    setDisplayPos({ ...spawn });
    if (typeof window !== 'undefined') {
      const initialCam = {
        x: window.innerWidth / 2 - (spawn.col * CELL + CELL / 2),
        y: window.innerHeight / 2 - (spawn.row * CELL + CELL / 2),
      };
      camRef.current = initialCam;
      if (worldRef.current) worldRef.current.style.transform = `translate(${initialCam.x}px, ${initialCam.y}px)`;
    }
    if (config.claire) {
      clairePosRef.current = { ...config.claire };
      setClairePos({ ...config.claire });
    }
    // reset character state per level
    alexandraFoundRef.current = false;
    setAlexandraFound(false);
    setAlexandraVisible(true);
    whisperIndexRef.current = 0;
    setWhisperIndex(0);
    claireFoundRef.current = false;
    setClaireFound(false);
    claireFollowingRef.current = false;
    setClaireFollowing(false);
    setClaireVisible(true);
    reunionDoneRef.current = false;
  }, [config]);

  // Restore unfinished run fragments for this exact level only. Banked fragments
  // and fragments saved against other levels do not satisfy the golden door.
  useEffect(() => {
    if (!config || !levelLoaded) return;
    const currentLevelPrimes = new Set(config.fragments.map((f) => f.prime));
    const restored = new Set<number>();
    userFragments.forEach((r) => {
      if (r.banked) return;
      if (Number(r.level) !== currentLevelRef.current) return;
      if (currentLevelPrimes.has(r.prime_number)) restored.add(r.prime_number);
    });
    collectedRef.current = restored;
    setCollected(restored);
  }, [config, levelLoaded, userFragments]);

  // If player spawns ON an uncollected fragment, collect it immediately.
  useEffect(() => {
    if (!config || !levelLoaded) return;
    const { col, row } = config.spawn;
    const fragIdx = config.fragments.findIndex((f) => f.col === col && f.row === row);
    if (fragIdx === -1) return;
    const frag = config.fragments[fragIdx];
    if (collectedRef.current.has(frag.prime)) return;
    const next = new Set(collectedRef.current);
    next.add(frag.prime);
    collectedRef.current = next;
    setCollected(next);
    setActiveFragment({ prime: frag.prime, index: fragIdx });
    if (user) {
      const write = (async () => {
        const { data: existing } = await supabase
          .from('fragments')
          .select('id')
          .eq('user_id', user.id)
          .eq('prime_number', frag.prime)
          .eq('level', currentLevelRef.current)
          .eq('banked', false)
          .limit(1);
        if (leavingRef.current || (existing && existing.length > 0)) return;
        const imageData = generateFragmentImage(frag.prime, registrationNumberRef.current);
        const { error } = await supabase.from('fragments').insert({
          user_id: user.id,
          prime_number: frag.prime,
          level: currentLevelRef.current,
          image_data: imageData,
          banked: false,
        });
        if (error) console.error('Failed to save fragment', error);
      })();
      fragmentWritesRef.current.add(write);
      void write.finally(() => fragmentWritesRef.current.delete(write));
    }
  }, [config, levelLoaded, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    let cancelled = false;
    stepsReadyRef.current = false;
    setLevelLoaded(false);
    (async () => {
      await waitForDailySteps(user.id);
      if (cancelled) return;
      const row = await fetchOrCreateUser(user.id);
      if (cancelled) return;
      subStatusRef.current = BETA_MODE ? 'active' : row.subscription_status ?? 'trial';
      await getAllFlags(user.id);
      if (cancelled) return;
      if (!BETA_MODE && Number(getFlag('bernard_stage') ?? 0) >= 6 && !SUBBED.includes(subStatusRef.current)) {
        window.dispatchEvent(new Event('praem:open-paywall'));
      }
      setPosition({ level: row.level, dimension: 'purple' });
      currentLevelRef.current = row.level;
      setCredits(row.credits);
      if (row.aura_color) setAuraColor(row.aura_color);
      setRegistrationNumber(row.registration_number);
      setPerception(Number((row as unknown as { perception?: number | null }).perception ?? 0));
      registrationNumberRef.current = row.registration_number;
      const startSteps = row.steps_remaining > 0 ? row.steps_remaining : INITIAL_STEPS;
      stepsRemainingRef.current = startSteps;
      setStepsRemaining(startSteps);
      if (row.steps_remaining <= 0) {
        updateUser(user.id, { steps_remaining: INITIAL_STEPS });
      }

      // Load ALL the user's fragments (no level filter) so the Folder reflects everything.
      // Split into banked (permanent, all levels) and unfinished run fragments for this level.
      const { data: existing, error: fragError } = await supabase
        .from('fragments')
        .select('prime_number, banked, level')
        .eq('user_id', user.id);
      if (fragError) console.error('Failed to load fragments', fragError);
      if (!cancelled && !leavingRef.current && Array.isArray(existing)) {
        const banked = new Set<number>();
        let storedRun = getActiveRun(user.id, row.level);
        if (storedRun?.completed) {
          const carried = (existing as UserFragmentRow[]).some((f) => f.banked === false && f.level === row.level);
          if (carried) {
            // The run already passed the golden door: finish banking in the Shadow Realm.
            sessionStorage.setItem('praem_shadow_entry', JSON.stringify({ level: row.level, ts: Date.now() }));
            navigate('/shadow', { replace: true });
            return;
          }
          endRun();
          storedRun = null;
        }
        const resume = roomReturnRef.current || Boolean(sessionStorage.getItem('praem_maze_return_col')) || (!STRICT_FORFEIT && Boolean(storedRun));
        runResumeRef.current = resume;
        let rows = existing as UserFragmentRow[];
        if (!resume) {
          await forfeitUnbanked(user.id);
          if (cancelled || leavingRef.current) return;
          rows = rows.filter((fragment) => fragment.banked !== false);
          startRun(user.id, row.level);
        } else if (!storedRun) {
          startRun(user.id, row.level);
        }
        roomReturnRef.current = false;
        rows.forEach((r) => {
          if (r.banked) banked.add(r.prime_number);
        });
        bankedRef.current = banked;
        setUserFragments(rows);
        // Run fragments are restored only for this exact level once config is ready.
        collectedRef.current = new Set<number>();
        setCollected(new Set<number>());
      }
      if (!cancelled && !leavingRef.current) {
        stepsReadyRef.current = true;
        setLevelLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [selectedCredits, setSelectedCredits] = useState(1);
  const [exchangeError, setExchangeError] = useState(false);
  const exchangeOpenRef = useRef(false);
  useEffect(() => { exchangeOpenRef.current = exchangeOpen; }, [exchangeOpen]);

  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const resize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  const theme = getThemeForLevel(currentLevel, config?.theme);
  const isFloor = useCallback((col: number, row: number) => config?.openSet.has(`${col},${row}`) ?? false, [config]);
  const pylons = useMemo(() => config ? pylonCells(config.cols, config.rows, wallSet, config.openSet) : new Set<string>(), [config, wallSet]);
  // Reuse the existing 400px camera margin, but recalculate only on a logical cell change/resize.
  const bounds = useMemo(() => visibleBounds(pos, viewport.width, viewport.height, CELL), [pos.col, pos.row, viewport]);
  const inView = (cell: Cell) => cell.col >= bounds.minCol && cell.col <= bounds.maxCol && cell.row >= bounds.minRow && cell.row <= bounds.maxRow;
  const visibleWalls = useMemo(() => {
    const cells: Cell[] = [];
    if (!config) return cells;
    for (let row = Math.max(0, bounds.minRow); row <= Math.min(config.rows - 1, bounds.maxRow); row++) {
      for (let col = Math.max(0, bounds.minCol); col <= Math.min(config.cols - 1, bounds.maxCol); col++) {
        if (wallSet.has(`${col},${row}`)) cells.push({ col, row });
      }
    }
    return cells;
  }, [config, wallSet, bounds]);
  const visibleObjects = useMemo(() => (config?.visualCells ?? []).filter(cell =>
    ['ROOM_DOOR', 'CONSOLE_DOOR', 'DROP_SPAWN', 'DROP', 'NPC'].includes(cell.type) &&
    !(cell.type === 'ROOM_DOOR' && config?.doorsToRoom?.some(door => door.col === cell.col && door.row === cell.row)) &&
    cell.col >= bounds.minCol && cell.col <= bounds.maxCol && cell.row >= bounds.minRow && cell.row <= bounds.maxRow
  ), [config, bounds]);

  const showWhisper = (text: string, color = 'rgba(160,140,200,0.85)', dur = 3000) => {
    setWhisper(text);
    setWhisperColor(color);
    if (whisperTimer.current) window.clearTimeout(whisperTimer.current);
    whisperTimer.current = window.setTimeout(() => setWhisper(null), dur);
  };

  // Whisper tiles from the loaded level, backed by the shared `whispers` table
  const whisperCellsRef = useRef<{ col: number; row: number }[]>([]);
  const whisperCellLastRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    const cells = (config as unknown as { whispers?: { col: number; row: number }[] } | null)?.whispers;
    whisperCellsRef.current = Array.isArray(cells)
      ? cells.filter((c) => c && typeof c.col === 'number' && typeof c.row === 'number')
      : [];
    whisperCellLastRef.current = new Map();
  }, [config]);

  const fetchRandomWhisper = async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('whispers' as never)
        .select('text')
        .order('random()' as never)
        .limit(1)
        .single();
      if (!error && data) return (data as { text?: string }).text ?? null;
      const { data: pool } = await supabase
        .from('whispers' as never)
        .select('text')
        .limit(100);
      const rows = (pool as { text?: string }[] | null) ?? [];
      if (rows.length === 0) return null;
      return rows[Math.floor(Math.random() * rows.length)]?.text ?? null;
    } catch {
      return null;
    }
  };

  const triggerTileWhisper = (col: number, row: number) => {
    const key = `${col},${row}`;
    const now = Date.now();
    const last = whisperCellLastRef.current.get(key) ?? 0;
    if (now - last <= 60000) return;
    whisperCellLastRef.current.set(key, now);
    void fetchRandomWhisper().then((text) => {
      if (text) showWhisper(text, 'rgba(160,140,200,0.85)', 3000);
    });
  };

  // Placement contents belong to the server; the existing lifecycle decides resume.
  type RunDrop = { name: string; kind: 'key' | 'drop' };
  const [runDrops, setRunDrops] = useState<Map<string, RunDrop>>(new Map());
  const runDropsRef = useRef<Map<string, RunDrop>>(new Map());
  const pendingDropClaimsRef = useRef(new Set<string>());
  const dropGenerationRef = useRef(0);
  useEffect(() => {
    const generation = ++dropGenerationRef.current;
    runDropsRef.current = new Map();
    setRunDrops(runDropsRef.current);
    pendingDropClaimsRef.current.clear();
    if (!config || !levelLoaded || !user) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await supabase.rpc('start_run_drops' as never, {
          p_level: currentLevelRef.current,
          p_resume: runResumeRef.current,
        } as never);
        if (cancelled || leavingRef.current || generation !== dropGenerationRef.current || error || !Array.isArray(data)) return;
        const points = new Set((config.visualCells ?? []).filter(c => c.type === 'DROP_SPAWN' || c.type === 'DROP').map(c => `${c.col},${c.row}`));
        const placements = new Map<string, RunDrop>();
        for (const item of data as Array<RunDrop & Cell>) {
          if (!item || !Number.isFinite(item.col) || !Number.isFinite(item.row) || typeof item.name !== 'string' || (item.kind !== 'key' && item.kind !== 'drop')) continue;
          const key = `${item.col},${item.row}`;
          if (points.has(key)) placements.set(key, { name: item.name, kind: item.kind });
        }
        runDropsRef.current = placements;
        setRunDrops(placements);
      } catch { /* no placements; maze loading and movement stay independent */ }
    })();
    return () => { cancelled = true; };
  }, [config, levelLoaded, user]);

  const claimRunDrop = (col: number, row: number) => {
    const key = `${col},${row}`;
    if (!userIdRef.current || !runDropsRef.current.has(key) || pendingDropClaimsRef.current.has(key)) return;
    pendingDropClaimsRef.current.add(key);
    const generation = dropGenerationRef.current;
    void (async () => {
      try {
        const { data, error } = await supabase.rpc('claim_run_drop' as never, {
          p_level: currentLevelRef.current,
          p_col: col,
          p_row: row,
        } as never);
        if (generation !== dropGenerationRef.current || leavingRef.current || error) return;
        const result = data as { granted?: boolean; drop_name?: string; kind?: 'key' | 'drop' } | null;
        if (result?.granted === true) showWhisper(`You found: ${result.drop_name ?? 'something'}.`, result.kind === 'key' ? 'var(--drop-key-edge)' : 'var(--plate-gold)', 3000);
      } catch { /* silent — a failed claim must not interrupt movement */ }
      finally {
        if (generation === dropGenerationRef.current) {
          pendingDropClaimsRef.current.delete(key);
          const next = new Map(runDropsRef.current);
          next.delete(key);
          runDropsRef.current = next;
          setRunDrops(next);
        }
      }
    })();
  };




  // Move Claire one step toward target if possible
  const stepClaireToward = (target: Cell) => {
    if (!configRef.current) return;
    const cp = clairePosRef.current;
    const dc = target.col - cp.col;
    const dr = target.row - cp.row;
    const sdc = dc === 0 ? 0 : dc > 0 ? 1 : -1;
    const sdr = dr === 0 ? 0 : dr > 0 ? 1 : -1;
    // Try horizontal first, then vertical, else stay
    const tryStep = (nc: number, nr: number) => {
      if (nc === cp.col && nr === cp.row) return false;
      if (isWall(nc, nr)) return false;
      clairePosRef.current = { col: nc, row: nr };
      setClairePos({ col: nc, row: nr });
      return true;
    };
    if (sdc !== 0 && tryStep(cp.col + sdc, cp.row)) return;
    if (sdr !== 0 && tryStep(cp.col, cp.row + sdr)) return;
  };

  const triggerReunion = () => {
    if (reunionDoneRef.current) return;
    reunionDoneRef.current = true;
    showWhisper('She came back.', '#c8963a', 3000);
    const newCredits = credits + 50;
    setCredits(newCredits);
    if (user) updateUser(user.id, { credits: newCredits });
    setAlexandraVisible(false);
    setClaireVisible(false);
    alexandraFoundRef.current = false;
    setAlexandraFound(false);
    claireFoundRef.current = false;
    setClaireFound(false);
    claireFollowingRef.current = false;
    setClaireFollowing(false);
  };

  const tryMove = (dc: number, dr: number) => {
    if (!stepsReadyRef.current) return;
    const cfg = configRef.current;
    if (!cfg) return;
    const now = Date.now();
    if (now - lastMoveTimeRef.current < 150) return;
    if (stepsRemainingRef.current <= 0) return;
    if (exchangeOpenRef.current) return;
    const sdc = dc === 0 ? 0 : dc > 0 ? 1 : -1;
    const sdr = dr === 0 ? 0 : dr > 0 ? 1 : -1;
    const cur = posRef.current;
    const nc = Math.max(0, Math.min(cfg.cols - 1, cur.col + sdc));
    const nr = Math.max(0, Math.min(cfg.rows - 1, cur.row + sdr));
    if (nc === cur.col && nr === cur.row) return;
    if (isWall(nc, nr)) return;
    // Diagonal: refuse to slip through the corner point between two walls.
    if (sdc !== 0 && sdr !== 0) {
      const sideA = isWall(cur.col + sdc, cur.row);
      const sideB = isWall(cur.col, cur.row + sdr);
      if (sideA && sideB) return;
    }
    lastMoveTimeRef.current = now;

    prevPosRef.current = { ...cur };
    const newPos = { col: nc, row: nr };
    posRef.current = newPos;
    setPos(newPos);
    stepsRemainingRef.current -= 1;
    setStepsRemaining(stepsRemainingRef.current);
    const uidStep = userIdRef.current;
    if (uidStep) updateUser(uidStep, { steps_remaining: stepsRemainingRef.current });

    moveCountRef.current += 1;

    // Claire follows: every 3 player moves, step toward player's previous position
    if (claireFollowingRef.current && moveCountRef.current % 3 === 0) {
      stepClaireToward(prevPosRef.current);
    }

    // Reunion check
    if (
      claireFollowingRef.current &&
      cfg.alexandra &&
      !reunionDoneRef.current
    ) {
      const cp = clairePosRef.current;
      const a = cfg.alexandra;
      const dist = Math.max(Math.abs(cp.col - a.col), Math.abs(cp.row - a.row));
      if (dist <= 3) triggerReunion();
    }

    // Alexandra contact (within 2 cells)
    if (cfg.alexandra && alexandraVisible && !reunionDoneRef.current) {
      const a = cfg.alexandra;
      const d = Math.max(Math.abs(nc - a.col), Math.abs(nr - a.row));
      if (d <= 2) {
        if (!claireFoundRef.current) {
          if (!alexandraFoundRef.current) {
            alexandraFoundRef.current = true;
            setAlexandraFound(true);
          }
          const lines = [
            'You found me. She went further in. I cannot follow.',
            'Claire. My daughter. She followed the mathematics.',
            'Bring her back. Please.',
          ];
          const idx = Math.min(whisperIndexRef.current, 2);
          showWhisper(lines[idx], '#c8963a', 3000);
          whisperIndexRef.current = Math.min(whisperIndexRef.current + 1, 2);
          setWhisperIndex(whisperIndexRef.current);
        } else if (claireFollowingRef.current) {
          showWhisper('She is with you. Bring her here.', '#c8963a', 3000);
        }
      }
    }

    // Claire contact (within 2 cells)
    if (cfg.claire && claireVisible && !claireFoundRef.current && alexandraFoundRef.current) {
      const cp = clairePosRef.current;
      const d = Math.max(Math.abs(nc - cp.col), Math.abs(nr - cp.row));
      if (d <= 2) {
        claireFoundRef.current = true;
        setClaireFound(true);
        claireFollowingRef.current = true;
        setClaireFollowing(true);
        showWhisper('Are you real? Can you take me back?', '#f97316', 3000);
      }
    }

    // fragment check
    const fragIdx = cfg.fragments.findIndex((f) => f.col === nc && f.row === nr);
    if (fragIdx !== -1) {
      const frag = cfg.fragments[fragIdx];
      if (!collectedRef.current.has(frag.prime)) {
        const next = new Set(collectedRef.current);
        next.add(frag.prime);
        collectedRef.current = next;
        setCollected(next);
        setActiveFragment({ prime: frag.prime, index: fragIdx });

        const uidFrag = userIdRef.current;
        if (uidFrag) {
          const write = (async () => {
            const { data: existing } = await supabase
              .from('fragments')
              .select('id')
              .eq('user_id', uidFrag)
              .eq('prime_number', frag.prime)
              .eq('level', currentLevelRef.current)
              .eq('banked', false)
              .limit(1);
            if (leavingRef.current || (existing && existing.length > 0)) return;
            const imageData = generateFragmentImage(frag.prime, registrationNumberRef.current);
            const { error } = await supabase.from('fragments').insert({
              user_id: uidFrag,
              prime_number: frag.prime,
              level: currentLevelRef.current,
              image_data: imageData,
              banked: false,
            });
            if (error) console.error('Failed to save fragment', error);
          })();
          fragmentWritesRef.current.add(write);
          void write.finally(() => fragmentWritesRef.current.delete(write));
        }
      }
    }

    // whisper tile check — 60s cooldown per cell
    if (whisperCellsRef.current.some((w) => w.col === nc && w.row === nr)) {
      triggerTileWhisper(nc, nr);
    }

    // Only filled points are claimed, once per entry and never concurrently.
    claimRunDrop(nc, nr);



    // easter egg check

    const eggKey = `${nc},${nr}`;
    const egg = cfg.eggs.find((e) => e.col === nc && e.row === nr);
    if (egg && !eggsTriggeredRef.current.has(eggKey)) {
      eggsTriggeredRef.current.add(eggKey);
      showWhisper(egg.line, 'rgba(160,140,200,0.85)', 2500);
    }

    // door check — opens only when EVERY required prime for this level
    // has been collected THIS RUN. Banked primes do not count.
    if (nc === cfg.door.col && nr === cfg.door.row) {
      const requiredPrimes = cfg.fragments.map((f) => f.prime);
      const have = requiredPrimes.filter((p) => collectedRef.current.has(p)).length;
      const required = requiredPrimes.length;
      if (have >= required) {
        setDoorConfirmOpen(true);
      } else {
        setInsufficientFragmentsOpen(true);
      }
    }

    // Console visits use the same exact-cell room-return marker as Bernard.
    if (cfg.visualCells?.some(cell => cell.type === 'CONSOLE_DOOR' && cell.col === nc && cell.row === nr)) {
      window.sessionStorage.setItem('praem_maze_return_col', String(nc));
      window.sessionStorage.setItem('praem_maze_return_row', String(nr));
      navigate(`/room/${CONSOLE_ROOM_LEVEL}/${CONSOLE_ROOM_KEY}?from=maze&level=${currentLevelRef.current}`);
      return;
    }

    // blue door — Bernard's room (Level 1) / credit game (other levels)
    if (cfg.creditDoors.some((d) => d.col === nc && d.row === nr)) {
      if (currentLevelRef.current === 1) {
        // Preserve the exact maze position so re-entering the maze restores it.
        window.sessionStorage.setItem('praem_maze_return_col', String(nc));
        window.sessionStorage.setItem('praem_maze_return_row', String(nr));
        navigate(`/room/${currentLevelRef.current}/bernard_room?from=maze`);
      } else {
        showWhisper('A game exists here. Not yet open.', 'rgba(59,130,246,0.8)', 2500);
      }
    }

    // ROOM_DOOR cells — newly-placed colored doors leading to generic rooms.
    const roomDoor = cfg.doorsToRoom?.find((d) => d.col === nc && d.row === nr);
    if (roomDoor) {
      const key = (roomDoor as DoorToRoom & { color?: string }).color ?? roomDoor.roomId;
      if (key) navigate(`/room/${currentLevelRef.current}/${key}`);
    }

  };

  // keyboard
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
      heldKeysRef.current.add(e.key);
    };
    const onUp = (e: KeyboardEvent) => { heldKeysRef.current.delete(e.key); };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // rAF loop
  const [pulse, setPulse] = useState(1);
  useEffect(() => {
    let raf = 0;
    let pulseT = 0;
    const tick = () => {
      const k = heldKeysRef.current;
      let dc = 0, dr = 0;
      if (k.has('ArrowLeft')) dc -= 1;
      if (k.has('ArrowRight')) dc += 1;
      if (k.has('ArrowUp')) dr -= 1;
      if (k.has('ArrowDown')) dr += 1;
      if (dc !== 0 || dr !== 0) tryMove(dc, dr);

      const targetPos = posRef.current;
      const curDisplay = displayPosRef.current;
      const dCol = targetPos.col - curDisplay.col;
      const dRow = targetPos.row - curDisplay.row;
      if (Math.abs(dCol) < 0.01 && Math.abs(dRow) < 0.01) {
        if (curDisplay.col !== targetPos.col || curDisplay.row !== targetPos.row) {
          displayPosRef.current = { col: targetPos.col, row: targetPos.row };
          setDisplayPos(displayPosRef.current);
        }
      } else {
        displayPosRef.current = {
          col: curDisplay.col + dCol * 0.18,
          row: curDisplay.row + dRow * 0.18,
        };
        setDisplayPos(displayPosRef.current);
      }

      const targetX = window.innerWidth / 2 - (posRef.current.col * CELL + CELL / 2);
      const targetY = window.innerHeight / 2 - (posRef.current.row * CELL + CELL / 2);
      camRef.current = {
        x: camRef.current.x + (targetX - camRef.current.x) * 0.12,
        y: camRef.current.y + (targetY - camRef.current.y) * 0.12,
      };
      if (worldRef.current) worldRef.current.style.transform = `translate(${camRef.current.x}px, ${camRef.current.y}px)`;
      if (fogRef.current) {
        fogRef.current.style.setProperty('--lx', `${camRef.current.x + displayPosRef.current.col * CELL + CELL / 2}px`);
        fogRef.current.style.setProperty('--ly', `${camRef.current.y + displayPosRef.current.row * CELL + CELL / 2}px`);
      }

      pulseT += 1 / 60;
      const p = 1 + Math.sin((pulseT / 1.5) * Math.PI * 2) * 0.075 + 0.075;
      setPulse(p);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setQuoteIdx((i) => (i + 1) % QUOTES.length), 90000);
    return () => window.clearInterval(id);
  }, []);

  

  const playerScreenX = typeof window !== 'undefined' ? camRef.current.x + displayPos.col * CELL + CELL / 2 : 0;
  const playerScreenY = typeof window !== 'undefined' ? camRef.current.y + displayPos.row * CELL + CELL / 2 : 0;

  const showLoading = useMinLoading(!config);

  // Level 3+ placeholder
  if (levelLoaded && currentLevel >= 3) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#04040a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <p className="font-fell italic" style={{ fontSize: 18, color: 'rgba(160,140,200,0.7)', textAlign: 'center', maxWidth: '80vw' }}>
          The next level is not yet open.
        </p>
        <button
          className="font-cinzel"
          onClick={leaveMaze}
          style={{
            background: 'transparent', border: '0.5px solid rgba(160,140,200,0.4)',
            color: 'rgba(160,140,200,0.7)', padding: '10px 24px', fontSize: 16,
            letterSpacing: '0.3em', cursor: 'pointer',
          }}
        >
          RETURN
        </button>
      </div>
    );
  }

  if (showLoading || !config) {
    return <LoadingScreen />;
  }

  const MAP_W = config.cols * CELL;
  const MAP_H = config.rows * CELL;

  return (
    <div className="maze-theme" style={{ position: 'fixed', inset: 0, background: 'hsl(var(--background))', overflow: 'hidden', '--maze-light-core': `${DIMENSION_GLOW[glow]}14` } as CSSProperties}>
      <div
        ref={worldRef}
        data-maze-world="true"
        style={{ position: 'absolute', width: MAP_W, height: MAP_H, transform: `translate(${camRef.current.x}px, ${camRef.current.y}px)`, willChange: 'transform' }}
      >
        <FloorLayer cols={config.cols} rows={config.rows} size={CELL} styleKey={theme.floor} dimension={glow} />
        {theme.primeGlow && <PrimeGlowLayer cols={config.cols} rows={config.rows} size={CELL} dimension={glow} isFloor={isFloor} />}
        {visibleWalls.map(({ col, row }) => (
          <div key={`w-${col},${row}`} data-wall-cell={`${col},${row}`} style={{ position: 'absolute', left: col * CELL, top: row * CELL, width: CELL, height: CELL, zIndex: 2, pointerEvents: 'none' }}>
            <div className="maze-wall-shadow" />
            <WallTile styleKey={theme.wall} dimension={glow} size={CELL} />
            {pylons.has(`${col},${row}`) && <div className="absolute inset-0"><Pylon dimension={glow} size={CELL} /></div>}
            {config.veilSet?.has(`${col},${row}`) && <div className="absolute inset-0"><Veil dimension={glow} size={CELL} /></div>}
          </div>
        ))}
        {inView(config.spawn) && <div data-object="start" style={{ position: 'absolute', left: config.spawn.col * CELL, top: config.spawn.row * CELL, zIndex: 3 }}><StartPad dimension={glow} size={CELL} /></div>}
        {visibleObjects.map((cell, index) => (
          <div key={`object-${cell.type}-${cell.col},${cell.row}-${index}`} data-object={cell.type} style={{ position: 'absolute', left: cell.col * CELL, top: cell.row * CELL, width: CELL, height: CELL, zIndex: 9, pointerEvents: 'none' }}>
            {cell.type === 'ROOM_DOOR' && <><WallTile styleKey={theme.wall} dimension={glow} size={CELL} /><div className="absolute inset-0"><RoomDoorTile dimension={glow} color={cell.color} size={CELL} /></div></>}
            {cell.type === 'CONSOLE_DOOR' && <><WallTile styleKey={theme.wall} dimension={glow} size={CELL} /><div className="absolute inset-0"><ConsoleDoorTile dimension={glow} size={CELL} /></div></>}
            {(cell.type === 'DROP_SPAWN' || cell.type === 'DROP') && <DropCrate dimension={glow} size={CELL} lit={runDrops.has(`${cell.col},${cell.row}`)} tone={runDrops.get(`${cell.col},${cell.row}`)?.kind} />}
            {cell.type === 'NPC' && <div className="npc-orb-cell"><NpcOrb npc={cell.npc_key || cell.npc_name || cell.name || ''} size={40} /></div>}
          </div>
        ))}

        {currentLevel === 1 && LEVEL1_HINTS.map((h, i) => (
          <div
            key={`hint-${i}`}
            style={{
              position: 'absolute',
              left: h.col * CELL, top: h.row * CELL,
              width: CELL, height: CELL,
              border: '1px solid rgba(200,150,58,0.4)',
              boxSizing: 'border-box',
              pointerEvents: 'none',
            }}
          />
        ))}

        {config.fragments.filter((f) => !collected.has(f.prime) && inView(f)).map((f) => (
          <div key={`frag-${f.prime}`} data-object="fragment" style={{ position: 'absolute', left: f.col * CELL, top: f.row * CELL, width: CELL, height: CELL, zIndex: 10, pointerEvents: 'none' }}>
            <PrimeShard dimension={glow} size={CELL} />
          </div>
        ))}
        {inView(config.door) && <div data-object="golden-gate" style={{ position: 'absolute', left: config.door.col * CELL, top: config.door.row * CELL, width: CELL, height: CELL, zIndex: 10, pointerEvents: 'none' }}>
          <WallTile styleKey={theme.wall} dimension={glow} size={CELL} />
          <div className="absolute inset-0"><Gate variant="golden" dimension={glow} size={CELL} /></div>
        </div>}
        {config.creditDoors.filter(inView).map((d, i) => (
          <div key={`cd-${i}`} data-object="blue-gate" style={{ position: 'absolute', left: d.col * CELL, top: d.row * CELL, width: CELL, height: CELL, zIndex: 10, pointerEvents: 'none' }}>
            <WallTile styleKey={theme.wall} dimension={glow} size={CELL} />
            <div className="absolute inset-0"><Gate variant="blue" dimension={glow} size={CELL} /></div>
          </div>
        ))}
        {config.doorsToRoom?.filter(inView).map((d, i) => (
          <div key={`room-${i}`} data-object="room-door" style={{ position: 'absolute', left: d.col * CELL, top: d.row * CELL, width: CELL, height: CELL, zIndex: 10, pointerEvents: 'none' }}>
            <WallTile styleKey={theme.wall} dimension={glow} size={CELL} />
            <div className="absolute inset-0"><RoomDoorTile dimension={glow} color={config.visualCells?.find(cell => cell.type === 'ROOM_DOOR' && cell.col === d.col && cell.row === d.row)?.color ?? (d as DoorToRoom & { color?: string }).color} size={CELL} /></div>
          </div>
        ))}
        {config.alexandra && alexandraVisible && inView(config.alexandra) && <div style={{ position: 'absolute', left: config.alexandra.col * CELL + CELL / 2, top: config.alexandra.row * CELL + CELL / 2, zIndex: 10, pointerEvents: 'none' }}><NpcOrb npc="alexandra" size={40} /></div>}
        {config.claire && claireVisible && inView(clairePos) && <div style={{ position: 'absolute', left: clairePos.col * CELL + CELL / 2, top: clairePos.row * CELL + CELL / 2, zIndex: 10, pointerEvents: 'none' }}><NpcOrb npc="claire" size={40} /></div>}
      </div>

      <style>{`
        @keyframes mazePurplePulse {
          0%, 100% { box-shadow: 0 0 8px rgba(91,79,212,0.6); }
          50% { box-shadow: 0 0 20px rgba(91,79,212,0.9); }
        }
        @keyframes mazeGoldPulse {
          0%, 100% { box-shadow: 0 0 8px rgba(200,150,58,0.5); }
          50% { box-shadow: 0 0 24px rgba(200,150,58,1); }
        }
        @keyframes mazeBluePulse {
          0%, 100% { box-shadow: 0 0 8px rgba(59,130,246,0.5); }
          50% { box-shadow: 0 0 20px rgba(59,130,246,0.9); }
        }
        @keyframes mazePanelSlide { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes mazeDoorFade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <div
        style={{
          position: 'fixed',
          left: playerScreenX - 15,
          top: playerScreenY - 15,
          zIndex: 60,
          pointerEvents: 'none',
        }}
      >
        <PlayerAvatar
          palette={paletteFromColor(auraColor, registrationNumber)}
          walking={Math.abs(posRef.current.col - displayPos.col) >= 0.01 || Math.abs(posRef.current.row - displayPos.row) >= 0.01}
          size={30}
        />
      </div>

      <div
        ref={fogRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          '--lx': `${playerScreenX}px`,
          '--ly': `${playerScreenY}px`,
          '--r1': `${lanternRadii(perception).r1}px`,
          '--r2': `${lanternRadii(perception).r2}px`,
          '--fog': FOG_OPACITY,
          background: LANTERN_BG,
          pointerEvents: 'none',
          zIndex: 50,
        } as CSSProperties}
      />

      <p
        className="font-fell italic"
        style={{
          position: 'fixed', top: 24, left: 0, right: 0, textAlign: 'center',
          fontSize: 18, color: 'rgba(160,140,200,0.5)', margin: 0, zIndex: 20, pointerEvents: 'none',
        }}
      >
        {QUOTES[quoteIdx]}
      </p>

      {whisper && (
        <p
          className="font-fell italic"
          style={{
            position: 'fixed', top: '20%', left: 0, right: 0, textAlign: 'center',
            fontSize: 20, color: whisperColor, textShadow: '0 0 12px rgba(91,79,212,0.6)',
            margin: 0, zIndex: 30, pointerEvents: 'none',
          }}
        >
          {whisper}
        </p>
      )}

      {stepsRemaining === 0 && (
        <p
          className="font-fell italic"
          style={{
            position: 'fixed', top: '20%', left: 0, right: 0, textAlign: 'center',
            fontSize: 18, color: 'rgba(160,140,200,0.6)', margin: 0, zIndex: 30, pointerEvents: 'none',
          }}
        >
          You have no steps remaining. Walk to continue.
        </p>
      )}

      <button
        className="font-cinzel"
        onClick={() => setExitConfirmOpen(true)}
        style={{
          position: 'fixed', bottom: HUD_HEIGHT + HUD_BUTTON_GAP, left: 16, background: 'transparent', border: 'none',
          color: 'rgba(160,140,200,0.4)', fontSize: 16, letterSpacing: '0.3em', cursor: 'pointer',
          padding: 4, zIndex: 65,
        }}
      >
        EXIT MAZE
      </button>

      {exitConfirmOpen && (
        <MazeDialog glow={DIMENSION_GLOW[glow]} zIndex={200}>
          <p className="font-fell italic" style={{ margin: 0, fontSize: 20, color: '#e0ddd5', textAlign: 'center' }}>Leave the maze?</p>
          <p className="font-fell italic" style={{ margin: '10px 0 0', fontSize: 14, color: '#b79bff', textAlign: 'center' }}>Everything you carry will be lost.</p>
          <DialogButtons>
            <button className="font-cinzel" style={DANGER_BTN} onClick={leaveMaze}>LEAVE</button>
            <button className="font-cinzel" style={SECONDARY_BTN} onClick={() => setExitConfirmOpen(false)}>STAY</button>
          </DialogButtons>
        </MazeDialog>
      )}

      {doorConfirmOpen && (
        <MazeDialog glow={DIMENSION_GLOW[glow]} zIndex={100}>
          <div style={{ display: 'flex', justifyContent: 'center' }}><PixelEye glow={DIMENSION_GLOW[glow]} size={128} animate /></div>
          <p className="font-fell italic" style={{ margin: '14px 0 0', fontSize: 22, color: '#f5c060', textAlign: 'center' }}>The way opens.</p>
          <p className="font-fell italic" style={{ margin: '8px 0 0', fontSize: 15, color: '#b79bff', textAlign: 'center' }}>Are you ready to leave the maze? Unfinished paths will remain.</p>
          <ShardPlate filled={Array(config.fragmentsRequired).fill(true)} caption={`All ${config.fragmentsRequired} fragments collected.`} />
          <DialogButtons>
            <button className="font-cinzel" style={PRIMARY_BTN} onClick={async () => {
                if (user) {
                  await supabase.from('users').update({ maze_completed_level: currentLevelRef.current }).eq('id', user.id);
                }
                if (user) markRunComplete(user.id, currentLevelRef.current);
                sessionStorage.setItem('praem_shadow_entry', JSON.stringify({ level: currentLevelRef.current, ts: Date.now() }));
                navigate('/shadow');
              }}>ENTER</button>
            <button className="font-cinzel" style={SECONDARY_BTN} onClick={() => setDoorConfirmOpen(false)}>STAY</button>
          </DialogButtons>
        </MazeDialog>
      )}

      {insufficientFragmentsOpen && (() => {
        const requiredPrimes = config.fragments.map((f) => f.prime);
        const filled = requiredPrimes.map((p) => collectedRef.current.has(p)).sort((x, y) => Number(y) - Number(x));
        const have = filled.filter(Boolean).length;
        return (
          <MazeDialog glow={DIMENSION_GLOW[glow]} zIndex={100}>
            <div style={{ display: 'flex', justifyContent: 'center' }}><PixelEye glow={DIMENSION_GLOW[glow]} size={128} closed /></div>
            <p className="font-fell italic" style={{ margin: '14px 0 0', fontSize: 22, color: '#f5c060', textAlign: 'center' }}>The Instrument does not answer.</p>
            <p className="font-fell italic" style={{ margin: '8px 0 0', fontSize: 15, color: '#b79bff', textAlign: 'center' }}>You carry {have} of {requiredPrimes.length} fragments the Instrument requires.</p>
            <ShardPlate filled={filled} />
            <DialogButtons>
              <button className="font-cinzel" style={SECONDARY_BTN} onClick={() => setInsufficientFragmentsOpen(false)}>STAY</button>
            </DialogButtons>
          </MazeDialog>
        );
      })()}

      <Thumbstick
        onMove={(dc, dr) => tryMove(dc, dr)}
        disabled={
          profileOpenDisplay || exchangeOpen || doorConfirmOpen || insufficientFragmentsOpen ||
          paywallOpen || activeFragment !== null
        }
      />

      <div
        className="font-mono"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(4,4,10,0.92)', borderTop: '0.5px solid rgba(169,140,255,0.3)',
          minHeight: HUD_HEIGHT, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 15, letterSpacing: '0.18em', zIndex: 60,
        }}
      >
        <span
          onClick={() => { setExchangeError(false); setSelectedCredits(1); setExchangeOpen(true); }}
          style={{
            color: stepsRemaining === 0 ? 'rgba(200,80,80,0.9)' : stepsRemaining <= 20 ? 'rgba(200,150,58,0.9)' : '#e0ddd5',
            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
          }}
        >
          <span>STEPS {stepsRemaining}</span>
          <span
            style={{
              color: 'rgba(160,140,200,0.4)', fontSize: 14, letterSpacing: '0.15em',
              visibility: stepsRemaining <= 20 ? 'visible' : 'hidden',
            }}
          >
            tap to exchange
          </span>
        </span>
        <span
          data-fragment-hud={collected.size >= config.fragmentsRequired ? 'full' : undefined}
          style={{ color: collected.size >= config.fragmentsRequired ? '#f5c060' : '#c8963a', animation: collected.size >= config.fragmentsRequired ? 'fragment-hud-pulse 1.6s ease-in-out infinite' : undefined }}
        >
          FRAGMENTS {collected.size}/{config.fragmentsRequired}
        </span>


        <span style={{ color: '#5b4fd4' }}>LEVEL {String(currentLevel).padStart(2, '0')}</span>
        <ProfileButton onClick={openProfile} />
      </div>

      <StepExchangeSheet
        open={exchangeOpen}
        credits={credits}
        steps={stepsRemaining}
        onClose={() => { setExchangeOpen(false); setExchangeError(false); }}
        onConfirm={(spent) => {
          if (!stepsReadyRef.current) return;
          if (credits < spent) {
            setExchangeError(true);
            window.setTimeout(() => { setExchangeOpen(false); setExchangeError(false); }, 2000);
            return;
          }
          setSelectedCredits(spent);
          const newCredits = credits - spent;
          setCredits(newCredits);
          const gained = spent * 100;
          stepsRemainingRef.current += gained;
          setStepsRemaining(stepsRemainingRef.current);
          if (user) updateUser(user.id, {
            credits: newCredits,
            steps_remaining: stepsRemainingRef.current,
          });
          setExchangeOpen(false);
        }}
      />

      {activeFragment && (
        <FragmentOverlay
          prime={activeFragment.prime}
          index={activeFragment.index}
          registrationNumber={registrationNumber ?? 0}
          onContinue={() => setActiveFragment(null)}
        />
      )}

      <ProfileOverlay isOpen={profileOpenDisplay} onClose={closeProfile} context="maze" runProgress={{ collected: collected.size, required: config.fragmentsRequired }} />

      {!BETA_MODE && paywallOpen && (
        <PaywallOverlay
          userId={user?.id ?? ''}
          onContinue={() => {
            setPaywallOpen(false);
            void leaveMaze();
          }}
          onDismiss={() => {
            setPaywallOpen(false);
            void leaveMaze();
          }}
        />
      )}
    </div>
  );
};

export default Maze;
