import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// player ID sourced from localStorage
import { fetchOrCreateUser, updateUser } from '@/lib/userData';
import { claimDailyStepsOnce, takeDailyStepsAnnouncement } from '@/lib/dailySteps';
import { useAuth } from '@/context/AuthContext';
import Thumbstick from '@/components/Thumbstick';
import { restUpdate } from '@/lib/supabaseRest';
import MerchantOverlay, { MerchantCharacter, type MerchantItem } from '@/components/MerchantOverlay';
import PaywallOverlay from '@/components/PaywallOverlay';
import ProfileOverlay, { ProfileButton } from '@/components/ProfileOverlay';
import NpcDialogue from '@/components/NpcDialogue';
import CharacterEye from '@/components/CharacterEye';
import PlayerAvatar, { paletteFromColor } from '@/components/PlayerAvatar';
import { checkSubscriptionStatus, canAccessMaze, getDaysRemainingInTrial, type SubscriptionStatus } from '@/lib/subscriptionStatus';
import { BETA_MODE } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { getAllFlags, getFlag, setFlag } from '@/lib/questFlags';
import FloorLayer from '@/components/theme/FloorLayer';
import BuildingBlock from '@/components/theme/BuildingBlock';
import VillageTerrain from '@/components/theme/VillageTerrain';
import { VillageDoor } from '@/components/theme/objects';
import { DOOR_FLAGS, doorRefusal, footprintHasDoor, inDoorZone, nearestDoorReturn, villageDoors, type VillageDoorDef, type VillageDoorKind } from '@/lib/villageDoors';
import { VILLAGE_GLOW } from '@/lib/theme/tokens';
import { VILLAGE_BG, VILLAGE_VIGNETTE } from '@/lib/theme/villageRendering';
import { memo } from 'react';
import bernardMarkerUrl from '@/assets/bernard_marker.svg';

import { useNpcDialogue, type BernardDialogueData } from '@/hooks/useNpcDialogue';



// Village Merchant
// Village Merchant — TEMP: positioned at map center (col=27,row=17) for visibility testing
const MERCHANT = { x: 12 * 40, y: 22 * 40 };
const BERNARD_VILLAGE = { x: 1244, y: 604 };
const MERCHANT_LINES = [
  'You need more steps. I have them.',
  "The fragments don't find themselves.",
  'What you lack, I carry.',
];

type Rect = { id: string | number; x: number; y: number; w: number; h: number };
type VillageCell = { col: number; row: number; type: string; npc_name?: string };
type GroundTile = { x: number; y: number; kind: 'PATH' | 'ROAD' | 'SQUARE' | 'LANDMARK' };
type RugTrim = { top: boolean; bottom: boolean; left: boolean; right: boolean };
type RugTile = { id: string; x: number; y: number; trim: RugTrim };
type ClusterKind = 'S' | 'M' | 'L';
type BuildingCluster = {
  id: string;
  kind: ClusterKind;
  x: number;
  y: number;
  w: number;
  h: number;
  cols: number;
  rows: number;
  cells: number;
};
type DynamicVillage = {
  typeA: typeof TYPE_A;
  doors: VillageDoorDef[];
  typeB: Rect[];
  typeC: Rect[];
  clusters: BuildingCluster[];
  forest: ForestBlock[];
  groundTiles: GroundTile[];
  wallTiles?: Rect[];
  furnitureTiles?: Rect[];
  bookcaseTiles?: Rect[];
  lightTiles?: Rect[];
  rugTiles?: RugTile[];
  npcs: { x: number; y: number; name: string }[];
  eyeCenter: { x: number; y: number } | null;
  bernardCenter: { x: number; y: number } | null;
  
  merchantCenter: { x: number; y: number } | null;
  gridSize: number;
  start: { col: number; row: number } | null;
};

// Flood-fill orthogonally-contiguous same-type cells into bounding-box clusters
function clusterCells(kind: ClusterKind, cells: { col: number; row: number }[]): BuildingCluster[] {
  const remaining = new Set(cells.map((c) => `${c.col},${c.row}`));
  const out: BuildingCluster[] = [];
  let n = 0;
  for (const key of Array.from(remaining)) {
    if (!remaining.has(key)) continue;
    const stack = [key];
    remaining.delete(key);
    let minCol = Infinity, minRow = Infinity, maxCol = -Infinity, maxRow = -Infinity;
    let count = 0;
    while (stack.length) {
      const cur = stack.pop() as string;
      const [c, r] = cur.split(',').map(Number);
      count++;
      if (c < minCol) minCol = c;
      if (c > maxCol) maxCol = c;
      if (r < minRow) minRow = r;
      if (r > maxRow) maxRow = r;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nk = `${c + dc},${r + dr}`;
        if (remaining.has(nk)) {
          remaining.delete(nk);
          stack.push(nk);
        }
      }
    }
    const cols = maxCol - minCol + 1;
    const rows = maxRow - minRow + 1;
    out.push({
      id: `cl-${kind}-${n++}`,
      kind,
      x: minCol * 20,
      y: minRow * 20,
      w: cols * 20,
      h: rows * 20,
      cols,
      rows,
      cells: count,
    });
  }
  return out;
}

const WallCell = memo(() => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
  >
    <rect width="20" height="20" fill="#3a3548" />
    <rect x="0.3" y="0.3" width="19.4" height="19.4" fill="none" stroke="rgba(140,120,200,0.25)" strokeWidth="0.4" />
    <line x1="0" y1="6.5" x2="20" y2="6.5" stroke="rgba(15,12,25,0.5)" strokeWidth="0.6" />
    <line x1="0" y1="13.5" x2="20" y2="13.5" stroke="rgba(15,12,25,0.5)" strokeWidth="0.6" />
    <rect x="0" y="0" width="20" height="1.2" fill="rgba(170,150,220,0.18)" />
  </svg>
));

const FurnitureCell = memo(() => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
  >
    <rect width="20" height="20" fill="rgba(15,18,28,0.3)" />
    <rect x="2" y="3" width="16" height="14" rx="1.2" fill="#6b4a2e" stroke="#8a6540" strokeWidth="0.5" />
    <path d="M2,6 Q10,5 18,6" fill="none" stroke="rgba(140,100,60,0.5)" strokeWidth="0.4" />
    <path d="M2,9.5 Q10,8.7 18,9.5" fill="none" stroke="rgba(140,100,60,0.4)" strokeWidth="0.4" />
    <path d="M2,13 Q10,12.3 18,13" fill="none" stroke="rgba(140,100,60,0.4)" strokeWidth="0.4" />
    <rect x="2" y="3" width="16" height="2.2" rx="1" fill="rgba(200,160,110,0.25)" />
  </svg>
));

const BOOKCASE_SPINE_COLORS = ['#8a3a3a', '#3a6a5a', '#c8963a', '#3a4a7a', '#7a5535'];

const BookcaseCell = memo(({ col, row }: { col: number; row: number }) => {
  // Deterministic per-cell pseudo-random spine layout (stable across re-renders)
  let seed = (col * 73856093) ^ (row * 19349663);
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const spines: { x: number; w: number; fill: string }[] = [];
  let x = 2.5;
  for (let i = 0; i < 9; i++) {
    const w = 1.2 + rand() * 0.6;
    if (x + w > 17.4) break;
    spines.push({ x, w, fill: BOOKCASE_SPINE_COLORS[Math.floor(rand() * BOOKCASE_SPINE_COLORS.length)] });
    x += w + 0.45;
  }
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <rect width="20" height="20" fill="rgba(15,18,28,0.3)" />
      <rect x="1.5" y="2" width="17" height="16" rx="1" fill="#5a3d24" stroke="#7a5535" strokeWidth="0.5" />
      {spines.map((s) => (
        <rect key={s.x} x={s.x} y={3.2} width={s.w} height={13.6} fill={s.fill} />
      ))}
      <rect x="1.5" y="2" width="17" height="1.3" rx="0.5" fill="rgba(200,160,110,0.3)" />
    </svg>
  );
});

const LightCell = memo(() => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
  >
    <defs>
      <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#f4d78a" stopOpacity="0.5" />
        <stop offset="45%" stopColor="#e8b84a" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#e8b84a" stopOpacity="0" />
      </radialGradient>
    </defs>
    <ellipse
      cx="10"
      cy="10"
      rx="9"
      ry="9"
      fill="url(#lampGlow)"
      style={{ animation: 'glowPulse 3.2s ease-in-out infinite', transformOrigin: '10px 10px' }}
    />
    <rect x="7" y="7" width="6" height="6" rx="1" fill="#3a2f1a" stroke="#7a5535" strokeWidth="0.5" />
    <rect x="8.5" y="8.3" width="3" height="3.4" rx="0.4" fill="#f4d78a" fillOpacity="0.75" />
  </svg>
));

const RugCell = memo(({ trim }: { trim: RugTrim }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
  >
    <rect width="20" height="20" fill="#5a2020" fillOpacity="0.4" />
    <path d="M10,5 L14,10 L10,15 L6,10 Z" fill="none" stroke="rgba(200,160,110,0.18)" strokeWidth="0.3" />
    {trim.top && <line x1="0.6" y1="0.6" x2="19.4" y2="0.6" stroke="rgba(200,160,110,0.35)" strokeWidth="0.6" />}
    {trim.bottom && <line x1="0.6" y1="19.4" x2="19.4" y2="19.4" stroke="rgba(200,160,110,0.35)" strokeWidth="0.6" />}
    {trim.left && <line x1="0.6" y1="0.6" x2="0.6" y2="19.4" stroke="rgba(200,160,110,0.35)" strokeWidth="0.6" />}
    {trim.right && <line x1="19.4" y1="0.6" x2="19.4" y2="19.4" stroke="rgba(200,160,110,0.35)" strokeWidth="0.6" />}
  </svg>
));




const MAP_W = 2200;
const MAP_H = 1400;
const CX = 1100;
const CY = 700;
const STEP = 12;
const LIBRARY_MIN_LEVEL = 3;
const EXCHANGE_MIN_LEVEL = 1;
/** Player glide lerp factor per frame (lower = slower glide). */
const VILLAGE_GLIDE = 0.11;

// Ring radii
const OUTERMOST_RX = 900, OUTERMOST_RY = 500;
const OUTER_RX = 600, OUTER_RY = 340;
const MIDDLE_RX = 380, MIDDLE_RY = 220;
const INNER_RX = 200, INNER_RY = 120;

// ---------- Type A: interactive ----------
const A_23 = { id: 23 as const, x: 720, y: 675, w: 70, h: 50, color: '#4a9eff', bg: 'rgba(74,158,255,0.06)', label: 12 };
const A_47 = { id: 47 as const, x: 1580, y: 780, w: 70, h: 50, color: '#1d9e75', bg: 'rgba(29,158,117,0.06)', label: 12 };
const A_89 = { id: 89 as const, x: 1055, y: 440, w: 90, h: 70, color: '#c8963a', bg: 'rgba(200,150,58,0.06)', label: 14 };
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
const EMPTY_GROUND: GroundTile[] = [];

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
  'You found me.',
  'I have been watching.',
  'You keep coming back.',
  'Junction 89. You already know.',
];
const EYE_RADIUS = 80;

