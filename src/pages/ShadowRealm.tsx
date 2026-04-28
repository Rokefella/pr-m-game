import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// player ID sourced from localStorage
import { fetchOrCreateUser, updateUser } from '@/lib/userData';
import { restUpdate } from '@/lib/supabaseRest';
import MerchantOverlay, { MerchantCharacter, type MerchantItem } from '@/components/MerchantOverlay';

// Shadow Realm Merchant
const SHADOW_MERCHANT = { x: 600, y: 400 };
const SHADOW_MERCHANT_LINES = [
  'The other side has its own economy.',
  'You came far. I noticed.',
  'Credits spend the same here.',
];
const MEMORY_FRAGMENTS = [
  'She found coordinate 89 on a Tuesday. She did not go home that night.',
  'The instrument was never designed to open. It opened anyway.',
  'Claire was eleven when she first saw the spiral. She asked what it was for.',
  "Alexandra's last log entry: The mathematics is aware of us.",
  'The door was not in the original schematics.',
];

type Rect = { id: string | number; x: number; y: number; w: number; h: number };
type Trail = { x: number; y: number; id: number };

const MAP_W = 2200;
const MAP_H = 1400;
const CX = 1100;
const CY = 700;
const STEP = 12;

// Ring radii
const OUTERMOST_RX = 900, OUTERMOST_RY = 500;
const OUTER_RX = 600, OUTER_RY = 340;
const MIDDLE_RX = 380, MIDDLE_RY = 220;
const INNER_RX = 200, INNER_RY = 120;

// ---------- Type A: interactive ----------
const A_23 = { id: 23 as const, x: 720, y: 675, w: 70, h: 50, color: 'rgba(34,197,94,0.8)', bg: 'rgba(74,158,255,0.06)', label: 12 };
const A_47 = { id: 47 as const, x: 1580, y: 780, w: 70, h: 50, color: 'rgba(22,163,74,0.8)', bg: 'rgba(29,158,117,0.06)', label: 12 };
const A_89 = { id: 89 as const, x: 1055, y: 440, w: 90, h: 70, color: '#f97316', bg: 'rgba(200,150,58,0.06)', label: 14 };
const TYPE_A = [A_23, A_47, A_89];

// Easter egg whispers — assigned to nearest building (any type) of these map points
const WHISPER_POINTS: { p: [number, number]; msg: string }[] = [
  { p: [300, 200], msg: 'The mathematics knew you were coming.' },
  { p: [1800, 300], msg: 'She left something here.' },
  { p: [400, 900], msg: 'Junction 89 is closer than you think.' },
  { p: [1900, 800], msg: 'You have been here before.' },
  { p: [1100, 200], msg: 'The spiral does not forget.' },
  { p: [200, 600], msg: 'Something emerged here.' },
  { p: [1900, 500], msg: 'Count the doors.' },
  { p: [600, 1200], msg: '89 is not the end.' },
  { p: [1500, 1100], msg: 'The order was never real.' },
  { p: [1100, 1100], msg: 'This is not the door through which I came in.' },
];

// ---------- Helpers ----------
const rectsOverlap = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  pad = 0,
) =>
  a.x - pad < b.x + b.w &&
  a.x + a.w + pad > b.x &&
  a.y - pad < b.y + b.h &&
  a.y + a.h + pad > b.y;

const inside = (px: number, py: number, r: { x: number; y: number; w: number; h: number }) =>
  px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;

// Seeded LCG (Numerical Recipes)
const makeRng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
};

// ---------- Generate Type B (50) and Type C (120 + extras) and Outermost rim ----------
const A_PADDING = 4;
const B_GAP = 18;
const C_GAP = 12;
const C_VS_AB_PAD = 4;

