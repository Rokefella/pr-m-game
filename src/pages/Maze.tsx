import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FragmentOverlay from '@/components/FragmentOverlay';
import PaywallOverlay from '@/components/PaywallOverlay';
import ProfileOverlay, { ProfileButton } from '@/components/ProfileOverlay';
import { fetchOrCreateUser, updateUser } from '@/lib/userData';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { generateFragmentImage } from '@/lib/fragmentImage';

// TODO: restore to real walking steps via HealthKit for production.
const INITIAL_STEPS = 1000;
const CELL = 40;

type Cell = { col: number; row: number };
type FragmentDef = Cell & { prime: number };
type EggDef = Cell & { line: string };

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
  };
};

const QUOTES = [
  'Navigate.',
  'The spiral remembers.',
  'You are inside her instrument.',
  'Find the fragments.',
  '89 is the center of everything.',
];

const Maze = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [currentLevel, setCurrentLevel] = useState(1);
  const currentLevelRef = useRef(1);
  const [levelLoaded, setLevelLoaded] = useState(false);
  const [credits, setCredits] = useState(50);
  const [auraColor, setAuraColor] = useState<string>(() => (typeof window !== 'undefined' && localStorage.getItem('praem_aura_color')) || '#5b4fd4');
  const [registrationNumber, setRegistrationNumber] = useState<number | null>(null);
  const registrationNumberRef = useRef(0);
  const [doorConfirmOpen, setDoorConfirmOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const profileOpenRef = useRef(false);
  const [profileOpenDisplay, setProfileOpenDisplay] = useState(false);
  const openProfile = useCallback(() => { profileOpenRef.current = true; setProfileOpenDisplay(true); }, []);
  const closeProfile = useCallback(() => { profileOpenRef.current = false; setProfileOpenDisplay(false); }, []);

  useEffect(() => {
    const handler = () => {
      const subscribed = window.localStorage.getItem('praem_subscribed');
      const bernard06 = window.localStorage.getItem('praem_bernard_06');
      const profileComplete = window.localStorage.getItem('praem_profile_complete');
      console.log('Paywall check — bernard_06:', bernard06, 'subscribed:', subscribed, 'profile_complete:', profileComplete);
      if (subscribed !== 'true' && bernard06 === 'true' && profileComplete === 'true') {
        setPaywallOpen(true);
      }
    };
    window.addEventListener('praem:open-paywall', handler);
    return () => window.removeEventListener('praem:open-paywall', handler);
  }, []);

  // Level config + derived sets — rebuilt only when currentLevel changes
  const config = useMemo<LevelConfig | null>(() => {
    if (currentLevel === 1) return buildLevel1();
    if (currentLevel === 2) return buildLevel2();
    return null;
  }, [currentLevel]);

  // wallSet built directly from LEVEL2_WALLS — single source of truth for L2 collision + rendering.
  const wallSet = useMemo(() => {
    const s = new Set<string>();
    if (currentLevel === 1) LEVEL1_WALL_SET.forEach((k) => s.add(k));
    if (currentLevel === 2) LEVEL2_WALLS.forEach((w) => s.add(`${w.col},${w.row}`));
    return s;
  }, [currentLevel]);

  const isWall = (c: number, r: number) => {
    if (!config) return true;
    if (c < 0 || c >= config.cols || r < 0 || r >= config.rows) return true;
    if (config.specialSet.has(`${c},${r}`)) return false;
    return wallSet.has(`${c},${r}`);
  };

  useEffect(() => {
    console.log('L2 wall count:', LEVEL2_WALLS.length);
  }, []);

  useEffect(() => {
    if (currentLevel === 2) {
      console.log('L2 wall count:', LEVEL2_WALLS.length);
      console.log('L2 wallSet size:', wallSet.size);
      if (LEVEL2_WALLS.length !== wallSet.size) {
        console.warn('L2 MISMATCH: LEVEL2_WALLS and wallSet differ — construction bug.');
      }
    }
  }, [currentLevel, wallSet]);


  const [pos, setPos] = useState<Cell>({ col: 0, row: 0 });
  const posRef = useRef<Cell>({ col: 0, row: 0 });
  const prevPosRef = useRef<Cell>({ col: 0, row: 0 });

  const eggsTriggeredRef = useRef<Set<string>>(new Set());
  const [collected, setCollected] = useState<Set<number>>(new Set());
  const collectedRef = useRef<Set<number>>(new Set());

  const [stepsRemaining, setStepsRemaining] = useState(INITIAL_STEPS);
  const stepsRemainingRef = useRef(INITIAL_STEPS);

  const [whisper, setWhisper] = useState<string | null>(null);
  const [whisperColor, setWhisperColor] = useState<string>('rgba(160,140,200,0.85)');
  const whisperTimer = useRef<number | null>(null);

  const [quoteIdx, setQuoteIdx] = useState(0);
  const [cam, setCam] = useState({ x: 0, y: 0 });
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
      const rc = window.localStorage.getItem('praem_maze_return_col');
      const rr = window.localStorage.getItem('praem_maze_return_row');
      if (rc !== null && rr !== null) {
        const c = parseInt(rc, 10);
        const r = parseInt(rr, 10);
        if (!Number.isNaN(c) && !Number.isNaN(r)) spawn = { col: c, row: r };
        window.localStorage.removeItem('praem_maze_return_col');
        window.localStorage.removeItem('praem_maze_return_row');
      }
      // load fragments from localStorage
      try {
        const stored = JSON.parse(window.localStorage.getItem('praem_fragments') || '[]') as number[];
        if (Array.isArray(stored) && stored.length) {
          const next = new Set<number>(stored);
          collectedRef.current = next;
          setCollected(next);
        }
      } catch { /* ignore */ }
    }
    posRef.current = { ...spawn };
    prevPosRef.current = { ...spawn };
    setPos({ ...spawn });
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
      const imageData = generateFragmentImage(frag.prime, registrationNumberRef.current);
      supabase.from('fragments').insert({
        user_id: user.id,
        prime_number: frag.prime,
        level: currentLevelRef.current,
        image_data: imageData,
      }).then(({ error }) => { if (error) console.error('Failed to save fragment', error); });
    }
  }, [config, levelLoaded, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    let cancelled = false;
    (async () => {
      const row = await fetchOrCreateUser(user.id);
      if (cancelled) return;
      setCurrentLevel(row.level);
      currentLevelRef.current = row.level;
      setCredits(row.credits);
      if (row.aura_color) setAuraColor(row.aura_color);
      setRegistrationNumber(row.registration_number);
      registrationNumberRef.current = row.registration_number;
      if (row.registration_number != null) {
        localStorage.setItem('praem_registration_number', String(row.registration_number).padStart(4, '0'));
      }
      const startSteps = row.steps_remaining > 0 ? row.steps_remaining : INITIAL_STEPS;
      stepsRemainingRef.current = startSteps;
      setStepsRemaining(startSteps);
      if (row.steps_remaining <= 0) {
        updateUser(user.id, { steps_remaining: INITIAL_STEPS });
      }

      try {
        const fragRes = await fetch(
          `https://jngofylkynipsnzyyzdq.supabase.co/rest/v1/fragments?user_id=eq.${user.id}&level=eq.${row.level}&select=prime_number`,
          {
            headers: {
              apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZ29meWxreW5pcHNuenl5emRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NjIzNDEsImV4cCI6MjA5MjUzODM0MX0.FWvc_DwabUSkxgHVwKRA3T2SMTlQ7aQr12a7yGUEW64',
              Authorization:
                'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZ29meWxreW5pcHNuenl5emRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NjIzNDEsImV4cCI6MjA5MjUzODM0MX0.FWvc_DwabUSkxgHVwKRA3T2SMTlQ7aQr12a7yGUEW64',
            },
          },
        );
        const existing = (await fragRes.json()) as Array<{ prime_number: number }>;
        if (cancelled) return;
        if (Array.isArray(existing)) {
          const next = new Set<number>(existing.map((r) => r.prime_number));
          collectedRef.current = next;
          setCollected(next);
        }
      } catch (e) {
        console.error('Failed to load fragments', e);
      }
      setLevelLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [selectedCredits, setSelectedCredits] = useState(1);
  const [exchangeError, setExchangeError] = useState(false);
  const exchangeOpenRef = useRef(false);
  useEffect(() => { exchangeOpenRef.current = exchangeOpen; }, [exchangeOpen]);

  const VIS_RADIUS = 120;
  const VIS_INNER = Math.round(VIS_RADIUS * 0.75);
  const VIS_MID = Math.round(VIS_RADIUS * 0.9);

  const showWhisper = (text: string, color = 'rgba(160,140,200,0.85)', dur = 3000) => {
    setWhisper(text);
    setWhisperColor(color);
    if (whisperTimer.current) window.clearTimeout(whisperTimer.current);
    whisperTimer.current = window.setTimeout(() => setWhisper(null), dur);
  };

  // Move Claire one step toward target if possible
  const stepClaireToward = (target: Cell) => {
    if (!config) return;
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
    if (!config) return;
    const now = Date.now();
    if (now - lastMoveTimeRef.current < 150) return;
    if (stepsRemainingRef.current <= 0) return;
    if (exchangeOpenRef.current) return;
    const sdc = dc === 0 ? 0 : dc > 0 ? 1 : -1;
    const sdr = dr === 0 ? 0 : dr > 0 ? 1 : -1;
    const cur = posRef.current;
    const nc = Math.max(0, Math.min(config.cols - 1, cur.col + sdc));
    const nr = Math.max(0, Math.min(config.rows - 1, cur.row + sdr));
    if (nc === cur.col && nr === cur.row) return;
    if (isWall(nc, nr)) return;
    lastMoveTimeRef.current = now;

    prevPosRef.current = { ...cur };
    const newPos = { col: nc, row: nr };
    posRef.current = newPos;
    setPos(newPos);
    stepsRemainingRef.current -= 1;
    setStepsRemaining(stepsRemainingRef.current);
    if (user) updateUser(user.id, { steps_remaining: stepsRemainingRef.current });

    moveCountRef.current += 1;

    // Claire follows: every 3 player moves, step toward player's previous position
    if (claireFollowingRef.current && moveCountRef.current % 3 === 0) {
      stepClaireToward(prevPosRef.current);
    }

    // Reunion check
    if (
      claireFollowingRef.current &&
      config.alexandra &&
      !reunionDoneRef.current
    ) {
      const cp = clairePosRef.current;
      const a = config.alexandra;
      const dist = Math.max(Math.abs(cp.col - a.col), Math.abs(cp.row - a.row));
      if (dist <= 3) triggerReunion();
    }

    // Alexandra contact (within 2 cells)
    if (config.alexandra && alexandraVisible && !reunionDoneRef.current) {
      const a = config.alexandra;
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
    if (config.claire && claireVisible && !claireFoundRef.current && alexandraFoundRef.current) {
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
    const fragIdx = config.fragments.findIndex((f) => f.col === nc && f.row === nr);
    if (fragIdx !== -1) {
      const frag = config.fragments[fragIdx];
      if (!collectedRef.current.has(frag.prime)) {
        const next = new Set(collectedRef.current);
        next.add(frag.prime);
        collectedRef.current = next;
        setCollected(next);
        setActiveFragment({ prime: frag.prime, index: fragIdx });

        // persist to localStorage for cross-screen quest tracking
        try {
          window.localStorage.setItem('praem_fragments', JSON.stringify(Array.from(next)));
        } catch { /* ignore */ }

        if (user) {
          const imageData = generateFragmentImage(frag.prime, registrationNumberRef.current);
          supabase.from('fragments').insert({
            user_id: user.id,
            prime_number: frag.prime,
            level: currentLevelRef.current,
            image_data: imageData,
          }).then(({ error }) => { if (error) console.error('Failed to save fragment', error); });
        }
      }
    }

    // easter egg check
    const eggKey = `${nc},${nr}`;
    const egg = config.eggs.find((e) => e.col === nc && e.row === nr);
    if (egg && !eggsTriggeredRef.current.has(eggKey)) {
      eggsTriggeredRef.current.add(eggKey);
      showWhisper(egg.line, 'rgba(160,140,200,0.85)', 2500);
    }

    // door check
    if (nc === config.door.col && nr === config.door.row) {
      const required = config.fragmentsRequired;
      let count = collectedRef.current.size;
      try {
        const stored = JSON.parse(window.localStorage.getItem('praem_fragments') || '[]') as number[];
        if (Array.isArray(stored)) count = Math.max(count, stored.length);
      } catch { /* ignore */ }
      if (count >= required) {
        setDoorConfirmOpen(true);
      } else {
        const remaining = required - count;
        const msg = remaining === 1
          ? 'One fragment remains. The door does not open.'
          : `${remaining} fragments remain. The door does not open.`;
        showWhisper(msg, 'rgba(200,150,58,0.7)', 2500);
      }
    }

    // blue door — Bernard's room (Level 1) / credit game (other levels)
    if (config.creditDoors.some((d) => d.col === nc && d.row === nr)) {
      if (currentLevelRef.current === 1) {
        navigate('/bernard-room-1');
      } else {
        showWhisper('A game exists here. Not yet open.', 'rgba(59,130,246,0.8)', 2500);
      }
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
      if (k.has('ArrowLeft') || k.has('dpad--1-0')) dc -= 1;
      if (k.has('ArrowRight') || k.has('dpad-1-0')) dc += 1;
      if (k.has('ArrowUp') || k.has('dpad-0--1')) dr -= 1;
      if (k.has('ArrowDown') || k.has('dpad-0-1')) dr += 1;
      if (dc !== 0) tryMove(dc, 0);
      if (dr !== 0) tryMove(0, dr);

      const targetX = window.innerWidth / 2 - (posRef.current.col * CELL + CELL / 2);
      const targetY = window.innerHeight / 2 - (posRef.current.row * CELL + CELL / 2);
      camRef.current = {
        x: camRef.current.x + (targetX - camRef.current.x) * 0.12,
        y: camRef.current.y + (targetY - camRef.current.y) * 0.12,
      };
      setCam({ x: camRef.current.x, y: camRef.current.y });

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

  const dpadMove = (dc: number, dr: number) => tryMove(dc, dr);

  const playerScreenX = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
  const playerScreenY = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;

  // Level 3+ placeholder
  if (levelLoaded && currentLevel >= 3) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#04040a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <p className="font-fell italic" style={{ fontSize: 18, color: 'rgba(160,140,200,0.7)', textAlign: 'center', maxWidth: '80vw' }}>
          The next level is not yet open.
        </p>
        <button
          className="font-cinzel"
          onClick={() => navigate('/village')}
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

  if (!config) {
    return <div style={{ position: 'fixed', inset: 0, background: '#04040a' }} />;
  }

  const MAP_W = config.cols * CELL;
  const MAP_H = config.rows * CELL;

  // Cull walls outside camera view for performance (Level 2 = 22500 cells)
  const viewLeft = -cam.x - 400;
  const viewTop = -cam.y - 400;
  const viewRight = -cam.x + window.innerWidth + 400;
  const viewBottom = -cam.y + window.innerHeight + 400;

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#04040a', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          width: MAP_W,
          height: MAP_H,
          transform: `translate(${cam.x}px, ${cam.y}px)`,
          willChange: 'transform',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(100,80,160,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(100,80,160,0.12) 1px, transparent 1px)',
            backgroundSize: `${CELL}px ${CELL}px`,
            pointerEvents: 'none',
          }}
        />

        {Array.from(wallSet).map((key) => {
          const [c, r] = key.split(',').map(Number);
          const x = c * CELL;
          const y = r * CELL;
          if (x + CELL < viewLeft || x > viewRight || y + CELL < viewTop || y > viewBottom) return null;
          return (
            <div
              key={`w-${key}`}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: CELL,
                height: CELL,
                background: '#0d0d1a',
                border: '1px solid #1a1a2e',
                boxSizing: 'border-box',
                zIndex: 2,
                opacity: 1,
              }}
            />
          );
        })}

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

        {config.fragments.filter((f) => !collected.has(f.prime)).map((f) => (
          <div
            key={`frag-${f.prime}`}
            style={{
              position: 'absolute',
              left: f.col * CELL,
              top: f.row * CELL,
              width: CELL,
              height: CELL,
              background: 'rgba(91,79,212,0.15)',
              border: '1px solid #5b4fd4',
              animation: 'mazePurplePulse 1.8s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
        ))}

        <div
          style={{
            position: 'absolute',
            left: config.door.col * CELL,
            top: config.door.row * CELL,
            width: CELL,
            height: CELL,
            background: 'rgba(200,150,58,0.12)',
            border: '1px solid #c8963a',
            animation: 'mazeGoldPulse 2.2s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />

        {config.creditDoors.map((d, i) => (
          <div
            key={`cd-${i}`}
            style={{
              position: 'absolute',
              left: d.col * CELL,
              top: d.row * CELL,
              width: CELL,
              height: CELL,
              background: 'rgba(59,130,246,0.12)',
              border: '1px solid #3b82f6',
              animation: 'mazeBluePulse 1.5s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Alexandra — gold dot */}
        {config.alexandra && alexandraVisible && (
          <div
            style={{
              position: 'absolute',
              left: config.alexandra.col * CELL + CELL / 2 - 4,
              top: config.alexandra.row * CELL + CELL / 2 - 4,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#c8963a',
              boxShadow: '0 0 8px rgba(200,150,58,0.8)',
              animation: 'mazeDotPulse 1.5s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Claire — orange dot at her own position */}
        {config.claire && claireVisible && (
          <div
            style={{
              position: 'absolute',
              left: clairePos.col * CELL + CELL / 2 - 4,
              top: clairePos.row * CELL + CELL / 2 - 4,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#f97316',
              boxShadow: '0 0 8px rgba(249,115,22,0.8)',
              animation: 'mazeDotPulse 1.5s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      <style>{`
        @keyframes mazeDotPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
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
          left: playerScreenX - 4,
          top: playerScreenY - 4,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: auraColor,
          boxShadow: `0 0 8px ${auraColor}80`,
          animation: 'mazeDotPulse 1.5s ease-in-out infinite',
          zIndex: 60,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: `radial-gradient(circle ${VIS_RADIUS}px at 50vw calc(50vh - 40px), transparent 0px, transparent ${VIS_INNER}px, rgba(4,4,10,0.85) ${VIS_MID}px, rgba(4,4,10,1) ${VIS_RADIUS}px)`,
          pointerEvents: 'none',
          zIndex: 50,
        }}
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
        onClick={() => navigate('/village')}
        style={{
          position: 'fixed', bottom: 110, left: 16, background: 'transparent', border: 'none',
          color: 'rgba(160,140,200,0.3)', fontSize: 16, letterSpacing: '0.3em', cursor: 'pointer',
          padding: 4, zIndex: 25,
        }}
      >
        RETURN
      </button>

      <button
        className="font-cinzel"
        onClick={() => setExitConfirmOpen(true)}
        style={{
          position: 'fixed', bottom: 56, left: 16, background: 'transparent', border: 'none',
          color: 'rgba(160,140,200,0.4)', fontSize: 16, letterSpacing: '0.3em', cursor: 'pointer',
          padding: 4, zIndex: 65,
        }}
      >
        EXIT MAZE
      </button>

      {exitConfirmOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(4,4,10,0.92)', zIndex: 200,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28,
          }}
        >
          <div
            className="font-fell italic"
            style={{ fontSize: 18, color: 'rgba(160,140,200,0.7)', textAlign: 'center', maxWidth: '85vw' }}
          >
            Leave the maze? All progress will be lost.
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <button
              className="font-cinzel"
              onClick={() => navigate('/village')}
              style={{
                fontSize: 16, letterSpacing: '0.3em', background: 'rgba(200,80,80,0.9)', color: 'white',
                border: 'none', padding: '10px 24px', cursor: 'pointer',
              }}
            >
              LEAVE
            </button>
            <button
              className="font-cinzel"
              onClick={() => setExitConfirmOpen(false)}
              style={{
                fontSize: 16, letterSpacing: '0.3em', background: 'transparent',
                border: '0.5px solid rgba(160,140,200,0.3)', color: 'rgba(160,140,200,0.5)',
                padding: '10px 24px', cursor: 'pointer',
              }}
            >
              STAY
            </button>
          </div>
        </div>
      )}

      {doorConfirmOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(4,4,10,0.96)', zIndex: 100,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            animation: 'mazeDoorFade 600ms ease-in',
          }}
        >
          <svg width={80} height={48} viewBox="-40 -24 80 48">
            <ellipse cx={0} cy={0} rx={32} ry={19} stroke="rgba(200,150,58,0.5)" strokeWidth={1} fill="none" />
            <circle cx={0} cy={0} r={5} fill="#c8963a" />
          </svg>
          <div
            className="font-fell italic"
            style={{ marginTop: 20, fontSize: 22, color: '#c8963a', textAlign: 'center', maxWidth: '85vw' }}
          >
            The way opens.
          </div>
          <div
            className="font-fell italic"
            style={{ marginTop: 10, fontSize: 18, color: 'rgba(160,140,200,0.5)', textAlign: 'center', maxWidth: '85vw' }}
          >
            Are you ready to leave the maze? Unfinished paths will remain.
          </div>
          <div
            className="font-cinzel"
            style={{ marginTop: 16, fontSize: 14, color: 'rgba(200,150,58,0.4)', letterSpacing: '0.2em', textAlign: 'center' }}
          >
            All {config.fragmentsRequired} fragments collected.
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 28 }}>
            <button
              className="font-cinzel"
              onClick={async () => {
                if (user) {
                  await restUpdate(
                    'users',
                    { maze_completed_level: currentLevelRef.current },
                    'id',
                    user.id,
                  );
                }
                navigate('/shadow');
              }}
              style={{
                fontSize: 16, letterSpacing: '0.3em', background: '#c8963a', color: '#04040a',
                border: 'none', padding: '10px 24px', cursor: 'pointer',
              }}
            >
              ENTER
            </button>
            <button
              className="font-cinzel"
              onClick={() => setDoorConfirmOpen(false)}
              style={{
                fontSize: 16, letterSpacing: '0.3em', background: 'transparent',
                border: '0.5px solid rgba(160,140,200,0.3)', color: 'rgba(160,140,200,0.5)',
                padding: '10px 24px', cursor: 'pointer',
              }}
            >
              STAY
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          position: 'fixed', bottom: 120, left: '50%', transform: 'translateX(-50%)',
          width: 120, height: 120, zIndex: 55,
        }}
      >
        {[
          { dc: 0, dr: -1, top: 0, left: 40 },
          { dc: -1, dr: 0, top: 40, left: 0 },
          { dc: 1, dr: 0, top: 40, left: 80 },
          { dc: 0, dr: 1, top: 80, left: 40 },
        ].map((b, i) => (
          <button
            key={i}
            onPointerDown={(e) => { e.preventDefault(); heldKeysRef.current.add(`dpad-${b.dc}-${b.dr}`); }}
            onPointerUp={(e) => { e.preventDefault(); heldKeysRef.current.delete(`dpad-${b.dc}-${b.dr}`); }}
            onPointerLeave={(e) => { e.preventDefault(); heldKeysRef.current.delete(`dpad-${b.dc}-${b.dr}`); }}
            onPointerCancel={(e) => { e.preventDefault(); heldKeysRef.current.delete(`dpad-${b.dc}-${b.dr}`); }}
            style={{
              position: 'absolute', top: b.top, left: b.left, width: 40, height: 40,
              background: 'rgba(20,18,30,0.7)', border: '1px solid rgba(100,80,160,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: 0,
              userSelect: 'none', WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none', touchAction: 'none',
            }}
          >
            {i === 0 && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polygon points="7,2 13,12 1,12" fill="rgba(160,140,200,0.8)"/></svg>}
            {i === 1 && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polygon points="2,7 12,1 12,13" fill="rgba(160,140,200,0.8)"/></svg>}
            {i === 2 && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polygon points="12,7 2,1 2,13" fill="rgba(160,140,200,0.8)"/></svg>}
            {i === 3 && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polygon points="7,12 13,2 1,2" fill="rgba(160,140,200,0.8)"/></svg>}
          </button>
        ))}
      </div>

      <div
        className="font-mono"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(4,4,10,0.92)', borderTop: '0.5px solid rgba(169,140,255,0.3)',
          padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
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
          {stepsRemaining <= 20 && (
            <span style={{ color: 'rgba(160,140,200,0.4)', fontSize: 14, letterSpacing: '0.15em' }}>tap to exchange</span>
          )}
        </span>
        {currentLevel === 2 ? (
          <span style={{ color: '#c8963a' }}>FRAGMENTS {collected.size}/{config.fragmentsRequired}</span>
        ) : (
          <span style={{ color: '#c8963a' }}>CREDITS {credits}</span>
        )}
        <span style={{ color: '#5b4fd4' }}>LEVEL {String(currentLevel).padStart(2, '0')}</span>
        <ProfileButton onClick={openProfile} />
      </div>

      {exchangeOpen && (
        <div
          style={{
            position: 'fixed', left: 0, right: 0, bottom: 36, height: 220,
            background: 'rgba(4,4,10,0.97)', borderTop: '1px solid rgba(100,80,160,0.4)',
            zIndex: 70, animation: 'mazePanelSlide 280ms ease-out',
          }}
        >
          <button
            onClick={() => setExchangeOpen(false)}
            style={{
              position: 'absolute', top: 8, right: 12, background: 'transparent', border: 'none',
              color: 'rgba(160,140,200,0.4)', fontSize: 18, cursor: 'pointer', padding: 4,
            }}
          >
            ×
          </button>

          {exchangeError ? (
            <div
              className="font-fell italic"
              style={{
                position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)',
                textAlign: 'center', fontSize: 18, color: 'rgba(200,80,80,0.6)',
              }}
            >
              You have nothing left to give.
            </div>
          ) : (
            <>
              <div
                className="font-cinzel"
                style={{
                  textAlign: 'center', paddingTop: 16, fontSize: 16,
                  color: 'rgba(160,140,200,0.7)', letterSpacing: '0.2em',
                }}
              >
                Exchange Credits for Steps
              </div>
              <div
                className="font-mono"
                style={{ textAlign: 'center', marginTop: 8, fontSize: 14, color: 'rgba(160,140,200,0.4)' }}
              >
                1 CREDIT = 100 STEPS
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 48, marginTop: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, color: 'rgba(160,140,200,0.5)', letterSpacing: '0.18em' }}>CREDITS</div>
                  <div className="font-mono" style={{ fontSize: 20, color: '#c8963a', marginTop: 2 }}>{credits}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, color: 'rgba(160,140,200,0.5)', letterSpacing: '0.18em' }}>STEPS</div>
                  <div className="font-mono" style={{ fontSize: 20, color: '#e0ddd5', marginTop: 2 }}>{stepsRemaining}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                {[1, 5, 10].map((n) => {
                  const sel = selectedCredits === n;
                  return (
                    <button
                      key={n}
                      className="font-cinzel"
                      onClick={() => setSelectedCredits(n)}
                      style={{
                        fontSize: 14, letterSpacing: '0.15em', padding: '8px 12px',
                        border: `0.5px solid ${sel ? '#c8963a' : 'rgba(100,80,160,0.4)'}`,
                        background: 'rgba(100,80,160,0.08)',
                        color: sel ? '#c8963a' : 'rgba(160,140,200,0.7)', cursor: 'pointer',
                      }}
                    >
                      {n} CREDIT{n > 1 ? 'S' : ''} → {n * 100} STEPS
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                <button
                  className="font-cinzel"
                  onClick={() => {
                    if (credits < selectedCredits) {
                      setExchangeError(true);
                      window.setTimeout(() => { setExchangeOpen(false); setExchangeError(false); }, 2000);
                      return;
                    }
                    const newCredits = credits - selectedCredits;
                    setCredits(newCredits);
                    const gained = selectedCredits * 100;
                    stepsRemainingRef.current += gained;
                    setStepsRemaining(stepsRemainingRef.current);
                    if (user) updateUser(user.id, {
                      credits: newCredits,
                      steps_remaining: stepsRemainingRef.current,
                    });
                    setExchangeOpen(false);
                  }}
                  style={{
                    fontSize: 16, letterSpacing: '0.3em', background: '#c8963a',
                    color: '#04040a', padding: '10px 32px', border: 'none', cursor: 'pointer',
                  }}
                >
                  CONFIRM
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {activeFragment && (
        <FragmentOverlay
          prime={activeFragment.prime}
          index={activeFragment.index}
          registrationNumber={registrationNumber ?? 0}
          onContinue={() => setActiveFragment(null)}
        />
      )}

      <ProfileOverlay isOpen={profileOpenDisplay} onClose={closeProfile} />

      {paywallOpen && (
        <PaywallOverlay
          onContinue={() => {
            setPaywallOpen(false);
            navigate('/village');
          }}
          onDismiss={() => {
            setPaywallOpen(false);
            navigate('/village');
          }}
        />
      )}
    </div>
  );
};

export default Maze;