// ---------- Villagers ----------
// Villager positions in grid cells (×40px). MAP is 2200×1400 so col<55, row<35.
// Centered around city eye (CX≈1100, CY≈700) — inside navigable area.
const VILLAGERS_DATA = [
  { id: 1, col: 24, row: 15, whisper: 'I stopped counting the days.' },
  { id: 2, col: 32, row: 20, whisper: 'The 23rd comes whether you are ready or not.' },
  { id: 3, col: 21, row: 22, whisper: 'I found a fragment once. I put it back.' },
  { id: 4, col: 35, row: 14, whisper: 'She built this. We just live in it.' },
  { id: 5, col: 28, row: 23, whisper: 'Junction 89. I have never been brave enough.' },
];

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

const Village = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const navigatedRef = useRef(false);
  const doorLockRef = useRef(false);
  const feedbackTimer = useRef<number | null>(null);

  // Validated random spawn (computed once)
  const initialPosRef = useRef<{ x: number; y: number } | null>(null);
  if (initialPosRef.current === null) {
    initialPosRef.current = computeSpawn();
  }
  const initialPos = initialPosRef.current;
  const [player, setPlayer] = useState(initialPos);
  const playerRef = useRef(initialPos);
  const playerTargetRef = useRef(initialPos);

  const [dynamicBuildings, setDynamicBuildings] = useState<DynamicVillage | null>(null);
  const activeDoors = useMemo(() => villageDoors(dynamicBuildings?.doors ?? [], dynamicBuildings?.typeA ?? TYPE_A), [dynamicBuildings]);
  const [villageLoading, setVillageLoading] = useState(true);
  const villageLoadingRef = useRef(true);
  useEffect(() => { villageLoadingRef.current = villageLoading; }, [villageLoading]);
  const villageLoadingStartRef = useRef(Date.now());
  const villageLoadingTimerRef = useRef<number | null>(null);
  const beginVillageLoading = () => {
    villageLoadingStartRef.current = Date.now();
    if (villageLoadingTimerRef.current) {
      window.clearTimeout(villageLoadingTimerRef.current);
      villageLoadingTimerRef.current = null;
    }
    setVillageLoading(true);
  };
  const finishVillageLoading = () => {
    if (villageLoadingTimerRef.current) return;
    const remaining = Math.max(0, 3000 - (Date.now() - villageLoadingStartRef.current));
    if (remaining > 0) {
      villageLoadingTimerRef.current = window.setTimeout(() => {
        villageLoadingTimerRef.current = null;
        setVillageLoading(false);
      }, remaining);
    } else {
      setVillageLoading(false);
    }
  };
  const dynSpawnDoneRef = useRef(false);
  const moveRef = useRef<(dx: number, dy: number) => void>(() => {});


  // Active map bounds: dynamic village size when present, hardcoded map otherwise
  const mapW = dynamicBuildings ? dynamicBuildings.gridSize * 20 : MAP_W;
  const mapH = dynamicBuildings ? dynamicBuildings.gridSize * 20 : MAP_H;
  const mapSizeRef = useRef({ w: mapW, h: mapH });
  mapSizeRef.current = { w: mapW, h: mapH };
  // Bernard/Merchant positions: dynamic village cells with safe fallbacks
  // Dynamic villages only show characters the level data places; no centre fallback.
  const bernardPos = dynamicBuildings ? dynamicBuildings.bernardCenter : BERNARD_VILLAGE;
  const merchantPos = dynamicBuildings ? dynamicBuildings.merchantCenter : MERCHANT;
  const eyePos = dynamicBuildings ? dynamicBuildings.eyeCenter : { x: CX, y: CY };
  const eyePupilRef = useRef({ x: 0, y: 0 });
  const [eyePupil, setEyePupil] = useState({ x: 0, y: 0 });
  const [feedback, setFeedback] = useState<{ id: 23 | 47 | null }>({ id: null });
  const [whisper, setWhisper] = useState<string | null>(null);
  const whisperTimer = useRef<number | null>(null);
  const lastWhisperIdxRef = useRef<number | null>(null);

  // Supabase-driven whisper tiles
  const whisperCellsRef = useRef<{ key: string; x: number; y: number }[]>([]);
  const whisperCellLastRef = useRef<Map<string, number>>(new Map());


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
  const [socialStatus, setSocialStatus] = useState(0);
  const [growthPoints, setGrowthPoints] = useState(0);
  const [socialStat, setSocialStat] = useState(0);
  const [perceptionStat, setPerceptionStat] = useState(0);
  const [tradeStat, setTradeStat] = useState(0);
  const currentLevelRef = useRef(1);
  useEffect(() => { currentLevelRef.current = currentLevel; }, [currentLevel]);
  const [currentTitle, setCurrentTitle] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState<number | null>(null);
  const [levelUpOverlay, setLevelUpOverlay] = useState<{ newLevel: number } | null>(null);
  const [overlaySelectedTitle, setOverlaySelectedTitle] = useState<string>('');
  const [levelUpHandled, setLevelUpHandled] = useState(false);
  const [auraColor, setAuraColor] = useState<string>('#5b4fd4');
  const [username, setUsername] = useState<string>('');
  const usernameRef = useRef<string>('');
  const [unlockedTitles, setUnlockedTitles] = useState<string[]>([]);
  const [stepsRemaining, setStepsRemaining] = useState<number>(0);
  const stepsReadyRef = useRef(false);
  const userLoadVersionRef = useRef(0);
  const activeUserIdRef = useRef(user?.id);
  activeUserIdRef.current = user?.id;
  const [dailyStepsMessage, setDailyStepsMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!dailyStepsMessage || villageLoading) return;
    const timer = window.setTimeout(() => setDailyStepsMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [dailyStepsMessage, villageLoading]);
  useEffect(() => () => {
    userLoadVersionRef.current += 1;
    stepsReadyRef.current = false;
  }, [user?.id]);
  const [totalMazeSteps, setTotalMazeSteps] = useState<number>(0);
  const [totalMazeTime, setTotalMazeTime] = useState<number>(0);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number>(14);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const subscriptionStatusRef = useRef<SubscriptionStatus | null>(null);
  useEffect(() => { subscriptionStatusRef.current = subscriptionStatus; }, [subscriptionStatus]);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const override = typeof window !== 'undefined' ? sessionStorage.getItem('dev_sub_override') : null;
      const status = BETA_MODE ? 'active' : (override as SubscriptionStatus | null) ?? (await checkSubscriptionStatus(user.id));
      if (cancelled) return;
      setSubscriptionStatus(status);
      if (status === 'trial') {
        const { data } = await supabase.from('users').select('trial_end').eq('id', user.id).single();
        if (!cancelled && data?.trial_end) {
          setTrialDaysRemaining(getDaysRemainingInTrial(data.trial_end));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user]);
  const profileOpenRef = useRef(false);
  const [profileOpenDisplay, setProfileOpenDisplay] = useState(false);
  const openProfile = useCallback(() => { profileOpenRef.current = true; setProfileOpenDisplay(true); }, []);
  const closeProfile = useCallback(() => { profileOpenRef.current = false; setProfileOpenDisplay(false); }, []);
  const [devOverlay, setDevOverlay] = useState(false);
  const [devVillageLevel, setDevVillageLevel] = useState('1');
  const [devMazeLevel, setDevMazeLevel] = useState('1');
  const [devStageNote, setDevStageNote] = useState<string | null>(null);
  const devTapCountRef = useRef(0);
  const devLastTapRef = useRef(0);
  const registrationNumberRef = useRef<number | null>(null);
  useEffect(() => { registrationNumberRef.current = registrationNumber; }, [registrationNumber]);
  const handleRegTap = useCallback(() => {
    if (registrationNumberRef.current !== 1) return;
    const now = Date.now();
    if (now - devLastTapRef.current > 1500) {
      devTapCountRef.current = 0;
    }
    devLastTapRef.current = now;
    devTapCountRef.current += 1;
    if (devTapCountRef.current >= 5) {
      devTapCountRef.current = 0;
      setDevOverlay(true);
    }
  }, []);
  const handleDevReset = useCallback(async () => {
    if (user) {
      await updateUser(user.id, { entity_answer: null, username: null, aura_color: '#5b4fd4', level: 1 });
    }
    setDevOverlay(false);
    navigate('/intro');
  }, [user, navigate]);
  const [credits, setCredits] = useState<number>(0);
  const [merchantOpen, setMerchantOpen] = useState(false);
  const merchantTriggerLockRef = useRef(false);

  // ── Ghost players (real-time positions of other players) ──
  const userIdRef = useRef<string | null>(null);
  useEffect(() => { userIdRef.current = user?.id ?? null; }, [user]);
  const lastPositionWriteRef = useRef(0);
  const [ghostDots, setGhostDots] = useState<
    { user_id: string; x: number; y: number; village_level: number }[]
  >([]);
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean; x: number; y: number; level: number;
  }>({ visible: false, x: 0, y: 0, level: 1 });



  // Bernard quest state
  const [bernardOpen, setBernardOpen] = useState(false);
  const bernardLockRef = useRef(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const paywallIntentRef = useRef<'alexandra' | null>(null);
  // Bernard's dialogue spine lives in the shared hook (see useBernardDialogue).
  const acceptAlexandraQuestRef = useRef<() => void>(() => {});

  const {
    bernardStages,
    conditionsMet,
    advanceBernardStage,
    getBernardDialogue,
    bumpFlags,
    resetBernardBucket,
    resolvedDialogue,
    isReady: bernardReady,
  } = useNpcDialogue('bernard', {
    user,
    currentLevel,
    socialStat,
    perceptionStat,
    tradeStat,
    credits,
    growthPoints,
    isOpen: bernardOpen,
    onCreditsChange: setCredits,
    onGrowthPointsChange: setGrowthPoints,
    onCloseDialogue: () => setBernardOpen(false),
    onTitleGranted: (title, unlocked) => {
      setCurrentTitle(title);
      setUnlockedTitles(unlocked);
    },
    onMessage: (msg) => {
      setEyeMessage(msg);
      window.setTimeout(() => setEyeMessage(null), 3000);
    },
    onAcceptAlexandraQuest: () => acceptAlexandraQuestRef.current(),
  });

  

  const acceptAlexandraQuest = useCallback(async () => {
    if (!user) return;
    const status = subscriptionStatusRef.current;
    const allowed = BETA_MODE || status === 'active' || status === 'lifetime' || status === 'dev' || status === 'trial';
    if (allowed) {
      await setFlag(user.id, 'alexandra_quest', 'active');
      await setFlag(user.id, 'bernard_stage', '6');
      bumpFlags();
    } else {
      paywallIntentRef.current = 'alexandra';
      setPaywallOpen(true);
    }
  }, [user, bumpFlags]);

  useEffect(() => {
    acceptAlexandraQuestRef.current = () => { acceptAlexandraQuest(); };
  }, [acceptAlexandraQuest]);


  // DEPRECATED — kept for manual parity testing across bernard_stage 0-6. Unused.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getBernardDialogueLegacy = (flagOverride?: (k: string) => string | null): BernardDialogueData => {

    if (typeof window === 'undefined' || !user) {
      return { text: '', buttonLabel: null };
    }
    const f = flagOverride ?? getFlag;
    const stage = parseInt(f('bernard_stage') || '0', 10);
    const alexandra = f('alexandra_quest') === 'active';
    const t23 = f('touched_23') === 'true';
    const t47 = f('touched_47') === 'true';
    const t89 = f('touched_89') === 'true';
    const allTouched = t23 && t47 && t89;


    // Stage 0 — first meeting: greet, then advance to stage 1 (arrival complete).
    if (stage === 0) {
      return {
        text: 'You are here. I heard your bell before you did. Welcome. My name is Bernard. Three buildings — 23, 47, 89. Find them all. Come back when you have stood at each one.',
        buttonLabel: null,
        onShow: () => { advanceBernardStage(1); },
      };
    }
    // Stage 1 — looking for the three buildings.
    if (stage === 1 && !allTouched) {
      return {
        text: 'Three buildings. Go and find them. Come back when you have stood at each one.',
        buttonLabel: null,
      };
    }
    if (stage === 1 && allTouched) {
      return {
        text: "Great! You found them. Enter The Instrument when you're ready. Find me behind the Blue Door.",
        buttonLabel: 'I will find it',
        buttonAction: () => {
          const next = credits + 30;
          setCredits(next);
          updateUser(user.id, { credits: next });
          advanceBernardStage(2);
        },
      };
    }
    // Stage 2 — told to enter the Instrument, no fragment yet.
    if (stage === 2) {
      return {
        text: "Did I tell you that it's impossible to get back to reality before you find the Golden Door?",
        buttonLabel: null,
      };
    }
    // Stage 3 — first fragment reported, still in the Instrument hunting the rest.
    if (stage === 3) {
      return {
        text: 'You found me in there. Good. Keep going. Find all five fragments. Find the golden door.',
        buttonLabel: null,
      };
    }
    // Stage 4 — Shadow Realm done, returned to the village. Grant Wanderer → stage 5.
    if (stage === 4) {
      return {
        text: 'Congratulations. You made it through.',
        buttonLabel: 'Thank you Bernard',
        buttonAction: async () => {
          const credNum = credits + 100;
          setCredits(credNum);
          await updateUser(user.id, {
            credits: credNum,
            title: 'Wanderer',
            unlocked_titles: ['Wanderer'],
          });
          setCurrentTitle('Wanderer');
          setUnlockedTitles(['Wanderer']);
          await advanceBernardStage(5);
          setEyeMessage('You are a Wanderer.');
          window.setTimeout(() => setEyeMessage(null), 3000);
        },
      };
    }
    // Stage 5 — Wanderer granted. Offer the Alexandra (un-named) quest.
    if (stage === 5 && !alexandra) {
      return {
        text: 'There is one more thing. Someone was here before any of you. Before me, even — and I have been here a very long time. I never met them. But if you follow this place far enough, everything points back to them. I think you are the kind of person who follows things far enough. Will you?',
        buttonLabel: 'I will follow it',
        buttonAction: () => { acceptAlexandraQuest(); },
      };
    }
    // Stage 6 / quest active — follow-up.
    return {
      text: 'Still following it? Good. Keep going. You will know them when you find them.',
      buttonLabel: null,
    };
  };

  // TEMPORARY DEBUG types/state — remove with the parity check block below.
  type ParityRow = {
    label: string;
    ok: boolean;
    newText: string;
    oldText: string;
    newLabel: string | null;
    oldLabel: string | null;
    newActionKey: string | null;
    oldActionKey: string | null;
    flags: { textMatch: boolean; labelMatch: boolean; actionPresenceMatch: boolean; actionKeyMatch: boolean };
  };
  const [parityRows, setParityRows] = useState<ParityRow[]>([]);

  // ─────────────────────────────────────────────────────────────
  // TEMPORARY DEBUG — Bernard dialogue parity check (?bernardParityCheck=1)
  // Compares the new data-driven getBernardDialogue() against
  // getBernardDialogueLegacy() across 7 states. REMOVE once verified.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;
    if (new URLSearchParams(window.location.search).get('bernardParityCheck') !== '1') return;
    if (!bernardStages.length) return;

    const cases: { label: string; flags: Record<string, string> }[] = [
      { label: '1. stage=0, flags={}', flags: { bernard_stage: '0' } },
      { label: '2. stage=1, none touched', flags: { bernard_stage: '1', touched_23: 'false', touched_47: 'false', touched_89: 'false' } },
      { label: '3. stage=1, all touched', flags: { bernard_stage: '1', touched_23: 'true', touched_47: 'true', touched_89: 'true' } },
      { label: '4. stage=2, flags={}', flags: { bernard_stage: '2' } },
      { label: '5. stage=3, flags={}', flags: { bernard_stage: '3' } },
      { label: '6. stage=4, flags={}', flags: { bernard_stage: '4' } },
      { label: '7. stage=5, alexandra not active', flags: { bernard_stage: '5' } },
    ];

    // Expected action key per state, used to verify the wired action matches the old logic.
    const expectedActionKey: Record<string, string | null> = {
      '1. stage=0, flags={}': 'advance_to_1',
      '2. stage=1, none touched': null,
      '3. stage=1, all touched': 'grant_credits_30_advance_2',
      '4. stage=2, flags={}': null,
      '5. stage=3, flags={}': null,
      '6. stage=4, flags={}': 'grant_wanderer_title',
      '7. stage=5, alexandra not active': 'accept_alexandra_quest',
    };

    const rows: ParityRow[] = cases.map((c) => {
      const override = (k: string) => c.flags[k] ?? null;
      const stage = parseInt(override('bernard_stage') || '0', 10);
      const nw = getBernardDialogue(override);
      const old = getBernardDialogueLegacy(override);

      const row =
        bernardStages.find((r) => conditionsMet(stage, r.condition, override)) ??
        bernardStages.find((r) => r.stage_key === 'stage_6_followup');
      const wiredKey = row?.button_action_key ?? row?.on_show_action_key ?? null;
      const expected = expectedActionKey[c.label];

      const textMatch = nw.text === old.text;
      const labelMatch = nw.buttonLabel === old.buttonLabel;
      const actionPresenceMatch =
        Boolean(nw.buttonAction) === Boolean(old.buttonAction) &&
        Boolean(nw.onShow) === Boolean(old.onShow);
      const actionKeyMatch = wiredKey === expected;

      return {
        label: c.label,
        ok: textMatch && labelMatch && actionPresenceMatch && actionKeyMatch,
        newText: nw.text,
        oldText: old.text,
        newLabel: nw.buttonLabel ?? null,
        oldLabel: old.buttonLabel ?? null,
        newActionKey: wiredKey,
        oldActionKey: expected ?? null,
        flags: { textMatch, labelMatch, actionPresenceMatch, actionKeyMatch },
      };
    });

    setParityRows(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, bernardStages]);


  const openBernardDialog = () => {
    // Always start a fresh conversation at the book graph's entry point.
    resetBernardBucket();
    setBernardOpen(true);
  };



  // Listen for global "open paywall" event (dispatched from ProfileOverlay etc.)
  useEffect(() => {
    const handler = async () => {
      if (BETA_MODE) return;
      if (!user) return;
      const status = subscriptionStatusRef.current;
      const allowed = status === 'active' || status === 'lifetime' || status === 'dev' || status === 'trial';
      const stage = parseInt(getFlag('bernard_stage') || '0', 10);
      const profileComplete = usernameRef.current.trim().length > 0;
      if (!allowed && stage >= 5 && profileComplete) {
        setPaywallOpen(true);
      }
    };
    window.addEventListener('praem:open-paywall', handler);
    return () => window.removeEventListener('praem:open-paywall', handler);
  }, [user]);

  // Villagers — patrol around their base on independent timers
  type Villager = { id: number; x: number; y: number; baseX: number; baseY: number; whisper: string };
  const [villagers, setVillagers] = useState<Villager[]>(() =>
    VILLAGERS_DATA.map((v) => ({
      id: v.id,
      x: v.col * 40,
      y: v.row * 40,
      baseX: v.col * 40,
      baseY: v.row * 40,
      whisper: v.whisper,
    })),
  );
  const activeVillagers = dynamicBuildings ? [] : villagers;

  const villagersRef = useRef<Villager[]>(activeVillagers);
  useEffect(() => { villagersRef.current = activeVillagers; }, [activeVillagers]);
  const lastVillagerWhisperRef = useRef<Map<number, number>>(new Map());
  const [villagerWhisper, setVillagerWhisper] = useState<string | null>(null);
  const villagerWhisperTimer = useRef<number | null>(null);

  useEffect(() => {
    if (dynamicBuildings) return;
    const timers: number[] = [];
    VILLAGERS_DATA.forEach((v) => {
      const baseX = v.col * 40;
      const baseY = v.row * 40;
      const corners: Array<[number, number]> = [
        [baseX, baseY],
        [baseX + 40, baseY],
        [baseX, baseY + 40],
        [baseX + 40, baseY + 40],
      ];
      const interval = 10000 + Math.random() * 10000;
      const id = window.setInterval(() => {
        const [nx, ny] = corners[Math.floor(Math.random() * corners.length)];
        setVillagers((prev) =>
          prev.map((p) => (p.id === v.id ? { ...p, x: nx, y: ny } : p)),
        );
      }, interval);
      timers.push(id);
    });
    return () => { timers.forEach((t) => window.clearInterval(t)); };
  }, [dynamicBuildings]);


  const AURA_COLORS = ['#5b4fd4', '#4a9eff', '#1d9e75', '#c8963a', '#22c55e'];

  const refetchUser = useCallback(async () => {
    if (!user) return;
    const version = ++userLoadVersionRef.current;
    stepsReadyRef.current = false;
    console.log('[Village] playerId from auth:', user.id);
    let row = await fetchOrCreateUser(user.id);
    if (version !== userLoadVersionRef.current || activeUserIdRef.current !== user.id) return;
    let granted = 0;
    try {
      granted = await claimDailyStepsOnce(user.id, async () => {
        const { data, error } = await supabase.rpc('claim_daily_steps');
        if (error) throw error;
        return typeof data === 'number' ? data : 0;
      });
    } catch (error) {
      console.warn('[Village] daily step claim failed', error);
    }
    // Refresh even after a failed response: the server may already have granted steps.
    row = await fetchOrCreateUser(user.id);
    if (version !== userLoadVersionRef.current || activeUserIdRef.current !== user.id) return;
    console.log('[Village] user row:', row);
    setCurrentLevel(row.level);
    setSocialStatus(((row as unknown as { social?: number }).social) ?? 0);
    {
      const r = row as unknown as { social?: number; growth_points?: number; perception?: number; trade?: number };
      setGrowthPoints(r.growth_points ?? 0);
      setSocialStat(r.social ?? 0);
      setPerceptionStat(r.perception ?? 0);
      setTradeStat(r.trade ?? 0);
    }
    setCurrentTitle(row.title);
    setOverlaySelectedTitle(row.title);
    setRegistrationNumber(row.registration_number);
    setAuraColor(row.aura_color || '#5b4fd4');
    setUsername(row.username || '');
    usernameRef.current = row.username || '';
    setUnlockedTitles(row.unlocked_titles && row.unlocked_titles.length ? row.unlocked_titles : []);
    setStepsRemaining(row.steps_remaining);
    // React publishes the balance before the next input event; movement/navigation
    // stays blocked until the authoritative post-claim balance is available.
    stepsReadyRef.current = true;
    if (takeDailyStepsAnnouncement(user.id, granted)) {
      setDailyStepsMessage(`The day gives you ${granted} steps.`);
    }
    console.log('[Village credits] row.credits =', row.credits, typeof row.credits);
    setCredits(row.credits);
    setTotalMazeSteps(row.total_maze_steps);
    setTotalMazeTime(row.total_maze_time);

    // Load quest flags from Supabase into module cache.
    await getAllFlags(user.id);

    // Bridge from legacy shadow-realm completion signal (set by ShadowRealm.tsx)
    // into the new quest_flags system: if SR is done and we're still on stage 3,
    // advance to stage 4 so Bernard offers the Wanderer dialogue.
    const srDone = getFlag('bernard_03_complete') === 'true';
    const currentStage = parseInt(getFlag('bernard_stage') || '0', 10);
    if (srDone && currentStage < 4) {
      await setFlag(user.id, 'bernard_stage', '4');
    }
    bumpFlags();

    // Trial check (display only — paywall is gated by Bernard quest, not trial)
    if (row.first_launch_at) {
      const daysSince = Math.floor(
        (Date.now() - new Date(row.first_launch_at).getTime()) / (1000 * 60 * 60 * 24),
      );
      const remaining = Math.max(0, 14 - daysSince);
      setTrialDaysRemaining(remaining);
    }

    if (row.levelup_pending && !levelUpHandled) {
      const newLv = row.levelup_newlevel ?? row.level;
      const stageNow = parseInt(getFlag('bernard_stage') || '0', 10);
      const titlesUnlocked = stageNow >= 5;
      const newTitle = titlesUnlocked ? (TITLES_BY_LEVEL[newLv] || '') : '';
      window.setTimeout(() => {
        setLevelUpOverlay({ newLevel: newLv });
        setOverlaySelectedTitle(newTitle);
        if (titlesUnlocked && newTitle) {
          updateUser(user.id, { title: newTitle });
          setCurrentTitle(newTitle);
        }
      }, 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    refetchUser();
  }, [user, authLoading, navigate, refetchUser]);

  // ---- Dynamic village layout from Supabase (falls back to hardcoded arrays) ----
  useEffect(() => {
    if (authLoading || !user || !currentLevel) return;
    let cancelled = false;

    const returnSpawn = (obstacles: Rect[], doors: VillageDoorDef[], width: number, height: number) => {
      const raw = sessionStorage.getItem('praem_village_return');
      if (!raw) return null;
      sessionStorage.removeItem('praem_village_return');
      try {
        const p = JSON.parse(raw);
        if (typeof p.x !== 'number' || typeof p.y !== 'number' || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
        const sp = nearestDoorReturn(p, obstacles, doors, width, height);
        if (sp) doorLockRef.current = true;
        return sp;
      } catch { return null; }
    };
    const restoreFallbackReturn = () => {
      const sp = returnSpawn([...OBSTACLES, ...TYPE_A], villageDoors([], TYPE_A), MAP_W, MAP_H);
      if (sp) { playerRef.current = sp; playerTargetRef.current = sp; setPlayer(sp); }
    };
    const loadVillage = async () => {
      beginVillageLoading();
      try {
        const { data: villageRow } = await supabase
          .from('special_locations' as never)
          .select('data')
          .eq('level_number', currentLevel)
          .eq('location_key', 'village')
          .maybeSingle();

        if (cancelled || !villageRow) {
          if (!cancelled) { restoreFallbackReturn(); finishVillageLoading(); }
          return;
        }
        const vData = (villageRow as {
          data?: {
            extraCells?: VillageCell[];
            grid_size?: number;
            gridSize?: number;
            start?: { col?: number; row?: number } | null;
          };
        })?.data;
        const cells = vData?.extraCells ?? [];
        if (!Array.isArray(cells) || cells.length === 0) {
          if (!cancelled) { restoreFallbackReturn(); finishVillageLoading(); }
          return;
        }

        const CELL = 20;
        const typeA: typeof TYPE_A = [];
        const doors: VillageDoorDef[] = [];
        const typeB: Rect[] = [];
        const typeC: Rect[] = [];
        const sCells: { col: number; row: number }[] = [];
        const mCells: { col: number; row: number }[] = [];
        const lCells: { col: number; row: number }[] = [];
        const forest: ForestBlock[] = [];
        const groundTiles: GroundTile[] = [];
        const wallTiles: Rect[] = [];
        const furnitureTiles: Rect[] = [];
        const bookcaseTiles: Rect[] = [];
        const lightTiles: Rect[] = [];
        const rugCells: { col: number; row: number }[] = [];
        const npcs: { x: number; y: number; name: string }[] = [];

        let eyeCenter: { x: number; y: number } | null = null;
        let bernardCenter: { x: number; y: number } | null = null;
        
        let merchantCenter: { x: number; y: number } | null = null;

        cells.forEach((cell, i) => {
          if (!cell || typeof cell.col !== 'number' || typeof cell.row !== 'number') return;
          const x = cell.col * CELL;
          const y = cell.row * CELL;
          switch (cell.type) {
            case 'BUILDING_S':
              sCells.push({ col: cell.col, row: cell.row });
              break;
            case 'BUILDING_M':
              mCells.push({ col: cell.col, row: cell.row });
              break;
            case 'BUILDING_L':
              lCells.push({ col: cell.col, row: cell.row });
              break;

            case 'DOOR_MAZE':
              doors.push({ kind: 'maze', x, y });
              break;
            case 'DOOR_LIBRARY':
              doors.push({ kind: 'library', x, y });
              break;
            case 'DOOR_EXCHANGE':
              doors.push({ kind: 'exchange', x, y });
              break;
            case 'BUILDING_23':
              typeA.push({ ...A_23, x, y, w: 70, h: 50 });
              break;
            case 'BUILDING_47':
              typeA.push({ ...A_47, x, y, w: 70, h: 50 });
              break;
            case 'BUILDING_89':
              typeA.push({ ...A_89, x, y, w: 90, h: 70 });
              break;
            case 'FOREST':
              forest.push({ x, y, w: 18, h: 15 });
              break;
            case 'NPC':
              npcs.push({ x, y, name: cell.npc_name || '' });
              break;
            case 'EYE':
              eyeCenter = { x, y };
              break;
            case 'BERNARD':
              bernardCenter = { x, y };
              break;
            case 'MERCHANT':
              merchantCenter = { x, y };
              break;
            case 'PATH':
            case 'ROAD':
            case 'SQUARE':
            case 'LANDMARK':
              groundTiles.push({ x, y, kind: cell.type });
              break;
            case 'WALL':
              wallTiles.push({ id: `wall-${cell.col}-${cell.row}`, x, y, w: 20, h: 20 });
              break;
            case 'FURNITURE':
              furnitureTiles.push({ id: `furn-${cell.col}-${cell.row}`, x, y, w: 20, h: 20 });
              break;
            case 'BOOKCASE':
              bookcaseTiles.push({ id: `book-${cell.col}-${cell.row}`, x, y, w: 20, h: 20 });
              break;
            case 'LIGHT':
              lightTiles.push({ id: `light-${cell.col}-${cell.row}`, x, y, w: 20, h: 20 });
              break;
            case 'RUG':
              rugCells.push({ col: cell.col, row: cell.row });
              break;

            default:
              break;
          }
        });

        whisperCellsRef.current = cells
          .filter((c) => c && c.type === 'WHISPER')
          .map((c) => ({ key: `${c.col},${c.row}`, x: c.col * CELL, y: c.row * CELL }));

        if (!cancelled) {
          let gridSize = Number(vData?.grid_size ?? vData?.gridSize ?? 0);
          if (!Number.isFinite(gridSize) || gridSize <= 0) {
            gridSize = cells.reduce(
              (m, c) => Math.max(m, (c?.col ?? 0) + 1, (c?.row ?? 0) + 1),
              1,
            );
          }
          const rawStart = vData?.start;
          const start =
            rawStart && typeof rawStart.col === 'number' && typeof rawStart.row === 'number'
              ? { col: rawStart.col, row: rawStart.row }
              : null;

          const clusters = [
            ...clusterCells('S', sCells),
            ...clusterCells('M', mCells),
            ...clusterCells('L', lCells),
          ];

          // Rug trim: only draw the border on the outer edge of a connected rug area
          const rugSet = new Set(rugCells.map((c) => `${c.col},${c.row}`));
          const rugTiles: RugTile[] = rugCells.map((c) => ({
            id: `rug-${c.col}-${c.row}`,
            x: c.col * CELL,
            y: c.row * CELL,
            trim: {
              top: !rugSet.has(`${c.col},${c.row - 1}`),
              bottom: !rugSet.has(`${c.col},${c.row + 1}`),
              left: !rugSet.has(`${c.col - 1},${c.row}`),
              right: !rugSet.has(`${c.col + 1},${c.row}`),
            },
          }));

          setDynamicBuildings({ typeA, doors, typeB, typeC, clusters, forest, groundTiles, wallTiles, furnitureTiles, bookcaseTiles, lightTiles, rugTiles, npcs, eyeCenter, bernardCenter, merchantCenter, gridSize, start });


          // Reposition the player once, when the dynamic village loads
          if (!dynSpawnDoneRef.current) {
            dynSpawnDoneRef.current = true;
            const dynW = gridSize * CELL;
            const dynH = gridSize * CELL;
            let sp = start ? { x: start.col * CELL, y: start.row * CELL } : { x: dynW / 2, y: dynH / 2 };
            const loadedDoors = villageDoors(doors, typeA);
            const obstacles: Rect[] = [
              ...clusters, ...typeA, ...typeB, ...typeC,
              ...wallTiles, ...furnitureTiles, ...bookcaseTiles, ...lightTiles,
            ];
            const returned = returnSpawn(obstacles, loadedDoors, dynW, dynH);
            if (returned) sp = returned;
            if (!start && !returned) {
              // Nearest free cell to the centre: outside every obstacle and off any character.
              const chars = [eyeCenter, bernardCenter, merchantCenter].filter(Boolean) as { x: number; y: number }[];
              const free = (x: number, y: number) =>
                x >= 0 && y >= 0 && x <= dynW && y <= dynH &&
                !obstacles.some((o) => x >= o.x - 2 && x <= o.x + o.w + 2 && y >= o.y - 2 && y <= o.y + o.h + 2) &&
                !chars.some((c) => Math.hypot(x - c.x, y - c.y) <= 40) &&
                !loadedDoors.some(d => inDoorZone({ x, y }, d));
              const c0 = Math.floor(gridSize / 2);
              search: for (let ring = 0; ring <= gridSize; ring++) {
                for (let dr = -ring; dr <= ring; dr++) {
                  for (let dc = -ring; dc <= ring; dc++) {
                    if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
                    const x = (c0 + dc) * CELL + CELL / 2;
                    const y = (c0 + dr) * CELL + CELL / 2;
                    if (free(x, y)) { sp = { x, y }; break search; }
                  }
                }
              }
            }
            // Don't auto-open an overlay if the spawn is already beside a character.
            if (merchantCenter && Math.hypot(sp.x - merchantCenter.x, sp.y - merchantCenter.y) <= 40) merchantTriggerLockRef.current = true;
            if (bernardCenter && Math.hypot(sp.x - bernardCenter.x, sp.y - bernardCenter.y) <= 40) bernardLockRef.current = true;
            playerRef.current = sp;
            playerTargetRef.current = sp;
            setPlayer(sp);
          }
          finishVillageLoading();
        }

      } catch (e) {
        if (!cancelled) { restoreFallbackReturn(); finishVillageLoading(); }
        console.warn('[Village] dynamic layout load failed', e);
      }
    };


    void loadVillage();
    return () => { cancelled = true; };
  }, [user, authLoading, currentLevel]);



  // Ghost players — initial fetch + realtime subscription
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;

    const load = async () => {
      await fetchOrCreateUser(user.id);
      const { data: ghosts } = await supabase
        .from('player_positions')
        .select('user_id, x, y, village_level')
        .neq('user_id', user.id)
        .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .order('last_seen', { ascending: false })
        .limit(100);
      if (!cancelled && ghosts) setGhostDots(ghosts as typeof ghostDots);
    };
    void load();

    const channel = supabase
      .channel('player_positions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'player_positions',
      }, (payload) => {
        if (payload.new && (payload.new as any).user_id !== user.id) {
          setGhostDots((prev) => {
            const filtered = prev.filter(
              (g) => g.user_id !== (payload.new as any).user_id,
            );
            return [...filtered, payload.new as any].slice(-100);
          });
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);




  useEffect(() => {
    return () => {
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
      if (whisperTimer.current) window.clearTimeout(whisperTimer.current);
      if (eyeTimer.current) window.clearTimeout(eyeTimer.current);
    };
  }, []);

  const showLockWhisper = (msg: string) => {
    setWhisper(msg);
    if (whisperTimer.current) window.clearTimeout(whisperTimer.current);
    whisperTimer.current = window.setTimeout(() => setWhisper(null), 2000);
  };

  // Pull a random line from the shared `whispers` table
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

  const triggerTileWhisper = (key: string) => {
    const now = Date.now();
    const last = whisperCellLastRef.current.get(key) ?? 0;
    if (now - last <= 30000) return;
    whisperCellLastRef.current.set(key, now);
    void fetchRandomWhisper().then((text) => {
      if (!text) return;
      setWhisper(text);
      if (whisperTimer.current) window.clearTimeout(whisperTimer.current);
      whisperTimer.current = window.setTimeout(() => {
        setWhisper(null);
        lastWhisperIdxRef.current = null;
      }, 2500);
    });
  };



  const triggerDoor = (kind: VillageDoorKind, door: VillageDoorDef) => {
    if (doorLockRef.current || navigatedRef.current) return;
    doorLockRef.current = true;
    if (user) void setFlag(user.id, DOOR_FLAGS[kind], 'true');
    const refusal = doorRefusal(kind, currentLevelRef.current, parseInt(getFlag('bernard_stage') || '0', 10), LIBRARY_MIN_LEVEL, EXCHANGE_MIN_LEVEL);
    if (refusal) { showLockWhisper(refusal); return; }
    navigatedRef.current = true;
    const status = subscriptionStatusRef.current;
    const target = kind === 'maze'
      ? BETA_MODE || (status && canAccessMaze(status)) ? '/door' : '/paywall'
      : kind === 'library' ? '/library-door' : '/exchange-door';
    sessionStorage.setItem('praem_village_return', JSON.stringify({ x: door.x + 10, y: door.y + 10 }));
    window.setTimeout(() => navigate(target), 400);
  };

  const activeObstacles = useMemo<Rect[]>(
    () =>
      dynamicBuildings
        ? [
            ...dynamicBuildings.clusters.map((c) => ({ id: c.id, x: c.x, y: c.y, w: c.w, h: c.h })),
            ...dynamicBuildings.typeA,
            ...dynamicBuildings.typeB,
            ...dynamicBuildings.typeC,
            ...(dynamicBuildings.wallTiles ?? []),
            ...(dynamicBuildings.furnitureTiles ?? []),
            ...(dynamicBuildings.bookcaseTiles ?? []),
            ...(dynamicBuildings.lightTiles ?? []),
          ]
        : [...OBSTACLES, ...TYPE_A],
    [dynamicBuildings],
  );

  const move = (dx: number, dy: number) => {
    if (villageLoadingRef.current || !stepsReadyRef.current) return;
    const prev = playerTargetRef.current;


    const nx = Math.max(0, Math.min(mapSizeRef.current.w, prev.x + dx));
    const ny = Math.max(0, Math.min(mapSizeRef.current.h, prev.y + dy));


    // A shared 20px cell + 8px zone overrides building collision from every side.
    const door = activeDoors.find(d => inDoorZone({ x: nx, y: ny }, d));
    if (door) triggerDoor(door.kind, door);

    // Obstacles (B + C + RIM) with 2px padding — also check whisper trigger on any whispered building
    for (const o of door ? [] : activeObstacles) {
      if (
        nx >= o.x - 2 &&
        nx <= o.x + o.w + 2 &&
        ny >= o.y - 2 &&
        ny <= o.y + o.h + 2
      ) {
        if (!dynamicBuildings) {
          const msg = WHISPER_BY_RECT.get(o);
          if (msg !== undefined) {
            const oIdx = activeObstacles.indexOf(o);
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
        }
        return;
      }
    }

    // Hard ellipse boundary: hardcoded village only (dynamic uses the rect clamp above)
    let fx = nx, fy = ny;
    if (!dynamicBuildings) {
      const BX = OUTERMOST_RX + 20;
      const BY = OUTERMOST_RY + 20;
      const ex = (fx - CX) / BX;
      const ey = (fy - CY) / BY;
      const e2 = ex * ex + ey * ey;
      if (e2 > 1) {
        const mag = Math.sqrt(e2);
        fx = CX + (fx - CX) / mag;
        fy = CY + (fy - CY) / mag;
      }
    }


    // Commit target
    playerTargetRef.current = { x: fx, y: fy };
    if (!activeDoors.some(d => inDoorZone({ x: fx, y: fy }, d))) doorLockRef.current = false;

    // Whisper tiles (within 16px of the tile centre), 30s cooldown per tile
    for (const wc of whisperCellsRef.current) {
      if (Math.hypot(fx - wc.x, fy - wc.y) <= 16) {
        triggerTileWhisper(wc.key);
        break;
      }
    }



    // Broadcast own position (throttled to once every 2s)
    const uid = userIdRef.current;
    if (uid && Date.now() - lastPositionWriteRef.current > 2000) {
      lastPositionWriteRef.current = Date.now();
      supabase.from('player_positions').upsert({
        user_id: uid,
        x: fx,
        y: fy,
        village_level: currentLevelRef.current,
        last_seen: new Date().toISOString(),
      }, { onConflict: 'user_id' }).then(() => {});
    }


    // Villager proximity whisper (within 30px), 10s cooldown per villager
    const now = Date.now();
    for (const v of villagersRef.current) {
      const d = Math.hypot(fx - v.x, fy - v.y);
      if (d <= 30) {
        const last = lastVillagerWhisperRef.current.get(v.id) ?? 0;
        if (now - last >= 10000) {
          lastVillagerWhisperRef.current.set(v.id, now);
          setVillagerWhisper(v.whisper);
          if (villagerWhisperTimer.current) window.clearTimeout(villagerWhisperTimer.current);
          villagerWhisperTimer.current = window.setTimeout(() => setVillagerWhisper(null), 2500);
        }
        break;
      }
    }

    // Merchant proximity → open overlay (40px)
    const merchP = dynamicBuildings ? dynamicBuildings.merchantCenter : MERCHANT;
    if (merchP && Math.hypot(fx - merchP.x, fy - merchP.y) <= 40) {
      if (!merchantTriggerLockRef.current) {
        merchantTriggerLockRef.current = true;
        setMerchantOpen(true);
      }
    } else {
      merchantTriggerLockRef.current = false;
    }

    // Bernard proximity → open dialogue (40px)
    const bernP = dynamicBuildings ? dynamicBuildings.bernardCenter : BERNARD_VILLAGE;
    if (bernP && Math.hypot(fx - bernP.x, fy - bernP.y) <= 40 && bernardReady) {
      if (!bernardLockRef.current) {
        bernardLockRef.current = true;
        openBernardDialog();
      }
    } else {
      bernardLockRef.current = false;
    }

  };
  moveRef.current = move;

  // Keyboard arrow keys — held-keys system for smooth diagonal movement

  const heldKeysRef = useRef<Set<string>>(new Set());
  const stickDirRef = useRef<{ dc: number; dr: number }>({ dc: 0, dr: 0 });
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

  // Player lerp loop — visual chases target at VILLAGE_GLIDE/frame
  useEffect(() => {
    let raf = 0;
    let keyFrameCounter = 0;
    const loop = () => {
      // Held-keys movement — process every 2 frames (~30Hz) for responsive feel
      keyFrameCounter++;
      if (keyFrameCounter >= 2) {
        keyFrameCounter = 0;
        const held = heldKeysRef.current;
        const stick = stickDirRef.current;
        let kdx = 0, kdy = 0;
        if (held.has('ArrowLeft')) kdx -= STEP;
        if (held.has('ArrowRight')) kdx += STEP;
        if (held.has('ArrowUp')) kdy -= STEP;
        if (held.has('ArrowDown')) kdy += STEP;
        if (stick.dc !== 0) kdx += stick.dc * STEP;
        if (stick.dr !== 0) kdy += stick.dr * STEP;
        kdx = Math.max(-STEP, Math.min(STEP, kdx));
        kdy = Math.max(-STEP, Math.min(STEP, kdy));
        if (kdx !== 0 && kdy !== 0) {
          kdx *= 0.707;
          kdy *= 0.707;
        }
        if (kdx !== 0 || kdy !== 0) {
          moveRef.current(kdx, kdy);
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
        const nx = cur.x + dx * VILLAGE_GLIDE;
        const ny = cur.y + dy * VILLAGE_GLIDE;
        moved = Math.abs(nx - cur.x) > 0.5 || Math.abs(ny - cur.y) > 0.5;
        playerRef.current = { x: nx, y: ny };
        setPlayer(playerRef.current);
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

  // Camera offset for one axis: center the map when it's smaller than the
  // viewport, otherwise follow the player with the usual clamp.
  const camAxis = (viewSize: number, mapSize: number, playerPos: number) =>
    mapSize <= viewSize
      ? (viewSize - mapSize) / 2
      : Math.min(0, Math.max(viewSize - mapSize, viewSize / 2 - playerPos));

  // Smooth camera (lerp via rAF)
  const initialCam = (() => {
    const tx = camAxis(view.w, mapW, player.x);
    const ty = camAxis(view.h, mapH, player.y);
    return { x: tx, y: ty };
  })();
  const cameraRef = useRef(initialCam);
  const mapRef = useRef<HTMLDivElement | null>(null);

  // ---- Viewport culling (rendering only; collision uses the full dataset) ----
  // Quantize the camera to 100px steps (5 cells) so the memo recomputes ~5x less
  // often during sustained movement, and pad the visible box by 11 cells so
  // nothing pops in/out with the coarser step.
  const CULL_STEP = 100;
  const CULL_MARGIN = 220;
  // Camera position lives in a ref (written straight to the DOM each frame);
  // only crossing a cull-step boundary commits state and triggers a re-render.
  const [cullAnchor, setCullAnchor] = useState(() => ({
    qx: Math.floor(-initialCam.x / 100),
    qy: Math.floor(-initialCam.y / 100),
  }));
  const cullQx = cullAnchor.qx;
  const cullQy = cullAnchor.qy;

  const visible = useMemo(() => {
    if (!dynamicBuildings) return null;
    const left = cullQx * CULL_STEP - CULL_MARGIN;
    const top = cullQy * CULL_STEP - CULL_MARGIN;
    const right = cullQx * CULL_STEP + view.w + CULL_MARGIN;
    const bottom = cullQy * CULL_STEP + view.h + CULL_MARGIN;
    const inBox = (x: number, y: number, w = 20, h = 20) =>
      x + w >= left && x <= right && y + h >= top && y <= bottom;
    return {
      clusters: dynamicBuildings.clusters.filter((c) => inBox(c.x, c.y, c.w, c.h)),
      forest: dynamicBuildings.forest.filter((f) => inBox(f.x, f.y, f.w, f.h)),
      groundTiles: dynamicBuildings.groundTiles.filter((g) => inBox(g.x, g.y)),
      wallTiles: (dynamicBuildings.wallTiles ?? []).filter((w) => inBox(w.x, w.y)),
      furnitureTiles: (dynamicBuildings.furnitureTiles ?? []).filter((f) => inBox(f.x, f.y)),
      bookcaseTiles: (dynamicBuildings.bookcaseTiles ?? []).filter((b) => inBox(b.x, b.y)),
      lightTiles: (dynamicBuildings.lightTiles ?? []).filter((l) => inBox(l.x, l.y)),
      rugTiles: (dynamicBuildings.rugTiles ?? []).filter((r) => inBox(r.x, r.y)),
      npcs: dynamicBuildings.npcs.filter((n) => inBox(n.x, n.y, 6, 6)),
      doors: activeDoors.filter(d => inBox(d.x, d.y)),
      typeA: dynamicBuildings.typeA.filter((b) => inBox(b.x, b.y, b.w, b.h)),
    };
  }, [dynamicBuildings, activeDoors, cullQx, cullQy, view.w, view.h]);



  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const targetX = camAxis(view.w, mapSizeRef.current.w, playerRef.current.x);
      const targetY = camAxis(view.h, mapSizeRef.current.h, playerRef.current.y);

      const dx = targetX - cameraRef.current.x;
      const dy = targetY - cameraRef.current.y;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
        cameraRef.current = { x: targetX, y: targetY };
      } else {
        cameraRef.current = {
          x: cameraRef.current.x + dx * 0.12,
          y: cameraRef.current.y + dy * 0.12,
        };
      }
      // Write the camera transform straight to the DOM — no React re-render.
      if (mapRef.current) {
        mapRef.current.style.transform = `translate(${cameraRef.current.x}px, ${cameraRef.current.y}px)`;
      }
      // Commit state only when the quantized cull cell changes.
      const qx = Math.floor(-cameraRef.current.x / CULL_STEP);
      const qy = Math.floor(-cameraRef.current.y / CULL_STEP);
      setCullAnchor((prev) => (prev.qx === qx && prev.qy === qy ? prev : { qx, qy }));

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [view]);

  // Neighbour indexes are presentation-only and built once per loaded layout.
  const themedTiles = useMemo(() => {
    const roads = new Set((dynamicBuildings?.groundTiles ?? []).filter(g => g.kind === 'ROAD').map(g => `${g.x / 20},${g.y / 20}`));
    const trees = new Set((dynamicBuildings?.forest ?? FOREST).map(f => `${Math.floor(f.x / 20)},${Math.floor(f.y / 20)}`));
    return { roads, trees };
  }, [dynamicBuildings]);

  const renderTypeA = (b: typeof A_23 | typeof A_47 | typeof A_89) => (
    <div key={`a-${b.id}-${b.x}-${b.y}`} 
      style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, pointerEvents: 'none', zIndex: 3 }}>
      <BuildingBlock cols={b.w / 20} rows={b.h / 20} size={20} numbered={false} doorway={false} glow={VILLAGE_GLOW} />
      {(b.id === 23 || b.id === 47) && feedback.id === b.id && (
        <p className="font-fell italic" style={{ fontSize: 14, color: 'var(--instrument-beacon)', marginTop: 4, animation: 'villageNotYet 1.5s ease-out forwards' }}>Not yet.</p>
      )}
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: VILLAGE_BG,
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes villagePulse { 0%,100% { opacity:.4 } 50% { opacity:1 } }
        @keyframes villageIdle  { 0%,100% { transform: scale(1) } 50% { transform: scale(1.15) } }
        @keyframes playerPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.6; } }
        @keyframes villageNotYet { 0% { opacity:.6 } 80% { opacity:.6 } 100% { opacity:0 } }
        @keyframes merchantSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes glowPulse { 0%, 100% { opacity: 0.55; transform: scale(0.94); } 50% { opacity: 0.9; transform: scale(1.06); } }
      `}</style>

      {/* TEMPORARY DEBUG — Bernard parity panel (?bernardParityCheck=1). REMOVE once verified. */}
      {parityRows.length > 0 && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
            background: 'rgba(6,6,12,0.96)', color: '#fff',
            font: '12px/1.5 monospace', padding: '10px 12px',
            maxHeight: '55vh', overflowY: 'auto',
            borderBottom: '1px solid #444',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            BERNARD PARITY CHECK — {parityRows.filter((r) => r.ok).length}/{parityRows.length} MATCH
          </div>
          {parityRows.map((r) => (
            <div key={r.label} style={{ padding: '4px 0', borderTop: '1px solid #222' }}>
              <div>
                <span style={{ color: r.ok ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                  {r.ok ? 'MATCH' : 'MISMATCH'}
                </span>{' '}
                — {r.label}
              </div>
              {!r.ok && (
                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#93c5fd' }}>NEW</div>
                    <div>text: {r.newText}</div>
                    <div>button: {String(r.newLabel)}</div>
                    <div>action: {String(r.newActionKey)}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fcd34d' }}>OLD</div>
                    <div>text: {r.oldText}</div>
                    <div>button: {String(r.oldLabel)}</div>
                    <div>action: {String(r.oldActionKey)}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!villageLoading && (
        <>
          {/* Map layer */}
          <div
            ref={mapRef}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: mapW,
              height: mapH,
              transform: `translate(${cameraRef.current.x}px, ${cameraRef.current.y}px)`,
              willChange: 'transform',
            }}
          >


        {/* One repeating ground layer, no per-cell ground nodes or grid overlay. */}
        <FloorLayer cols={mapW / 20} rows={mapH / 20} size={20} styleKey="ground" glow={VILLAGE_GLOW} />

        {/* Decorative streets and plaza plates use cached CSS images. */}
        <VillageTerrain ground={visible?.groundTiles ?? EMPTY_GROUND} forest={visible?.forest ?? FOREST} roads={themedTiles.roads} trees={themedTiles.trees} />

        {/* Rugs — decorative floor overlay, above base ground, below solids */}
        {visible?.rugTiles.map((r) => (
          <div
            key={`rug-${r.x}-${r.y}`}
            style={{ position: 'absolute', left: r.x, top: r.y, width: 20, height: 20, pointerEvents: 'none', zIndex: 2 }}
          >
            <RugCell trim={r.trim} />
          </div>
        ))}

        {/* Interior walls & furniture (solid) */}
        {visible?.wallTiles.map((w) => (
          <div
            key={`wall-${w.x}-${w.y}`}
            style={{ position: 'absolute', left: w.x, top: w.y, width: 20, height: 20, pointerEvents: 'none', zIndex: 3 }}
          >
            <WallCell />
          </div>
        ))}
        {visible?.furnitureTiles.map((f) => (
          <div
            key={`furn-${f.x}-${f.y}`}
            style={{ position: 'absolute', left: f.x, top: f.y, width: 20, height: 20, pointerEvents: 'none', zIndex: 3 }}
          >
            <FurnitureCell />
          </div>
        ))}
        {visible?.bookcaseTiles.map((b) => (
          <div
            key={`book-${b.x}-${b.y}`}
            style={{ position: 'absolute', left: b.x, top: b.y, width: 20, height: 20, pointerEvents: 'none', zIndex: 3 }}
          >
            <BookcaseCell col={Math.round(b.x / 20)} row={Math.round(b.y / 20)} />
          </div>
        ))}
        {visible?.lightTiles.map((l) => (
          <div
            key={`light-${l.x}-${l.y}`}
            style={{ position: 'absolute', left: l.x, top: l.y, width: 20, height: 20, pointerEvents: 'none', zIndex: 3 }}
          >
            <LightCell />
          </div>
        ))}

        {/* Forest blocks (outside outermost ring) */}

        {/* Forest atmosphere text fragments (hardcoded village only) */}
        {!dynamicBuildings &&
          FOREST_TEXTS.map((ft, i) => (
            <span
              key={`ft-${i}`}
              className="font-fell italic"
              style={{
                position: 'absolute',
                left: ft.x,
                top: ft.y,
                fontSize: 14,
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
        {eyePos && <CharacterEye
          cx={eyePos.x}
          cy={eyePos.y}

          color="#5b4fd4"
          size="small"
          playerPosition={player}
          zIndex={1}
        />}

        {/* One module SVG per existing building footprint. */}
        {visible?.clusters.map((c) => (
          <div key={c.id} style={{ position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h, zIndex: 3, pointerEvents: 'none' }}>
            <BuildingBlock cols={c.cols} rows={c.rows} size={20} doorway={!footprintHasDoor(c, activeDoors)} glow={VILLAGE_GLOW} />
          </div>
        ))}
        {!dynamicBuildings && [...TYPE_RIM, ...TYPE_C, ...TYPE_B].map((b) => (
          <div key={b.id} style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, zIndex: 3, pointerEvents: 'none' }}>
            <BuildingBlock cols={b.w / 20} rows={b.h / 20} size={20} doorway={!footprintHasDoor(b, activeDoors)} glow={VILLAGE_GLOW} />
          </div>
        ))}
        {(visible ? visible.typeA : TYPE_A).map(renderTypeA)}
        {(visible ? visible.doors : activeDoors).map(d => (
          <div key={`door-${d.kind}-${d.x}-${d.y}`} style={{ position: 'absolute', left: d.x, top: d.y, width: 20, height: 20, zIndex: 5, pointerEvents: 'none' }}>
            <VillageDoor kind={d.kind} touched={getFlag(DOOR_FLAGS[d.kind]) === 'true'} />
          </div>
        ))}

        {/* Villagers — rendered inside map div, positioned in map pixel coords */}
        {activeVillagers.map((v) => (
          <div
            key={`villager-${v.id}`}
            style={{
              position: 'absolute',
              left: v.x,
              top: v.y,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.8)',
              boxShadow: '0 0 8px rgba(255,255,255,0.5)',
              transition: 'left 1500ms ease-in-out, top 1500ms ease-in-out',
              pointerEvents: 'none',
              zIndex: 4,
            }}
          />
        ))}

        {/* Dynamic NPCs — static markers from the loaded village layout */}
        {visible?.npcs.map((n) => (
          <div
            key={`dnpc-${n.x}-${n.y}`}
            title={n.name || undefined}
            style={{
              position: 'absolute',
              left: n.x,
              top: n.y,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.8)',
              boxShadow: '0 0 8px rgba(255,255,255,0.5)',
              pointerEvents: 'none',
              zIndex: 4,
            }}
          />
        ))}

        {/* Merchant character */}
        {merchantPos && <MerchantCharacter x={merchantPos.x} y={merchantPos.y} palette="green" />}

        {/* Bernard marker */}
        {bernardPos && (<>
        <img
          src={bernardMarkerUrl}
          width={24}
          height={24}
          style={{
            position: 'absolute',
            left: bernardPos.x - 12,
            top: bernardPos.y - 12,
            pointerEvents: 'none',
            zIndex: 4,
          }}
        />
        <span
          className="font-mono"
          style={{
            position: 'absolute',
            left: bernardPos.x - 4,
            top: bernardPos.y - 24,
            fontSize: 14,
            color: 'rgba(200,150,58,0.6)',
            pointerEvents: 'none',
            zIndex: 4,
          }}
        >
          B
        </span>
        </>)}



        {/* Ghost players */}
        {ghostDots.map((ghost) => (
          <div
            key={ghost.user_id}
            onMouseEnter={(e) => setTooltipState({
              visible: true,
              x: e.clientX + 10,
              y: e.clientY - 24,
              level: ghost.village_level,
            })}
            onMouseLeave={() => setTooltipState((t) => ({ ...t, visible: false }))}
            style={{
              position: 'absolute',
              left: ghost.x - 3,
              top: ghost.y - 3,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'rgba(91,79,212,0.18)',
              pointerEvents: 'auto',
              zIndex: 2,
              cursor: 'default',
            }}
          />
        ))}

        {/* Player avatar — orb centre sits at the player position */}
        <div
          style={{
            position: 'absolute',
            left: player.x - 15,
            top: player.y - 15,
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          <PlayerAvatar
            palette={paletteFromColor(auraColor, registrationNumber)}
            walking={Math.hypot(playerTargetRef.current.x - player.x, playerTargetRef.current.y - player.y) >= 0.5}
            size={30}
          />
        </div>
        {currentTitle && (
          <p
            className="font-fell italic"
            style={{
              position: 'absolute',
              left: player.x,
              top: player.y + 22,
              transform: 'translateX(-50%)',
              fontSize: 12,
              color: 'rgba(224,221,213,0.28)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            {currentTitle}
          </p>
        )}
      </div>
      </>
    )}

    {villageLoading && (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            maxWidth: 'min(720px, 84vw)',
          }}
        >
          <img
            src="/assets/sigils/PRAEM-logo-instrument-icon.svg"
            alt="PRÆM"
            width="64"
            height="38"
            className="object-contain"
            style={{ display: 'block', marginBottom: 8 }}
          />
          <p
            className="font-fell italic"
            style={{
              fontSize: 18,
              lineHeight: 1.55,
              color: 'rgba(200,185,255,0.7)',
              textAlign: 'center',
              margin: 0,
            }}
          >
            You will now enter The Instrument PRÆM. Numbers answer to nothing but themselves. And One. Remember where you came from. It guides your flow. Now enter The Instrument PRÆM to become part of it.
          </p>
          <div
            className="font-cinzel"
            style={{
              fontSize: 14,
              letterSpacing: '0.2em',
              color: 'rgba(160,140,200,0.5)',
              animation: 'villagePulse 2s ease-in-out infinite',
            }}
          >
            LOADING
          </div>
        </div>
      </div>
    )}



      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, background: VILLAGE_VIGNETTE, pointerEvents: 'none', zIndex: 7 }} />

      {/* Ghost hover tooltip */}
      {tooltipState.visible && (
        <div
          className="font-mono"
          style={{
            position: 'fixed',
            left: tooltipState.x,
            top: tooltipState.y,
            fontSize: 10,
            color: 'rgba(160,140,200,0.7)',
            background: 'rgba(4,4,10,0.9)',
            border: '0.5px solid rgba(100,80,160,0.3)',
            borderRadius: 4,
            padding: '4px 8px',
            pointerEvents: 'none',
            zIndex: 60,
          }}
        >
          {`· Level ${tooltipState.level}`}
        </div>
      )}



      {/* Entity quote (screen-fixed) */}
      <p
        className="font-fell italic"
        style={{
          position: 'absolute',
          top: 24,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 18,
          margin: 0,
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        Another one enters?
      </p>

      {/* Villager whisper */}
      {villagerWhisper && (
        <p
          key={`vw-${villagerWhisper}`}
          className="font-fell italic"
          style={{
            position: 'fixed',
            top: '18%',
            left: 0,
            width: '100vw',
            textAlign: 'center',
            fontSize: 20,
            color: 'rgba(255,255,255,0.8)',
            textShadow: '0 0 12px rgba(255,255,255,0.3)',
            margin: 0,
            zIndex: 50,
            pointerEvents: 'none',
            animation: 'villageNotYet 2.5s ease-out forwards',
          }}
        >
          {villagerWhisper}
        </p>
      )}

      {/* Easter egg whisper */}
      {dailyStepsMessage && !villageLoading && (
        <p role="status" className="font-fell italic pointer-events-none fixed left-4 right-4 top-[18%] z-[60] m-0 mx-auto max-w-[520px] break-words text-center text-xl leading-relaxed text-foreground">
          {dailyStepsMessage}
        </p>
      )}
      {whisper && (
        <p
          key={whisper}
          className="font-fell italic"
          style={{
            position: 'fixed',
            top: '18%',
            left: 0,
            width: '100vw',
            textAlign: 'center',
            fontSize: 20,
            textShadow: '0 0 12px rgba(91,79,212,0.6)',
            margin: 0,
            zIndex: 50,
            pointerEvents: 'none',
            animation: 'villageNotYet 2.5s ease-out forwards',
          }}
        >
          {whisper}
        </p>
      )}


      <Thumbstick
        onDirectionChange={(dc, dr) => { stickDirRef.current = { dc, dr }; }}
        disabled={profileOpenDisplay || merchantOpen || bernardOpen || paywallOpen}
      />

      {/* HUD bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(4,4,10,0.92)',
          borderTop: '0.5px solid rgba(169,140,255,0.3)',
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          zIndex: 12,
        }}
      >
        <span className="font-mono" style={{ fontSize: 13, letterSpacing: '0.06em', color: '#e0ddd5', whiteSpace: 'nowrap' }}>
          STEPS&nbsp;{String(stepsRemaining).padStart(2, '0')}
        </span>
        <span className="font-mono" style={{ fontSize: 13, letterSpacing: '0.06em', color: '#c8963a', whiteSpace: 'nowrap' }}>
          CREDITS&nbsp;{String(credits).padStart(2, '0')}
        </span>
        <span className="font-mono" style={{ fontSize: 13, letterSpacing: '0.06em', color: '#5b4fd4', whiteSpace: 'nowrap' }}>
          LEVEL&nbsp;{String(currentLevel).padStart(2, '0')}
        </span>
        <ProfileButton onClick={openProfile} />
      </div>

      {/* Trial countdown — shown above HUD while on trial */}
      {subscriptionStatus === 'trial' && (
        <div
          className="font-mono"
          style={{
            position: 'absolute',
            bottom: 38,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'rgba(160,140,200,0.4)',
            zIndex: 12,
            pointerEvents: 'none',
          }}
        >
          {trialDaysRemaining} day{trialDaysRemaining === 1 ? '' : 's'} remaining in trial
        </div>
      )}

      {/* Registration number — top-right (display only; 5 rapid taps open dev menu) */}
      <div
        className="font-mono"
        onPointerDown={handleRegTap}
        style={{
          position: 'fixed',
          top: 12,
          right: 14,
          fontSize: 15,
          letterSpacing: '0.22em',
          color: 'rgba(160,140,200,0.7)',
          zIndex: 15,
          padding: 4,
          userSelect: 'none',
        }}
      >
        #{registrationNumber !== null ? String(registrationNumber).padStart(4, '0') : '????'}
      </div>

      {/* Unspent growth points — top-right, below the registration number */}
      {growthPoints > 0 && (
        <div
          className="font-mono"
          style={{
            position: 'fixed',
            top: 40,
            right: 14,
            minWidth: 26,
            padding: '3px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(200,150,58,0.16)',
            border: '0.5px solid rgba(200,150,58,0.55)',
            color: '#c8963a',
            fontSize: 14,
            letterSpacing: '0.12em',
            zIndex: 15,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          +{growthPoints}
        </div>
      )}




      {devOverlay && (
        <div
          className="font-mono"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
          onClick={() => setDevOverlay(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#000', border: '1px solid #a98cff', padding: 20,
              minWidth: 240, display: 'flex', flexDirection: 'column', gap: 10,
              color: '#a98cff', fontSize: 13, letterSpacing: '0.1em',
              maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
            }}
          >
            <div style={{ opacity: 0.7, marginBottom: 6 }}>DEV MENU</div>

            <div style={{ opacity: 0.7, fontSize: 11 }}>PROFILE</div>
            <button type="button" onClick={handleDevReset} style={{ background: 'transparent', border: '1px solid #a98cff', color: '#a98cff', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>Reset profile</button>
            <button type="button" onClick={async () => {
              Object.keys(localStorage).filter(k => k.startsWith('praem_')).forEach(k => localStorage.removeItem(k));
              localStorage.removeItem('praem_aura_color');
              sessionStorage.clear();
              if (user) {
                await supabase.from('quest_flags').delete().eq('user_id', user.id);
                await supabase.from('fragments').delete().eq('user_id', user.id);
                await updateUser(user.id, {
                  entity_answer: null,
                  username: null,
                  aura_color: '#5b4fd4',
                  level: 1,
                  credits: 150,
                  steps_remaining: 200,
                  subscription_status: 'dev',
                  title: null,
                  unlocked_titles: [],
                } as never);
              }
              setDevOverlay(false);
              await supabase.auth.signOut();
              navigate('/');
            }} style={{ background: 'transparent', border: '1px solid #ff6b6b', color: '#ff6b6b', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>FULL RESET</button>

            <div style={{ height: 1, background: 'rgba(160,140,200,0.15)', margin: '6px 0' }} />
            <div style={{ opacity: 0.7, fontSize: 11 }}>SUBSCRIPTION OVERRIDES</div>
            <button type="button" onClick={() => { sessionStorage.setItem('dev_sub_override', 'active'); setDevOverlay(false); }} style={{ background: 'transparent', border: '1px solid #a98cff', color: '#a98cff', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>SET SUB: ACTIVE</button>
            <button type="button" onClick={() => { sessionStorage.setItem('dev_sub_override', 'expired'); setDevOverlay(false); }} style={{ background: 'transparent', border: '1px solid #a98cff', color: '#a98cff', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>SET SUB: EXPIRED</button>
            <button type="button" onClick={() => { sessionStorage.removeItem('dev_sub_override'); setDevOverlay(false); }} style={{ background: 'transparent', border: '1px solid #a98cff', color: '#a98cff', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>CLEAR OVERRIDE</button>

            <div style={{ height: 1, background: 'rgba(160,140,200,0.15)', margin: '6px 0' }} />
            <div style={{ opacity: 0.7, fontSize: 11 }}>LEVEL JUMP</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number" min={1} max={30} value={devVillageLevel}
                onChange={(e) => setDevVillageLevel(e.target.value)}
                style={{ background: '#000', border: '1px solid rgba(169,140,255,0.4)', color: '#a98cff', padding: '6px 8px', width: 64, fontFamily: 'inherit', fontSize: 13 }}
              />
              <button type="button" onClick={async () => {
                const n = Math.min(30, Math.max(1, parseInt(devVillageLevel, 10) || 1));
                setDevOverlay(false);
                if (user) await updateUser(user.id, { level: n });
                navigate('/village');
              }} style={{ flex: 1, background: 'transparent', border: '1px solid #a98cff', color: '#a98cff', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>JUMP → VILLAGE L#</button>
            </div>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number" min={1} max={30} value={devMazeLevel}
                onChange={(e) => setDevMazeLevel(e.target.value)}
                style={{ background: '#000', border: '1px solid rgba(169,140,255,0.4)', color: '#a98cff', padding: '6px 8px', width: 64, fontFamily: 'inherit', fontSize: 13 }}
              />
              <button type="button" onClick={async () => {
                const n = Math.min(30, Math.max(1, parseInt(devMazeLevel, 10) || 1));
                setDevOverlay(false);
                if (user) await updateUser(user.id, { level: n });
                navigate('/maze');
              }} style={{ flex: 1, background: 'transparent', border: '1px solid #a98cff', color: '#a98cff', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>JUMP → MAZE L#</button>
            </div>

            <div style={{ height: 1, background: 'rgba(160,140,200,0.15)', margin: '6px 0' }} />
            <div style={{ opacity: 0.7, fontSize: 11 }}>BERNARD STAGE</div>
            {devStageNote && <div style={{ fontSize: 11, color: '#c8963a' }}>{devStageNote}</div>}
            {([
              { label: 'stage_0', stage: 0, touched: null as boolean | null },
              { label: 'stage_1 (pending)', stage: 1, touched: false },
              { label: 'stage_1 (ready)', stage: 1, touched: true },
              { label: 'stage_2', stage: 2, touched: null },
              { label: 'stage_3', stage: 3, touched: null },
              { label: 'stage_4', stage: 4, touched: null },
              { label: 'stage_5', stage: 5, touched: null },
              { label: 'stage_6', stage: 6, touched: null },
            ]).map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={async () => {
                  if (!user) return;
                  await setFlag(user.id, 'bernard_stage', String(s.stage));
                  if (s.touched !== null) {
                    const v = s.touched ? 'true' : 'false';
                    await setFlag(user.id, 'touched_23', v);
                    await setFlag(user.id, 'touched_47', v);
                    await setFlag(user.id, 'touched_89', v);
                  }
                  setDevStageNote(`SET → ${s.label}`);
                  setDevOverlay(false);
                }}
                style={{ background: 'transparent', border: '1px solid rgba(169,140,255,0.5)', color: '#a98cff', padding: '6px 10px', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}
              >
                {s.label}
              </button>
            ))}

            <div style={{ height: 1, background: 'rgba(160,140,200,0.15)', margin: '6px 0' }} />
            <div style={{ opacity: 0.7, fontSize: 11 }}>NAVIGATION</div>
            <button type="button" onClick={() => { setDevOverlay(false); navigate('/maze'); }} style={{ background: 'transparent', border: '1px solid #a98cff', color: '#a98cff', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>Skip to Maze</button>
            <button type="button" onClick={() => { setDevOverlay(false); navigate('/door'); }} style={{ background: 'transparent', border: '1px solid #a98cff', color: '#a98cff', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>Skip to Door</button>
            <button type="button" onClick={async () => { setDevOverlay(false); if (user) await updateUser(user.id, { level: 1 }); navigate('/maze'); }} style={{ background: 'transparent', border: '1px solid #a98cff', color: '#a98cff', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>JUMP → MAZE L1</button>
            <button type="button" onClick={async () => { setDevOverlay(false); if (user) await updateUser(user.id, { level: 2 }); navigate('/maze'); }} style={{ background: 'transparent', border: '1px solid #a98cff', color: '#a98cff', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>JUMP → MAZE L2</button>
            <button type="button" onClick={() => { setDevOverlay(false); navigate('/shadow'); }} style={{ background: 'transparent', border: '1px solid #a98cff', color: '#a98cff', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>JUMP → SHADOW</button>



            <button type="button" onClick={() => setDevOverlay(false)} style={{ background: 'transparent', border: '1px solid rgba(169,140,255,0.4)', color: 'rgba(169,140,255,0.7)', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>Close</button>
          </div>
        </div>
      )}

      {/* Profile rendered via shared ProfileOverlay below (matches ShadowRealm pattern) */}

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
            <ellipse cx={60} cy={40} rx={40} ry={24} stroke="rgba(160,140,200,0.5)" strokeWidth={1} fill="none" />
            <circle cx={60} cy={40} r={6} fill="#5b4fd4" />
          </svg>

          <div
            className="font-cinzel"
            style={{
              fontSize: 48,
              color: '#c8963a',
              marginTop: 24,
              animation: 'villageLevelUpText 400ms ease-out 400ms both, villageLevelPulse 1.2s ease-in-out 800ms infinite',
              letterSpacing: '0.12em',
            }}
          >
            LEVEL {levelUpOverlay.newLevel}
          </div>

          {(parseInt(getFlag('bernard_stage') || '0', 10) >= 5) && (
            <>
              <div
                className="font-fell italic"
                style={{
                  fontSize: 16,
                  color: 'rgba(160,140,200,0.5)',
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
                  color: 'rgba(160,140,200,0.9)',
                  marginTop: 8,
                  animation: 'villageLevelUpText 400ms ease-out 1000ms both',
                  letterSpacing: '0.08em',
                }}
              >
                {TITLES_BY_LEVEL[levelUpOverlay.newLevel] || ''}
              </div>

              <div
                className="font-cinzel"
                style={{
                  fontSize: 14,
                  color: 'rgba(160,140,200,0.4)',
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
                        fontSize: 14,
                        padding: '6px 14px',
                        border: `0.5px solid ${sel ? '#c8963a' : 'rgba(160,140,200,0.3)'}`,
                        borderRadius: 2,
                        color: sel ? '#c8963a' : 'rgba(160,140,200,0.6)',
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
            </>
          )}

          <button
            className="font-cinzel"
            onClick={async () => {
              setLevelUpHandled(true);
              const newLv = levelUpOverlay.newLevel;
              const newSocial = socialStatus + 1; // fixed gain per level-up
              if (user) {
                await restUpdate(
                  'users',
                  {
                    title: overlaySelectedTitle,
                    levelup_pending: false,
                    levelup_newlevel: 0,
                    level: newLv,
                    social: newSocial,
                  },
                  'id',
                  user.id,
                );
                setSocialStatus(newSocial);
              }
              setCurrentLevel(newLv);
              setLevelUpOverlay(null);
            }}
            style={{
              fontSize: 16,
              letterSpacing: '0.3em',
              background: '#c8963a',
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
            color: 'rgba(160,140,200,0.85)',
            textShadow: '0 0 12px rgba(91,79,212,0.6)',
            margin: 0,
            animation: 'villageNotYet 3s ease-out forwards',
          }}
        >
          {eyeMessage}
        </p>
      )}

      {/* Merchant overlay */}
      {user && (
        <MerchantOverlay
          open={merchantOpen}
          onClose={() => setMerchantOpen(false)}
          palette="green"
          title="The Merchant."
          openingLines={MERCHANT_LINES}
          userId={user.id}
          credits={credits}
          onCreditsChange={(n) => setCredits(n)}
          items={(() => {
            const list: MerchantItem[] = [
              {
                key: 'steps',
                label: '500 Steps',
                cost: 5,
                onPurchase: () => {
                  if (!stepsReadyRef.current) return;
                  const next = stepsRemaining + 500;
                  setStepsRemaining(next);
                  updateUser(user.id, { steps_remaining: next });
                },
              },
              {
                key: 'visibility',
                label: 'Visibility +2 cells (this run)',
                cost: 20,
              },
            ];
            if (currentLevel >= 5) {
              list.push({
                key: 'detector',
                label: 'Fragment Detector (60 sec)',
                cost: 50,
              });
            }
            if (currentLevel >= 10) {
              list.push({
                key: 'primemap',
                label: 'Prime Map (60 sec)',
                cost: 100,
              });
            }
            if (currentLevel >= 15) {
              list.push({
                key: 'pastmaze',
                label: 'Past Maze Access',
                cost: 200,
                onPurchase: () => 'Available in the Shadow Realm.',
              });
            }
            return list;
          })()}
        />
      )}

      {/* Bernard dialogue overlay */}
      {bernardOpen && resolvedDialogue && (
        <NpcDialogue npcName="Bernard" npcPortraitSrc={bernardMarkerUrl} text={resolvedDialogue.text} onShow={resolvedDialogue.onShow}>
          {(resolvedDialogue.options ?? []).map((o, i) => (
            <button
              key={`${o.label}-${i}`}
              type="button"
              className="font-cinzel"
              onClick={() => {
                o.onSelect();
                if (o.closes) setBernardOpen(false);
              }}
              style={{
                background: 'rgba(200,150,58,0.18)',
                border: '0.5px solid rgba(200,150,58,0.5)',
                color: '#c8963a',
                padding: '6px 12px',
                fontSize: 20,
                letterSpacing: '0.02em',
                cursor: 'pointer',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              {o.label.toUpperCase()}
            </button>
          ))}
          {!(resolvedDialogue.options ?? []).length && resolvedDialogue.buttonLabel && (
            <button
              type="button"
              className="font-cinzel"
              onClick={() => {
                resolvedDialogue.buttonAction?.();
                setBernardOpen(false);
              }}
              style={{
                background: 'rgba(200,150,58,0.18)',
                border: '0.5px solid rgba(200,150,58,0.5)',
                color: '#c8963a',
                padding: '6px 12px',
                fontSize: 20,
                letterSpacing: '0.02em',
                cursor: 'pointer',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              {resolvedDialogue.buttonLabel.toUpperCase()}
            </button>
          )}

          <button
            type="button"
            className="font-cinzel"
            onClick={() => setBernardOpen(false)}
            style={{
              background: 'transparent',
              border: '0.5px solid rgba(160,140,200,0.3)',
              color: 'rgba(160,140,200,0.5)',
              padding: '8px 18px',
              fontSize: 20,
              letterSpacing: '0.3em',
              cursor: 'pointer',
            }}
          >
            CLOSE
          </button>
        </NpcDialogue>
      )}


      <ProfileOverlay
        isOpen={profileOpenDisplay}
        onClose={closeProfile}
        context="village"
        growthPoints={growthPoints}
        socialStat={socialStat}
        perceptionStat={perceptionStat}
        tradeStat={tradeStat}
      />

      {!BETA_MODE && paywallOpen && (
        <PaywallOverlay
          userId={user?.id ?? ''}

          onContinue={async () => {
            setPaywallOpen(false);
            // If the paywall was opened to accept the Alexandra quest,
            // re-check subscription and persist the quest flags on success.
            if (paywallIntentRef.current === 'alexandra' && user) {
              paywallIntentRef.current = null;
              const status = await checkSubscriptionStatus(user.id);
              setSubscriptionStatus(status);
              const allowed = status === 'active' || status === 'lifetime' || status === 'dev' || status === 'trial';
              if (allowed) {
                await setFlag(user.id, 'alexandra_quest', 'active');
                await setFlag(user.id, 'bernard_stage', '6');
                bumpFlags();
              }
            }
          }}
          onDismiss={() => {
            paywallIntentRef.current = null;
            setPaywallOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default Village;