const generateBuildings = () => {
  const rng = makeRng(0xC0FFEE);
  const B: Rect[] = [];
  const C: Rect[] = [];
  const RIM: Rect[] = [];

  const placeOnEllipse = (
    rx: number,
    ry: number,
    angleDeg: number,
    jitter: number,
    minW: number,
    maxW: number,
    minH: number,
    maxH: number,
    list: Rect[],
    against: Rect[][],
    gap: number,
    padA: number,
    idPrefix: string,
    idx: number,
  ) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const theta = (angleDeg * Math.PI) / 180;
      const jx = (rng() * 2 - 1) * jitter;
      const jy = (rng() * 2 - 1) * jitter;
      const w = Math.round(minW + rng() * (maxW - minW));
      const h = Math.round(minH + rng() * (maxH - minH));
      const cx = CX + rx * Math.cos(theta) + jx;
      const cy = CY + ry * Math.sin(theta) + jy;
      const x = Math.round(cx - w / 2);
      const y = Math.round(cy - h / 2);
      const cand = { id: `${idPrefix}${idx}`, x, y, w, h };

      // bounds
      if (x < 6 || y < 6 || x + w > MAP_W - 6 || y + h > MAP_H - 6) continue;

      // skip if inside pupil
      const px = x + w / 2 - CX;
      const py = y + h / 2 - CY;
      if ((px * px) / (INNER_RX * INNER_RX) + (py * py) / (INNER_RY * INNER_RY) < 1) continue;

      // overlap A
      let bad = false;
      for (const a of TYPE_A) {
        if (rectsOverlap(cand, a, padA)) { bad = true; break; }
      }
      if (bad) continue;

      // overlap with provided lists
      for (const lst of against) {
        for (const r of lst) {
          if (rectsOverlap(cand, r, gap)) { bad = true; break; }
        }
        if (bad) break;
      }
      if (bad) continue;

      list.push(cand);
      return true;
    }
    return false;
  };

  // Type B: 36 around middle ring (every 10°) + 14 around inner-ish ring
  let bIdx = 0;
  for (let a = 0; a < 360; a += 10) {
    placeOnEllipse(MIDDLE_RX, MIDDLE_RY, a, 6, 35, 55, 25, 45, B, [B], B_GAP, A_PADDING, 'b', bIdx++);
  }
  // 14 on a ring slightly outside inner
  const innerB_RX = INNER_RX + 60;
  const innerB_RY = INNER_RY + 50;
  for (let i = 0; i < 14; i++) {
    const a = (i * 360) / 14;
    placeOnEllipse(innerB_RX, innerB_RY, a, 8, 35, 50, 25, 40, B, [B], B_GAP, A_PADDING, 'b', bIdx++);
  }

  // Type C: dense ring around outer (every 2°), small jitter
  let cIdx = 0;
  for (let a = 0; a < 360; a += 2) {
    placeOnEllipse(OUTER_RX, OUTER_RY, a, 3, 22, 36, 18, 28, C, [C, B], 4, C_VS_AB_PAD, 'c', cIdx++);
  }
  // 30 between outer/middle (two intermediate ellipses)
  const midOutA_RX = OUTER_RX * 0.85, midOutA_RY = OUTER_RY * 0.85;
  const midOutB_RX = OUTER_RX * 0.7, midOutB_RY = OUTER_RY * 0.7;
  for (let i = 0; i < 15; i++) {
    const a = (i * 360) / 15 + 6;
    placeOnEllipse(midOutA_RX, midOutA_RY, a, 10, 22, 38, 16, 28, C, [C, B], C_GAP, C_VS_AB_PAD, 'c', cIdx++);
  }
  for (let i = 0; i < 15; i++) {
    const a = (i * 360) / 15 + 12;
    placeOnEllipse(midOutB_RX, midOutB_RY, a, 10, 22, 36, 16, 26, C, [C, B], C_GAP, C_VS_AB_PAD, 'c', cIdx++);
  }
  // 18 between middle/inner (ring slightly outside inner)
  const midInRX = (MIDDLE_RX + INNER_RX) / 2 + 20;
  const midInRY = (MIDDLE_RY + INNER_RY) / 2 + 20;
  for (let i = 0; i < 18; i++) {
    const a = (i * 360) / 18 + 8;
    placeOnEllipse(midInRX, midInRY, a, 8, 20, 32, 14, 24, C, [C, B], C_GAP, C_VS_AB_PAD, 'c', cIdx++);
  }

  // 40 additional Type C scattered between OUTER and OUTERMOST rings
  const extraInnerRX = OUTER_RX + 40;
  const extraInnerRY = OUTER_RY + 30;
  const extraOuterRX = OUTERMOST_RX - 80;
  const extraOuterRY = OUTERMOST_RY - 60;
  for (let i = 0; i < 40; i++) {
    const a = (i * 360) / 40 + (rng() * 9);
    const t = rng();
    const rx = extraInnerRX + (extraOuterRX - extraInnerRX) * t;
    const ry = extraInnerRY + (extraOuterRY - extraInnerRY) * t;
    placeOnEllipse(rx, ry, a, 14, 22, 36, 16, 26, C, [C, B], C_GAP, C_VS_AB_PAD, 'c', cIdx++);
  }

  // Outermost rim: solid wall, building every 3°, 30x24, no navigable gaps
  for (let i = 0; i < 120; i++) {
    const angleDeg = i * 3;
    const theta = (angleDeg * Math.PI) / 180;
    const cx = CX + OUTERMOST_RX * Math.cos(theta);
    const cy = CY + OUTERMOST_RY * Math.sin(theta);
    const w = 30;
    const h = 24;
    const x = Math.round(cx - w / 2);
    const y = Math.round(cy - h / 2);
    if (x < 6 || y < 6 || x + w > MAP_W - 6 || y + h > MAP_H - 6) continue;
    RIM.push({ id: `rim${i}`, x, y, w, h });
  }

  return { B, C, RIM };
};

const { B: TYPE_B, C: TYPE_C, RIM: TYPE_RIM } = generateBuildings();
const OBSTACLES: Rect[] = [...TYPE_B, ...TYPE_C, ...TYPE_RIM];

// ---------- Forest blocks (outside outermost ring, hardcoded via seeded RNG) ----------
type ForestBlock = { x: number; y: number; w: number; h: number };
const generateForest = (): ForestBlock[] => {
  const rng = makeRng(0xF0FE57);
  const blocks: ForestBlock[] = [];
  const placed: ForestBlock[] = [];

  // 2 winding path corridors — each described as a series of points the path passes through.
  // Forest blocks within `pathRadius` of any segment are excluded.
  const paths: { pts: [number, number][]; radius: number }[] = [
    {
      pts: [
        [200, 80],
        [320, 220],
        [260, 380],
        [380, 520],
        [300, 660],
        [420, 780],
        [340, 940],
        [500, 1080],
      ],
      radius: 22,
    },
    {
      pts: [
        [2050, 120],
        [1920, 260],
        [2000, 420],
        [1880, 560],
        [1980, 720],
        [1860, 880],
        [1960, 1020],
        [1820, 1180],
      ],
      radius: 22,
    },
    {
      pts: [
        [600, 1320],
        [780, 1240],
        [960, 1300],
        [1140, 1240],
        [1320, 1300],
        [1500, 1230],
      ],
      radius: 20,
    },
  ];

  const distToSeg = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - ax, py - ay);
    let t = ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };

  const inPathCorridor = (x: number, y: number) => {
    for (const path of paths) {
      for (let i = 0; i < path.pts.length - 1; i++) {
        const [ax, ay] = path.pts[i];
        const [bx, by] = path.pts[i + 1];
        if (distToSeg(x, y, ax, ay, bx, by) < path.radius) return true;
      }
    }
    return false;
  };

  // Generate cluster centers, then place 4-8 blocks per cluster
  const targetCount = 300;
  let attempts = 0;
  while (blocks.length < targetCount && attempts < 6000) {
    attempts++;
    // Cluster center: random map point
    const ccx = rng() * (MAP_W - 40) + 20;
    const ccy = rng() * (MAP_H - 40) + 20;

    // Must be outside outermost ellipse
    const nx = (ccx - CX) / OUTERMOST_RX;
    const ny = (ccy - CY) / OUTERMOST_RY;
    if (nx * nx + ny * ny < 1.05) continue;

    if (inPathCorridor(ccx, ccy)) continue;

    const clusterSize = 4 + Math.floor(rng() * 5); // 4-8
    for (let i = 0; i < clusterSize && blocks.length < targetCount; i++) {
      // Position within ~30px of cluster center
      const offX = (rng() * 2 - 1) * 28;
      const offY = (rng() * 2 - 1) * 28;
      const x = Math.round(ccx + offX);
      const y = Math.round(ccy + offY);
      const w = 12 + Math.floor(rng() * 11); // 12-22
      const h = 12 + Math.floor(rng() * 7);  // 12-18

      if (x < 4 || y < 4 || x + w > MAP_W - 4 || y + h > MAP_H - 4) continue;

      // Outside outermost ellipse
      const cx = x + w / 2, cy = y + h / 2;
      const enx = (cx - CX) / OUTERMOST_RX;
      const eny = (cy - CY) / OUTERMOST_RY;
      if (enx * enx + eny * eny < 1.02) continue;

      if (inPathCorridor(cx, cy)) continue;

      // Avoid overlap with already placed forest (small gap)
      const cand = { x, y, w, h };
      let bad = false;
      for (const p of placed) {
        if (rectsOverlap(cand, p, 2)) { bad = true; break; }
      }
      if (bad) continue;

      blocks.push(cand);
      placed.push(cand);
    }
  }
  return blocks;
};
const FOREST = generateForest();

// Forest atmosphere text fragments
const FOREST_TEXTS: { x: number; y: number; t: string }[] = [
  { x: 150, y: 150, t: '∅' },
  { x: 1900, y: 200, t: '89' },
  { x: 100, y: 800, t: 'she stopped here' },
  { x: 2000, y: 900, t: 'the path ends' },
  { x: 300, y: 1250, t: 'do not follow' },
  { x: 1800, y: 1200, t: 'it found her first' },
  { x: 1100, y: 100, t: 'junction' },
  { x: 1100, y: 1320, t: 'this was not designed' },
];

// Eye whisper messages
const EYE_MESSAGES = [
  'You found the other side.',
  'The entity knows you are here.',
  'Come back on the 23rd.',
  'You have always been here.',
];
const EYE_RADIUS = 80;

// Map each whisper point to its nearest obstacle (by center distance)
const WHISPER_BY_RECT = new Map<Rect, string>();
for (const wp of WHISPER_POINTS) {
  let best: Rect | null = null;
  let bestD = Infinity;
  for (const o of OBSTACLES) {
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    const d = (cx - wp.p[0]) ** 2 + (cy - wp.p[1]) ** 2;
    if (d < bestD) { bestD = d; best = o; }
  }
  if (best && !WHISPER_BY_RECT.has(best)) WHISPER_BY_RECT.set(best, wp.msg);
}

// Compute valid spawn point — inside outermost ellipse, not overlapping buildings
const computeSpawn = (): { x: number; y: number } => {
  for (let i = 0; i < 100; i++) {
    // Spawn somewhere between OUTER ring and 85% of outermost (well inside boundary)
    const theta = Math.random() * Math.PI * 2;
    const t = 0.55 + Math.random() * 0.3; // 55%..85% out from center
    let x = CX + OUTERMOST_RX * t * Math.cos(theta);
    let y = CY + OUTERMOST_RY * t * Math.sin(theta);

    // Ensure inside outermost ellipse (scale to 85% if outside)
    const nx = (x - CX) / OUTERMOST_RX;
    const ny = (y - CY) / OUTERMOST_RY;
    if (nx * nx + ny * ny > 1) {
      const mag = Math.sqrt(nx * nx + ny * ny);
      x = CX + (x - CX) * (0.85 / mag);
      y = CY + (y - CY) * (0.85 / mag);
    }

    const playerRect = { x: x - 4, y: y - 4, w: 8, h: 8 };
    let collides = false;
    for (const o of OBSTACLES) {
      if (rectsOverlap(playerRect, o, 10)) { collides = true; break; }
    }
    if (!collides) {
      for (const a of TYPE_A) {
        if (rectsOverlap(playerRect, a, 10)) { collides = true; break; }
      }
    }
    if (!collides) return { x, y };
  }
  return { x: CX, y: CY };
};

const ShadowRealm = () => {
  const navigate = useNavigate();
  const user = useMemo(() => {
    if (typeof window === 'undefined') return null;
    let id = window.localStorage.getItem('praem_player_id');
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem('praem_player_id', id);
    }
    return { id };
  }, []);
  const navigatedRef = useRef(false);
  const feedbackTimer = useRef<number | null>(null);
  const trailIdRef = useRef(0);

  // Validated random spawn (computed once)
  const initialPosRef = useRef<{ x: number; y: number } | null>(null);
  if (initialPosRef.current === null) {
    initialPosRef.current = computeSpawn();
  }
  const initialPos = initialPosRef.current;
  const [player, setPlayer] = useState(initialPos);
  const playerRef = useRef(initialPos);
  const playerTargetRef = useRef(initialPos);
  const lastTrailPushRef = useRef<{ x: number; y: number } | null>(null);

  const [trail, setTrail] = useState<Trail[]>([]);
  const eyePupilRef = useRef({ x: 0, y: 0 });
  const [eyePupil, setEyePupil] = useState({ x: 0, y: 0 });
  const [feedback, setFeedback] = useState<{ id: 23 | 47 | null }>({ id: null });
  const [whisper, setWhisper] = useState<string | null>(null);
  const whisperTimer = useRef<number | null>(null);
  const lastWhisperIdxRef = useRef<number | null>(null);

  // Eye whisper state
  const [eyeMessage, setEyeMessage] = useState<string | null>(null);
  const eyeMessageIndexRef = useRef(0);
  const eyeTriggeredRef = useRef(false);
  const eyeTimer = useRef<number | null>(null);

  const [view, setView] = useState({ w: 390, h: 800 });
  useEffect(() => {
    const update = () => setView({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ---- Level / title state ----
  const TITLES_BY_LEVEL: Record<number, string> = {
    1: 'Wanderer',
    2: 'Fragment Seeker',
    3: 'The Initiated',
    4: 'Threshold Walker',
    5: 'One Who Returns',
    6: 'The Remembered',
    7: 'Junction Finder',
    8: 'The Spiral Knows',
    9: 'Almost There',
    10: 'First One Through',
  };
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentTitle, setCurrentTitle] = useState('Wanderer');
  const [auraColor, setAuraColor] = useState<string>('#5b4fd4');
  const [registrationNumber, setRegistrationNumber] = useState<number | null>(null);
  const [levelUpOverlay, setLevelUpOverlay] = useState<{ newLevel: number } | null>(null);
  const [overlaySelectedTitle, setOverlaySelectedTitle] = useState<string>('Wanderer');
  const [shadowFadeOut, setShadowFadeOut] = useState(false);
  const [exitConfirm, setExitConfirm] = useState<{ levelUp: boolean; nextLevel: number } | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [stepsRemaining, setStepsRemaining] = useState<number>(0);
  const [merchantOpen, setMerchantOpen] = useState(false);
  const merchantTriggerLockRef = useRef(false);
  const [memoryText, setMemoryText] = useState<string | null>(null);
  const memoryTimer = useRef<number | null>(null);

  const currentLevelRef = useRef(1);
  const mazeCompletedLevelRef = useRef(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const row = await fetchOrCreateUser(user.id);
      if (cancelled) return;
      setCurrentLevel(row.level);
      currentLevelRef.current = row.level;
      mazeCompletedLevelRef.current = row.maze_completed_level;
      setCredits(row.credits);
      setStepsRemaining(row.steps_remaining);
      setCurrentTitle(row.title);
      setOverlaySelectedTitle(row.title);
      if (row.aura_color) setAuraColor(row.aura_color);
      setRegistrationNumber(row.registration_number);

      if (row.levelup_pending) {
        const newLv = row.levelup_newlevel ?? row.level;
        const newTitle = TITLES_BY_LEVEL[newLv] || 'Wanderer';
        window.setTimeout(() => {
          if (cancelled) return;
          setLevelUpOverlay({ newLevel: newLv });
          setOverlaySelectedTitle(newTitle);
          updateUser(user.id, { title: newTitle });
          setCurrentTitle(newTitle);
        }, 2000);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);


  useEffect(() => {
    return () => {
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
      if (whisperTimer.current) window.clearTimeout(whisperTimer.current);
      if (eyeTimer.current) window.clearTimeout(eyeTimer.current);
    };
  }, []);

  const performExit = async (levelUp: boolean, nextLevel: number) => {
    if (levelUp && user) {
      await restUpdate('users', { level: nextLevel, maze_completed_level: 0 }, 'id', user.id);
      await restUpdate('users', { levelup_pending: true, levelup_newlevel: nextLevel }, 'id', user.id);
    }
    setShadowFadeOut(true);
    window.setTimeout(() => navigate('/village'), 800);
  };

  const triggerA = (nx: number, ny: number) => {
    if (inside(nx, ny, A_89)) {
      if (!navigatedRef.current && !exitConfirm) {
        const cur = Number(currentLevelRef.current);
        const completed = Number(mazeCompletedLevelRef.current);
        const levelUp = completed === cur;
        setExitConfirm({ levelUp, nextLevel: cur + 1 });
      }
      return true;
    }
    if (inside(nx, ny, A_23)) {
      setFeedback({ id: 23 });
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
      feedbackTimer.current = window.setTimeout(() => setFeedback({ id: null }), 1500);
      return true;
    }
    if (inside(nx, ny, A_47)) {
      setFeedback({ id: 47 });
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
      feedbackTimer.current = window.setTimeout(() => setFeedback({ id: null }), 1500);
      return true;
    }
    return false;
  };

  const move = (dx: number, dy: number) => {
    const prev = playerTargetRef.current;
    const nx = Math.max(0, Math.min(MAP_W, prev.x + dx));
    const ny = Math.max(0, Math.min(MAP_H, prev.y + dy));

    // Type A: bumping fires response but cancels move
    for (const a of TYPE_A) {
      if (inside(nx, ny, a)) {
        triggerA(nx, ny);
        return;
      }
    }

    // Obstacles (B + C + RIM) with 2px padding — also check whisper trigger on any whispered building
    for (const o of OBSTACLES) {
      if (
        nx >= o.x - 2 &&
        nx <= o.x + o.w + 2 &&
        ny >= o.y - 2 &&
        ny <= o.y + o.h + 2
      ) {
        const msg = WHISPER_BY_RECT.get(o);
        if (msg !== undefined) {
          const oIdx = OBSTACLES.indexOf(o);
          if (lastWhisperIdxRef.current !== oIdx) {
            lastWhisperIdxRef.current = oIdx;
            setWhisper(msg);
            if (whisperTimer.current) window.clearTimeout(whisperTimer.current);
            whisperTimer.current = window.setTimeout(() => {
              setWhisper(null);
              lastWhisperIdxRef.current = null;
            }, 2500);
          }
        }
        return;
      }
    }

    // Hard ellipse boundary: clamp to outermost ellipse +20px buffer
    const BX = OUTERMOST_RX + 20;
    const BY = OUTERMOST_RY + 20;
    let fx = nx, fy = ny;
    const ex = (fx - CX) / BX;
    const ey = (fy - CY) / BY;
    const e2 = ex * ex + ey * ey;
    if (e2 > 1) {
      const mag = Math.sqrt(e2);
      fx = CX + (fx - CX) / mag;
      fy = CY + (fy - CY) / mag;
    }

    // Commit target
    playerTargetRef.current = { x: fx, y: fy };

    // Merchant proximity → open overlay (40px)
    const dm = Math.hypot(fx - SHADOW_MERCHANT.x, fy - SHADOW_MERCHANT.y);
    if (dm <= 40) {
      if (!merchantTriggerLockRef.current) {
        merchantTriggerLockRef.current = true;
        setMerchantOpen(true);
      }
    } else {
      merchantTriggerLockRef.current = false;
    }
  };

  // Keyboard arrow keys — held-keys system for smooth diagonal movement
  const heldKeysRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const ARROWS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
    const onDown = (e: KeyboardEvent) => {
      if (ARROWS.has(e.key)) {
        e.preventDefault();
        heldKeysRef.current.add(e.key);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      heldKeysRef.current.delete(e.key);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // Player lerp loop — visual chases target at 0.18/frame
  useEffect(() => {
    let raf = 0;
    let keyFrameCounter = 0;
    const loop = () => {
      // Held-keys movement — process every 4 frames (~15Hz) for consistent speed
      keyFrameCounter++;
      if (keyFrameCounter >= 4) {
        keyFrameCounter = 0;
        const held = heldKeysRef.current;
        let kdx = 0, kdy = 0;
        if (held.has('ArrowLeft') || held.has('dpad--1-0')) kdx -= STEP;
        if (held.has('ArrowRight') || held.has('dpad-1-0')) kdx += STEP;
        if (held.has('ArrowUp') || held.has('dpad-0--1')) kdy -= STEP;
        if (held.has('ArrowDown') || held.has('dpad-0-1')) kdy += STEP;
        if (kdx !== 0 && kdy !== 0) {
          kdx *= 0.707;
          kdy *= 0.707;
        }
        if (kdx !== 0 || kdy !== 0) {
          move(kdx, kdy);
        }
      }

      const target = playerTargetRef.current;
      const cur = playerRef.current;
      const dx = target.x - cur.x;
      const dy = target.y - cur.y;
      const dist = Math.hypot(dx, dy);

      let moved = false;
      if (dist < 0.5) {
        if (cur.x !== target.x || cur.y !== target.y) {
          playerRef.current = { x: target.x, y: target.y };
          setPlayer(playerRef.current);
          moved = Math.abs(target.x - cur.x) > 0.5 || Math.abs(target.y - cur.y) > 0.5;
        }
      } else {
        const nx = cur.x + dx * 0.18;
        const ny = cur.y + dy * 0.18;
        moved = Math.abs(nx - cur.x) > 0.5 || Math.abs(ny - cur.y) > 0.5;
        playerRef.current = { x: nx, y: ny };
        setPlayer(playerRef.current);
      }

      // Push previous visual position to trail on every frame the player moves
      if (moved) {
        const id = ++trailIdRef.current;
        const px = cur.x;
        const py = cur.y;
        setTrail((t) => {
          const next = [...t, { x: px, y: py, id }];
          return next.length > 80 ? next.slice(next.length - 80) : next;
        });
      }

      // Eye pupil tracking
      const pv = playerRef.current;
      const evx = pv.x - CX;
      const evy = pv.y - CY;
      const edist = Math.hypot(evx, evy);
      let etx: number, ety: number;
      if (edist > 400) {
        const tnow = Date.now();
        etx = Math.cos(tnow / 4000) * 2;
        ety = Math.sin(tnow / 4000) * 2;
      } else if (edist < 0.001) {
        etx = 0;
        ety = 0;
      } else {
        const mag = Math.min(edist / 50, 1) * 8;
        etx = (evx / edist) * mag;
        ety = (evy / edist) * mag;
      }
      const ep = eyePupilRef.current;
      const npx = ep.x + (etx - ep.x) * 0.08;
      const npy = ep.y + (ety - ep.y) * 0.08;
      if (Math.abs(npx - ep.x) > 0.01 || Math.abs(npy - ep.y) > 0.01) {
        eyePupilRef.current = { x: npx, y: npy };
        setEyePupil(eyePupilRef.current);
      }

      // Eye proximity whisper
      if (edist <= EYE_RADIUS) {
        if (!eyeTriggeredRef.current) {
          eyeTriggeredRef.current = true;
          const idx = eyeMessageIndexRef.current;
          const msg = EYE_MESSAGES[idx];
          eyeMessageIndexRef.current = (idx + 1) % EYE_MESSAGES.length;
          setEyeMessage(msg);
          if (eyeTimer.current) window.clearTimeout(eyeTimer.current);
          eyeTimer.current = window.setTimeout(() => setEyeMessage(null), 3000);
        }
      } else {
        eyeTriggeredRef.current = false;
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Smooth camera (lerp via rAF)
  const initialCam = (() => {
    const tx = Math.min(0, Math.max(view.w - MAP_W, view.w / 2 - player.x));
    const ty = Math.min(0, Math.max(view.h - MAP_H, view.h / 2 - player.y));
    return { x: tx, y: ty };
  })();
  const cameraRef = useRef(initialCam);
  const [camera, setCamera] = useState(initialCam);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const targetX = Math.min(0, Math.max(view.w - MAP_W, view.w / 2 - playerRef.current.x));
      const targetY = Math.min(0, Math.max(view.h - MAP_H, view.h / 2 - playerRef.current.y));
      const dx = targetX - cameraRef.current.x;
      const dy = targetY - cameraRef.current.y;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
        if (cameraRef.current.x !== targetX || cameraRef.current.y !== targetY) {
          cameraRef.current = { x: targetX, y: targetY };
          setCamera(cameraRef.current);
        }
      } else {
        cameraRef.current = {
          x: cameraRef.current.x + dx * 0.12,
          y: cameraRef.current.y + dy * 0.12,
        };
        setCamera(cameraRef.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [view]);

  const dpadBtn: React.CSSProperties = {
    width: 44,
    height: 44,
    background: 'rgba(34,197,94,0.15)',
    border: '0.5px solid rgba(34,197,94,0.4)',
    borderRadius: 4,
    color: 'rgba(120,200,140,0.8)',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    touchAction: 'none',
  };

  const dpadHandlers = (dc: number, dr: number) => {
    const key = `dpad-${dc}-${dr}`;
    return {
      onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); heldKeysRef.current.add(key); },
      onPointerUp: () => { heldKeysRef.current.delete(key); },
      onPointerLeave: () => { heldKeysRef.current.delete(key); },
      onPointerCancel: () => { heldKeysRef.current.delete(key); },
    };
  };

  // Per-Type-A depth styling for ShadowRealm (green palette + orange return)
  const TYPE_A_DEPTH: Record<number, {
    gradient: string;
    borderTop: string;
    borderLeft: string;
    borderBottom: string;
    borderRight: string;
    boxShadow: string;
  }> = {
    23: {
      gradient: 'linear-gradient(135deg, rgba(34,197,94,0.22) 0%, rgba(34,197,94,0.14) 60%, rgba(10,60,30,0.25) 100%)',
      borderTop: '1px solid rgba(34,197,94,0.55)',
      borderLeft: '1px solid rgba(34,197,94,0.45)',
      borderBottom: '0.5px solid rgba(5,20,10,0.9)',
      borderRight: '0.5px solid rgba(8,25,15,0.8)',
      boxShadow: 'inset -3px -3px 8px rgba(0,0,0,0.35), inset 1px 1px 4px rgba(34,197,94,0.08)',
    },
    47: {
      gradient: 'linear-gradient(135deg, rgba(34,197,94,0.22) 0%, rgba(34,197,94,0.14) 60%, rgba(10,60,30,0.25) 100%)',
      borderTop: '1px solid rgba(34,197,94,0.55)',
      borderLeft: '1px solid rgba(34,197,94,0.45)',
      borderBottom: '0.5px solid rgba(5,20,10,0.9)',
      borderRight: '0.5px solid rgba(8,25,15,0.8)',
      boxShadow: 'inset -3px -3px 8px rgba(0,0,0,0.35), inset 1px 1px 4px rgba(34,197,94,0.08)',
    },
    89: {
      gradient: 'linear-gradient(135deg, rgba(249,115,22,0.22) 0%, rgba(249,115,22,0.14) 60%, rgba(80,30,5,0.25) 100%)',
      borderTop: '1px solid rgba(249,115,22,0.55)',
      borderLeft: '1px solid rgba(249,115,22,0.45)',
      borderBottom: '0.5px solid rgba(40,15,5,0.9)',
      borderRight: '0.5px solid rgba(40,15,5,0.8)',
      boxShadow: 'inset -3px -3px 8px rgba(0,0,0,0.35), inset 1px 1px 4px rgba(249,115,22,0.08)',
    },
  };

  const renderTypeA = (b: typeof A_23 | typeof A_47 | typeof A_89, pulsing: boolean) => {
    const d = TYPE_A_DEPTH[b.id];
    return (
      <div
        key={`a-${b.id}`}
        style={{
          position: 'absolute',
          left: b.x,
          top: b.y,
          width: b.w,
          height: b.h,
          background: d.gradient,
          borderTop: d.borderTop,
          borderLeft: d.borderLeft,
          borderBottom: d.borderBottom,
          borderRight: d.borderRight,
          boxShadow: d.boxShadow,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          animation: pulsing ? 'villagePulse 2s ease-in-out infinite' : undefined,
          zIndex: 3,
        }}
      >
        <span className="font-mono" style={{ fontSize: b.label, color: b.color }}>
          {b.id}
        </span>
        {(b.id === 23 || b.id === 47) && feedback.id === b.id && (
          <p
            className="font-fell italic"
            style={{
              fontSize: 10,
              color: 'rgba(120,200,140,0.5)',
              marginTop: 4,
              animation: 'villageNotYet 1.5s ease-out forwards',
            }}
          >
            Not in this realm.
          </p>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#04040a',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes villagePulse { 0%,100% { opacity:.4 } 50% { opacity:1 } }
        @keyframes villageIdle  { 0%,100% { transform: scale(1) } 50% { transform: scale(1.15) } }
        @keyframes villageNotYet { 0% { opacity:.6 } 80% { opacity:.6 } 100% { opacity:0 } }
      `}</style>

      {/* Map layer */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: MAP_W,
          height: MAP_H,
          transform: `translate(${camera.x}px, ${camera.y}px)`,
          willChange: 'transform',
        }}
      >
        {/* Grid overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(20,120,50,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(20,120,50,0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Outermost ring outline */}
        <div
          style={{
            position: 'absolute',
            left: CX - OUTERMOST_RX,
            top: CY - OUTERMOST_RY,
            width: OUTERMOST_RX * 2,
            height: OUTERMOST_RY * 2,
            border: '0.5px solid rgba(20,120,50,0.05)',
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        {/* Outer ring outline */}
        <div
          style={{
            position: 'absolute',
            left: CX - OUTER_RX,
            top: CY - OUTER_RY,
            width: OUTER_RX * 2,
            height: OUTER_RY * 2,
            border: '0.5px solid rgba(20,120,50,0.06)',
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        {/* Middle ring outline */}
        <div
          style={{
            position: 'absolute',
            left: CX - MIDDLE_RX,
            top: CY - MIDDLE_RY,
            width: MIDDLE_RX * 2,
            height: MIDDLE_RY * 2,
            border: '0.5px solid rgba(20,120,50,0.08)',
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        {/* Inner ring (pupil) outline */}
        <div
          style={{
            position: 'absolute',
            left: CX - INNER_RX,
            top: CY - INNER_RY,
            width: INNER_RX * 2,
            height: INNER_RY * 2,
            border: '0.5px solid rgba(20,120,50,0.10)',
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Forest blocks (outside outermost ring) */}
        {FOREST.map((f, i) => (
          <div
            key={`f-${i}`}
            style={{
              position: 'absolute',
              left: f.x,
              top: f.y,
              width: f.w,
              height: f.h,
              border: '0.5px solid rgba(40,100,60,0.25)',
              background: 'rgba(30,80,50,0.10)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        ))}

        {/* Forest atmosphere text fragments */}
        {FOREST_TEXTS.map((ft, i) => (
          <span
            key={`ft-${i}`}
            className="font-fell italic"
            style={{
              position: 'absolute',
              left: ft.x,
              top: ft.y,
              fontSize: 10,
              color: 'rgba(40,100,60,0.20)',
              pointerEvents: 'none',
              zIndex: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {ft.t}
          </span>
        ))}

        {/* Watching eye in town square */}
        <svg
          width={60}
          height={40}
          style={{
            position: 'absolute',
            left: CX - 30,
            top: CY - 20,
            pointerEvents: 'none',
            zIndex: 1,
            overflow: 'visible',
          }}
        >
          <ellipse
            cx={30}
            cy={20}
            rx={20}
            ry={12}
            stroke="rgba(120,200,140,0.4)"
            strokeWidth={0.5}
            fill="none"
          />
          <circle
            cx={30 + eyePupil.x}
            cy={20 + eyePupil.y}
            r={3.5}
            fill="#16a34a"
          />
        </svg>

        {/* Outermost rim buildings */}
        {TYPE_RIM.map((b) => (
          <div
            key={`rim-${b.id}`}
            style={{
              position: 'absolute',
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              border: '0.5px solid rgba(20,120,50,0.25)',
              background: 'rgba(20,120,50,0.07)',
              zIndex: 1,
            }}
          />
        ))}

        {/* Type C buildings */}
        {TYPE_C.map((b) => (
          <div
            key={`c-${b.id}`}
            style={{
              position: 'absolute',
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              background: 'linear-gradient(135deg, rgba(34,197,94,0.108) 0%, rgba(20,120,50,0.072) 60%, rgba(5,40,15,0.132) 100%)',
              borderTop: '1px solid rgba(34,197,94,0.30)',
              borderLeft: '1px solid rgba(34,197,94,0.24)',
              borderBottom: '0.5px solid rgba(5,20,10,0.54)',
              borderRight: '0.5px solid rgba(8,25,15,0.48)',
              boxShadow: 'inset -3px -3px 8px rgba(0,0,0,0.21), inset 1px 1px 4px rgba(34,197,94,0.036)',
              zIndex: 1,
            }}
          />
        ))}

        {/* Type B buildings */}
        {TYPE_B.map((b) => (
          <div
            key={`b-${b.id}`}
            style={{
              position: 'absolute',
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              background: 'linear-gradient(135deg, rgba(34,197,94,0.18) 0%, rgba(20,120,50,0.12) 60%, rgba(5,40,15,0.22) 100%)',
              borderTop: '1px solid rgba(34,197,94,0.50)',
              borderLeft: '1px solid rgba(34,197,94,0.40)',
              borderBottom: '0.5px solid rgba(5,20,10,0.9)',
              borderRight: '0.5px solid rgba(8,25,15,0.8)',
              boxShadow: 'inset -3px -3px 8px rgba(0,0,0,0.35), inset 1px 1px 4px rgba(34,197,94,0.06)',
              zIndex: 2,
            }}
          />
        ))}

        {/* Type A buildings */}
        {renderTypeA(A_23, false)}
        {renderTypeA(A_47, false)}
        {renderTypeA(A_89, true)}

        {/* Trail glowing polyline (last 80 positions, fades to tail) */}
        {trail.length >= 2 && (
          <svg
            width={MAP_W}
            height={MAP_H}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            <defs>
              <linearGradient
                id="trailGrad"
                gradientUnits="userSpaceOnUse"
                x1={trail[0].x}
                y1={trail[0].y}
                x2={player.x}
                y2={player.y}
              >
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <polyline
              points={[...trail.map((p) => `${p.x},${p.y}`), `${player.x},${player.y}`].join(' ')}
              fill="none"
              stroke="url(#trailGrad)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {/* Merchant character */}
        <MerchantCharacter x={SHADOW_MERCHANT.x} y={SHADOW_MERCHANT.y} palette="orange" />

        {/* Player dot */}
        <div
          style={{
            position: 'absolute',
            left: player.x - 4,
            top: player.y - 4,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: auraColor,
            boxShadow: `0 0 8px ${auraColor}80`,
            animation: 'villageIdle 1.5s ease-in-out infinite',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
      </div>

      {/* Entity quote (screen-fixed) */}
      <p
        className="font-fell italic"
        style={{
          position: 'absolute',
          top: 24,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 17,
          margin: 0,
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        You are inside it now.
      </p>

      {/* Easter egg whisper */}
      {whisper && (
        <p
          key={whisper}
          className="font-fell italic"
          style={{
            position: 'fixed',
            top: '18%',
            left: 0,
            width: '100%',
            textAlign: 'center',
            fontSize: 20,
            textShadow: '0 0 12px rgba(34,197,94,0.6)',
            margin: 0,
            zIndex: 50,
            pointerEvents: 'none',
            animation: 'villageNotYet 2.5s ease-out forwards',
          }}
        >
          {whisper}
        </p>
      )}


      <div
        style={{
          position: 'absolute',
          bottom: 70,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 44px)',
          gridTemplateRows: 'repeat(3, 44px)',
          gap: 4,
          zIndex: 11,
        }}
      >
        <div />
        <div
          role="button"
          aria-label="Up"
          style={dpadBtn}
          {...dpadHandlers(0, -1)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polygon points="7,2 13,12 1,12" fill="rgba(160,140,200,0.8)"/></svg>
        </div>
        <div />
        <div
          role="button"
          aria-label="Left"
          style={dpadBtn}
          {...dpadHandlers(-1, 0)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polygon points="2,7 12,1 12,13" fill="rgba(160,140,200,0.8)"/></svg>
        </div>
        <div />
        <div
          role="button"
          aria-label="Right"
          style={dpadBtn}
          {...dpadHandlers(1, 0)}
        >
          ►
        </div>
        <div />
        <div
          role="button"
          aria-label="Down"
          style={dpadBtn}
          {...dpadHandlers(0, 1)}
        >
          ▼
        </div>
        <div />
      </div>

      {/* HUD bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(4,4,10,0.92)',
          borderTop: '0.5px solid rgba(34,197,94,0.3)',
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 12,
        }}
      >
        <span className="font-mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(34,197,94,0.6)' }}>
          SHADOW
        </span>
        <span className="font-mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: '#f97316' }}>
          FRAGMENTS 5/5
        </span>
        <span className="font-mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(34,197,94,0.7)' }}>
          LEVEL&nbsp;&nbsp;{String(currentLevel).padStart(2, '0')}
        </span>
      </div>

      {/* Registration number — top-right */}
      {registrationNumber !== null && (
        <div
          className="font-mono"
          style={{
            position: 'fixed',
            top: 12,
            right: 14,
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'rgba(34,197,94,0.7)',
            zIndex: 15,
            pointerEvents: 'none',
          }}
        >
          #{String(registrationNumber).padStart(4, '0')}
        </div>
      )}

      {/* Shadow Realm fade-out on level exit */}
      {shadowFadeOut && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#04040a',
            zIndex: 250,
            opacity: 0,
            animation: 'shadowFadeOut 800ms ease-in forwards',
            pointerEvents: 'none',
          }}
        />
      )}

      <style>{`@keyframes shadowFadeOut { from { opacity: 0 } to { opacity: 1 } }
        @keyframes exitConfirmFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes exitEyeFade { from { opacity: 0 } to { opacity: 1 } }
      `}</style>

      {/* EXIT CONFIRMATION OVERLAY */}
      {exitConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(4,4,10,0.92)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            animation: 'exitConfirmFade 400ms ease-out forwards',
          }}
        >
          <svg
            width={56}
            height={32}
            viewBox="-28 -16 56 32"
            style={{ opacity: 0, animation: 'exitEyeFade 500ms ease-out 100ms forwards' }}
          >
            <ellipse cx={0} cy={0} rx={24} ry={14} stroke="rgba(249,115,22,0.5)" strokeWidth={1} fill="none" />
            <circle cx={0} cy={0} r={4} fill="#f97316" />
          </svg>
          <p
            className="font-fell italic"
            style={{ marginTop: 20, fontSize: 18, color: 'rgba(120,200,140,0.8)', textAlign: 'center', maxWidth: '85vw' }}
          >
            You are leaving the Shadow Realm.
          </p>
          <p
            className="font-fell italic"
            style={{ marginTop: 10, fontSize: 13, color: 'rgba(120,200,140,0.4)', textAlign: 'center', maxWidth: '85vw' }}
          >
            You cannot return without navigating the maze again.
          </p>
          {exitConfirm.levelUp && (
            <p
              className="font-cinzel"
              style={{ marginTop: 16, fontSize: 12, color: '#f97316', letterSpacing: '0.2em', textAlign: 'center' }}
            >
              YOU WILL ADVANCE TO LEVEL {exitConfirm.nextLevel}.
            </p>
          )}
          <div style={{ marginTop: 28, display: 'flex', gap: 16 }}>
            <button
              className="font-cinzel"
              onClick={() => {
                if (navigatedRef.current) return;
                navigatedRef.current = true;
                const { levelUp, nextLevel } = exitConfirm;
                setExitConfirm(null);
                performExit(levelUp, nextLevel);
              }}
              style={{
                fontSize: 11,
                letterSpacing: '0.28em',
                background: '#f97316',
                color: '#04040a',
                padding: '10px 24px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              LEAVE
            </button>
            <button
              className="font-cinzel"
              onClick={() => setExitConfirm(null)}
              style={{
                fontSize: 11,
                letterSpacing: '0.28em',
                background: 'transparent',
                border: '0.5px solid rgba(120,200,140,0.3)',
                color: 'rgba(120,200,140,0.5)',
                padding: '10px 24px',
                cursor: 'pointer',
              }}
            >
              STAY
            </button>
          </div>
        </div>
      )}

            {/* LEVEL UP OVERLAY */}
      {levelUpOverlay && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(4,4,10,0.96)',
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'villageLevelUpFade 600ms ease-out',
            padding: 24,
          }}
        >
          <style>{`
            @keyframes villageLevelUpFade { from { opacity: 0 } to { opacity: 1 } }
            @keyframes villageLevelUpEye { from { opacity: 0 } to { opacity: 1 } }
            @keyframes villageLevelUpText {
              0% { opacity: 0; transform: translateY(8px) }
              100% { opacity: 1; transform: translateY(0) }
            }
            @keyframes villageLevelPulse { 0%,100% { opacity: 0.85 } 50% { opacity: 1 } }
          `}</style>

          <svg width={120} height={80} style={{ overflow: 'visible', animation: 'villageLevelUpEye 600ms ease-out' }}>
            <ellipse cx={60} cy={40} rx={40} ry={24} stroke="rgba(120,200,140,0.5)" strokeWidth={1} fill="none" />
            <circle cx={60} cy={40} r={6} fill="#16a34a" />
          </svg>

          <div
            className="font-cinzel"
            style={{
              fontSize: 48,
              color: '#f97316',
              marginTop: 24,
              animation: 'villageLevelUpText 400ms ease-out 400ms both, villageLevelPulse 1.2s ease-in-out 800ms infinite',
              letterSpacing: '0.12em',
            }}
          >
            LEVEL {levelUpOverlay.newLevel}
          </div>

          <div
            className="font-fell italic"
            style={{
              fontSize: 14,
              color: 'rgba(120,200,140,0.5)',
              marginTop: 24,
              animation: 'villageLevelUpText 400ms ease-out 800ms both',
            }}
          >
            New title unlocked:
          </div>
          <div
            className="font-cinzel"
            style={{
              fontSize: 20,
              color: 'rgba(120,200,140,0.9)',
              marginTop: 8,
              animation: 'villageLevelUpText 400ms ease-out 1000ms both',
              letterSpacing: '0.08em',
            }}
          >
            {TITLES_BY_LEVEL[levelUpOverlay.newLevel] || 'Wanderer'}
          </div>

          <div
            className="font-cinzel"
            style={{
              fontSize: 10,
              color: 'rgba(120,200,140,0.4)',
              letterSpacing: '0.2em',
              marginTop: 20,
              animation: 'villageLevelUpText 400ms ease-out 1200ms both',
            }}
          >
            Select your title:
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'center',
              marginTop: 12,
              maxWidth: 360,
              animation: 'villageLevelUpText 400ms ease-out 1400ms both',
            }}
          >
            {Array.from({ length: levelUpOverlay.newLevel }, (_, i) => i + 1).map((lv) => {
              const t = TITLES_BY_LEVEL[lv];
              const sel = overlaySelectedTitle === t;
              return (
                <button
                  key={lv}
                  className="font-cinzel"
                  onClick={() => {
                    setOverlaySelectedTitle(t);
                    if (user) updateUser(user.id, { title: t });
                    setCurrentTitle(t);
                  }}
                  style={{
                    fontSize: 10,
                    padding: '6px 14px',
                    border: `0.5px solid ${sel ? '#f97316' : 'rgba(120,200,140,0.3)'}`,
                    borderRadius: 2,
                    color: sel ? '#f97316' : 'rgba(120,200,140,0.6)',
                    background: 'transparent',
                    cursor: 'pointer',
                    letterSpacing: '0.1em',
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>

          <button
            className="font-cinzel"
            onClick={() => {
              if (user) updateUser(user.id, {
                title: overlaySelectedTitle,
                levelup_pending: false,
                levelup_newlevel: null,
              });
              setCurrentLevel(levelUpOverlay.newLevel);
              currentLevelRef.current = levelUpOverlay.newLevel;
              setLevelUpOverlay(null);
            }}
            style={{
              fontSize: 11,
              letterSpacing: '0.28em',
              background: '#f97316',
              color: '#04040a',
              padding: '10px 28px',
              border: 'none',
              cursor: 'pointer',
              marginTop: 24,
              animation: 'villageLevelUpText 400ms ease-out 1600ms both',
            }}
          >
            ENTER LEVEL {levelUpOverlay.newLevel}
          </button>
        </div>
      )}
      {/* WHISPER — must remain outside map div, fixed to screen */}
      {eyeMessage && (
        <p
          key={`eye-${eyeMessage}`}
          style={{
            position: 'fixed',
            top: '18%',
            left: 0,
            width: '100vw',
            textAlign: 'center',
            zIndex: 50,
            pointerEvents: 'none',
            fontFamily: 'IM Fell English, serif',
            fontStyle: 'italic',
            fontSize: '20px',
            color: 'rgba(120,200,140,0.85)',
            textShadow: '0 0 12px rgba(34,197,94,0.6)',
            margin: 0,
            animation: 'villageNotYet 3s ease-out forwards',
          }}
        >
          {eyeMessage}
        </p>
      )}

      {/* Memory fragment lore overlay */}
      {memoryText && (
        <div
          onClick={() => {
            if (memoryTimer.current) window.clearTimeout(memoryTimer.current);
            setMemoryText(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(4,4,10,0.92)',
            zIndex: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            cursor: 'pointer',
          }}
        >
          <p
            className="font-fell italic"
            style={{
              fontSize: 18,
              color: 'rgba(160,140,200,0.85)',
              textAlign: 'center',
              maxWidth: 480,
              textShadow: '0 0 14px rgba(249,115,22,0.25)',
            }}
          >
            {memoryText}
          </p>
        </div>
      )}

      {/* Merchant overlay */}
      {user && (
        <MerchantOverlay
          open={merchantOpen}
          onClose={() => setMerchantOpen(false)}
          palette="orange"
          title="The Merchant."
          openingLines={SHADOW_MERCHANT_LINES}
          userId={user.id}
          credits={credits}
          onCreditsChange={(n) => setCredits(n)}
          items={(() => {
            const list: MerchantItem[] = [
              {
                key: 'steps',
                label: '500 Steps (for next maze run)',
                cost: 5,
                onPurchase: () => {
                  const next = stepsRemaining + 500;
                  setStepsRemaining(next);
                  updateUser(user.id, { steps_remaining: next });
                },
              },
              {
                key: 'memory',
                label: 'Memory Fragment',
                cost: 30,
                onPurchase: () => {
                  const t = MEMORY_FRAGMENTS[Math.floor(Math.random() * MEMORY_FRAGMENTS.length)];
                  setMemoryText(t);
                  if (memoryTimer.current) window.clearTimeout(memoryTimer.current);
                  memoryTimer.current = window.setTimeout(() => setMemoryText(null), 8000);
                },
              },
              {
                key: 'convergence',
                label: 'Convergence Token',
                cost: 500,
                onPurchase: () => 'Reserved for the 23rd. Hold it until then.',
              },
            ];
            if (currentLevel >= 15) {
              const lvl = Math.max(1, mazeCompletedLevelRef.current - 1);
              list.push({
                key: 'pastmaze',
                label: `Past Maze Access — Level ${lvl}`,
                cost: 150,
                onPurchase: () => 'Coming soon. The archive is being prepared.',
              });
            }
            return list;
          })()}
        />
      )}
    </div>
  );
};

export default ShadowRealm;
