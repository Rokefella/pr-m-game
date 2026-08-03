import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// player ID sourced from localStorage
import { fetchOrCreateUser, updateUser } from '@/lib/userData';
import { useAuth } from '@/context/AuthContext';
import { restUpdate } from '@/lib/supabaseRest';
import MerchantOverlay, { MerchantCharacter, type MerchantItem } from '@/components/MerchantOverlay';
import PaywallOverlay from '@/components/PaywallOverlay';
import ProfileOverlay, { ProfileButton } from '@/components/ProfileOverlay';
import BernardDialogue from '@/components/BernardDialogue';
import CharacterEye from '@/components/CharacterEye';
import { checkSubscriptionStatus, canAccessMaze, getDaysRemainingInTrial, type SubscriptionStatus } from '@/lib/subscriptionStatus';
import { supabase } from '@/lib/supabase';
import { getAllFlags, getFlag, setFlag } from '@/lib/questFlags';


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
  typeB: Rect[];
  typeC: Rect[];
  clusters: BuildingCluster[];
  forest: ForestBlock[];
  groundTiles: GroundTile[];
  wallTiles?: Rect[];
  furnitureTiles?: Rect[];
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

const CLUSTER_FILL: Record<ClusterKind, string> = {
  S: '#7ec8e3',
  M: '#3a86c4',
  L: '#1e3a6b',
};

// Deterministic pseudo-random from cluster position (stable across renders)
function clusterRand(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// One grouped building image, sized to the cluster's bounding box.
// Rooftop detail density scales with the cluster's total cell count.
const ClusterBuilding = memo(function ClusterBuilding({ cluster }: { cluster: BuildingCluster }) {
  const { x, y, w, h, cols, rows, cells, kind } = cluster;
  const fill = CLUSTER_FILL[kind];
  const rnd = clusterRand(x * 31 + y * 17 + cells);

  // Detail counts interpolate with area
  const ventCount = Math.max(1, Math.min(10, Math.round(cells * 0.8)));
  const ventSize = Math.max(3, Math.min(8, Math.round(3 + Math.sqrt(cells))));
  const skyW = Math.max(6, Math.min(w - 8, Math.round(6 + cells * 1.4)));
  const skyH = Math.max(4, Math.min(h - 8, Math.round(4 + cells * 0.9)));
  const hatch = Math.max(3, Math.min(7, Math.round(2 + Math.sqrt(cells))));

  const vents = Array.from({ length: ventCount }, (_, i) => ({
    i,
    vx: 3 + rnd() * Math.max(1, w - ventSize - 6),
    vy: 3 + rnd() * Math.max(1, h - ventSize - 6),
  }));

  const seams: React.ReactNode[] = [];
  for (let c = 1; c < cols; c++) {
    seams.push(
      <rect key={`sv-${c}`} x={c * 20} y={0} width={1} height={h} fill="rgba(0,0,0,0.28)" />,
    );
  }
  for (let r = 1; r < rows; r++) {
    seams.push(
      <rect key={`sh-${r}`} x={0} y={r * 20} width={w} height={1} fill="rgba(0,0,0,0.28)" />,
    );
  }

  const skyX = Math.max(3, (w - skyW) / 2);
  const skyY = Math.max(3, (h - skyH) / 2);

  return (
    <>
      {/* dark offset shadow behind footprint */}
      <div
        style={{
          position: 'absolute',
          left: x + 3,
          top: y + 3,
          width: w,
          height: h,
          background: 'rgba(2,2,10,0.65)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          pointerEvents: 'none',
          zIndex: 3,
          display: 'block',
          overflow: 'hidden',
        }}
      >
        <rect x={0} y={0} width={w} height={h} fill={fill} />
        {seams}
        {/* rooftop HVAC vents */}
        {vents.map((v) => (
          <rect
            key={`v-${v.i}`}
            x={v.vx}
            y={v.vy}
            width={ventSize}
            height={ventSize}
            fill="rgba(10,14,26,0.85)"
          />
        ))}
        {/* skylight panel */}
        <rect
          x={skyX + 0.5}
          y={skyY + 0.5}
          width={Math.max(0, skyW - 1)}
          height={Math.max(0, skyH - 1)}
          fill="rgba(226,240,250,0.55)"
          stroke="rgba(10,14,26,0.5)"
          strokeWidth={1}
        />
        {/* access hatch */}
        <rect
          x={w - 3 - hatch}
          y={h - 3 - hatch}
          width={hatch}
          height={hatch}
          fill="rgba(20,26,40,0.9)"
        />
        {/* outer border */}
        <rect
          x={0.5}
          y={0.5}
          width={Math.max(0, w - 1)}
          height={Math.max(0, h - 1)}
          fill="none"
          stroke="rgba(4,4,10,0.55)"
          strokeWidth={1}
        />
      </svg>
    </>
  );
});




// Decorative ground tile colors (muted, atmospheric — no border radius)
const GROUND_TILE_COLORS: Record<GroundTile['kind'], string> = {
  PATH: 'rgba(224,221,213,0.045)',
  ROAD: 'rgba(224,221,213,0.075)',
  SQUARE: 'rgba(169,140,255,0.07)',
  LANDMARK: 'rgba(200,148,58,0.12)',
};

// Kasseien-style paving block tile for PATH/ROAD cells
const PAVING_BLOCKS: Array<{ x: number; y: number; w: number; h: number; rx: number; fill: string }> = [
  { x: 0.5, y: 0.5, w: 5, h: 6, rx: 0.8, fill: 'rgba(75,80,100,0.35)' },
  { x: 6, y: 0.5, w: 6.5, h: 5.5, rx: 0.8, fill: 'rgba(68,72,92,0.35)' },
  { x: 13, y: 0.5, w: 4, h: 6.5, rx: 0.8, fill: 'rgba(80,85,105,0.35)' },
  { x: 17.3, y: 0.5, w: 2.2, h: 6, rx: 0.6, fill: 'rgba(70,74,94,0.35)' },
  { x: 0.5, y: 7.3, w: 4, h: 6, rx: 0.8, fill: 'rgba(72,76,96,0.35)' },
  { x: 4.8, y: 7, w: 5.5, h: 6.3, rx: 0.8, fill: 'rgba(80,85,105,0.35)' },
  { x: 10.6, y: 7.3, w: 7, h: 5.7, rx: 0.8, fill: 'rgba(66,70,90,0.35)' },
  { x: 17.9, y: 7, w: 1.8, h: 6.2, rx: 0.5, fill: 'rgba(76,80,100,0.35)' },
  { x: 0.5, y: 13.7, w: 6, h: 6, rx: 0.8, fill: 'rgba(70,74,94,0.35)' },
  { x: 6.8, y: 13.9, w: 4.2, h: 5.8, rx: 0.8, fill: 'rgba(82,87,107,0.35)' },
  { x: 11.3, y: 13.6, w: 5.2, h: 6.1, rx: 0.8, fill: 'rgba(74,78,98,0.35)' },
  { x: 16.8, y: 13.9, w: 2.7, h: 5.8, rx: 0.6, fill: 'rgba(78,82,102,0.35)' },
];

const PavingCell = memo(({ col, row }: { col: number; row: number }) => {
  const v = (col + row) % 4;
  const sx = v === 1 || v === 3 ? -1 : 1;
  const sy = v === 2 || v === 3 ? -1 : 1;
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <rect width="20" height="20" fill="rgba(15,18,28,0.4)" />
      <g transform={`translate(${sx === -1 ? 20 : 0} ${sy === -1 ? 20 : 0}) scale(${sx} ${sy})`}>
        {PAVING_BLOCKS.map((b, i) => (
          <rect
            key={i}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            rx={b.rx}
            fill={b.fill}
            stroke="rgba(140,150,190,0.15)"
            strokeWidth={0.3}
          />
        ))}
      </g>
    </svg>
  );
});

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

// SVG tree rendered for every forest block/cell. Size variant derived from grid position.
const ForestTreeCell = memo(({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => {
  const col = Math.floor(x / 20);
  const row = Math.floor(y / 20);
  const v = (col + row) % 3;
  const outer =
    v === 0
      ? { cx: 10, cy: 9, rx: 6, ry: 7 }
      : v === 1
        ? { cx: 10, cy: 10, rx: 5, ry: 6 }
        : { cx: 10, cy: 8, rx: 7, ry: 8 };
  const inner =
    v === 0
      ? { cx: 10, cy: 7, rx: 4, ry: 5 }
      : v === 1
        ? { cx: 10, cy: 9, rx: 3, ry: 4 }
        : { cx: 10, cy: 6, rx: 5, ry: 6 };
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 20 20"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <rect
          x="0"
          y="0"
          width="20"
          height="20"
          rx="1"
          fill="rgba(30,80,50,0.15)"
          stroke="rgba(40,100,60,0.35)"
          strokeWidth="0.5"
        />
        <ellipse
          cx={outer.cx}
          cy={outer.cy}
          rx={outer.rx}
          ry={outer.ry}
          fill="rgba(25,70,40,0.65)"
        />
        <ellipse
          cx={inner.cx}
          cy={inner.cy}
          rx={inner.rx}
          ry={inner.ry}
          fill="rgba(35,95,52,0.75)"
        />
        <rect x="9" y="16" width="2" height="3" rx="1" fill="rgba(20,50,30,0.8)" />
      </svg>
    </div>
  );
});
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
  const [villageLoading, setVillageLoading] = useState(true);
  const villageLoadingRef = useRef(true);
  useEffect(() => { villageLoadingRef.current = villageLoading; }, [villageLoading]);
  const dynSpawnDoneRef = useRef(false);
  const moveRef = useRef<(dx: number, dy: number) => void>(() => {});


  // Active map bounds: dynamic village size when present, hardcoded map otherwise
  const mapW = dynamicBuildings ? dynamicBuildings.gridSize * 20 : MAP_W;
  const mapH = dynamicBuildings ? dynamicBuildings.gridSize * 20 : MAP_H;
  const mapSizeRef = useRef({ w: mapW, h: mapH });
  mapSizeRef.current = { w: mapW, h: mapH };
  // Bernard/Merchant positions: dynamic village cells with safe fallbacks
  const bernardPos = dynamicBuildings
    ? (dynamicBuildings.bernardCenter ?? { x: mapW / 2, y: mapH / 2 })
    : BERNARD_VILLAGE;
  const merchantPos = dynamicBuildings
    ? (dynamicBuildings.merchantCenter ?? { x: mapW / 2, y: mapH / 2 })
    : MERCHANT;
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
      const status = (override as SubscriptionStatus | null) ?? (await checkSubscriptionStatus(user.id));
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
    navigate('/entity-questions');
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
  // Forces re-render of Bernard dialogue when quest flags change.
  const [, setFlagsVersion] = useState(0);
  const bumpFlags = useCallback(() => setFlagsVersion((v) => v + 1), []);

  const getBernardStage = (): number => {
    return parseInt(getFlag('bernard_stage') || '0', 10);
  };

  // Helper: persist a Bernard stage advance.
  const advanceBernardStage = useCallback(
    async (stage: number) => {
      if (!user) return;
      await setFlag(user.id, 'bernard_stage', String(stage));
      bumpFlags();
    },
    [user, bumpFlags],
  );

  const acceptAlexandraQuest = useCallback(async () => {
    if (!user) return;
    const status = subscriptionStatusRef.current;
    const allowed = status === 'active' || status === 'lifetime' || status === 'dev' || status === 'trial';
    if (allowed) {
      await setFlag(user.id, 'alexandra_quest', 'active');
      await setFlag(user.id, 'bernard_stage', '6');
      bumpFlags();
    } else {
      paywallIntentRef.current = 'alexandra';
      setPaywallOpen(true);
    }
  }, [user, bumpFlags]);

  // Single source of truth for Bernard dialogue.
  type BernardDialogueData = {
    text: string;
    buttonLabel: string | null;
    buttonAction?: () => void;
    onShow?: () => void;
  };

  // ── Data-driven Bernard dialogue (npc_dialogue_stages) ──
  type BernardStageRow = {
    stage_key: string;
    text: string;
    button_label: string | null;
    button_action_key: string | null;
    on_show_action_key: string | null;
    order_index: number;
    condition: {
      stage?: number;
      requires_flags?: Record<string, string>;
      flags_equal?: boolean;
    } | null;
  };

  const [bernardStages, setBernardStages] = useState<BernardStageRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: npcRow, error: npcErr } = await supabase
        .from('npcs')
        .select('id')
        .eq('npc_key', 'bernard')
        .maybeSingle();
      if (npcErr || !npcRow) {
        if (npcErr) console.error('[Village] bernard npc lookup failed', npcErr);
        return;
      }
      const { data, error } = await supabase
        .from('npc_dialogue_stages')
        .select('stage_key, text, button_label, button_action_key, on_show_action_key, order_index, condition')
        .eq('npc_id', (npcRow as { id: string }).id)
        .order('order_index', { ascending: true });
      if (error) {
        console.error('[Village] bernard dialogue stages fetch failed', error);
        return;
      }
      if (!cancelled) setBernardStages((data as BernardStageRow[]) || []);
    })();
    return () => { cancelled = true; };
  }, []);

  // Evaluates a dialogue row's condition against the current stage + quest flags.
  const conditionsMet = (
    stage: number,
    condition: BernardStageRow['condition'],
    flags: (key: string) => string | null,
  ): boolean => {
    if (!condition) return false;
    if (condition.stage !== stage) return false;
    const requires = condition.requires_flags;
    if (!requires) return true;
    const keys = Object.keys(requires);
    const allMatch = keys.every((k) => flags(k) === requires[k]);
    return condition.flags_equal === false ? !allMatch : allMatch;
  };

  // Maps action keys from the database to the existing handlers in this file.
  const bernardActions: Record<string, () => void> = {
    advance_to_1: () => { advanceBernardStage(1); },
    grant_credits_30_advance_2: () => {
      if (!user) return;
      const next = credits + 30;
      setCredits(next);
      updateUser(user.id, { credits: next });
      advanceBernardStage(2);
    },
    grant_wanderer_title: async () => {
      if (!user) return;
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
    accept_alexandra_quest: () => { acceptAlexandraQuest(); },
  };

  const getBernardDialogue = (flagOverride?: (k: string) => string | null): BernardDialogueData => {
    if (typeof window === 'undefined' || !user) {
      return { text: '', buttonLabel: null };
    }
    const f = flagOverride ?? getFlag;
    const stage = parseInt(f('bernard_stage') || '0', 10);
    const match =
      bernardStages.find((row) => conditionsMet(stage, row.condition, f)) ??
      bernardStages.find((row) => row.stage_key === 'stage_6_followup');
    if (!match) return { text: '', buttonLabel: null };
    return {
      text: match.text,
      buttonLabel: match.button_label,
      buttonAction: match.button_action_key ? bernardActions[match.button_action_key] : undefined,
      onShow: match.on_show_action_key ? bernardActions[match.on_show_action_key] : undefined,
    };
  };

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
    setBernardOpen(true);
  };


  // Listen for global "open paywall" event (dispatched from ProfileOverlay etc.)
  useEffect(() => {
    const handler = async () => {
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
    console.log('[Village] playerId from auth:', user.id);
    const row = await fetchOrCreateUser(user.id);
    console.log('[Village] user row:', row);
    setCurrentLevel(row.level);
    setCurrentTitle(row.title);
    setOverlaySelectedTitle(row.title);
    setRegistrationNumber(row.registration_number);
    setAuraColor(row.aura_color || '#5b4fd4');
    setUsername(row.username || '');
    usernameRef.current = row.username || '';
    setUnlockedTitles(row.unlocked_titles && row.unlocked_titles.length ? row.unlocked_titles : []);
    setStepsRemaining(row.steps_remaining);
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

    const loadVillage = async () => {
      setVillageLoading(true);
      try {
        const { data: villageRow } = await supabase
          .from('special_locations' as never)
          .select('data')
          .eq('level_number', currentLevel)
          .eq('location_key', 'village')
          .maybeSingle();

        if (cancelled || !villageRow) {
          if (!cancelled) setVillageLoading(false);
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
          if (!cancelled) setVillageLoading(false);
          return;
        }

        const CELL = 20;
        const typeA: typeof TYPE_A = [];
        const typeB: Rect[] = [];
        const typeC: Rect[] = [];
        const sCells: { col: number; row: number }[] = [];
        const mCells: { col: number; row: number }[] = [];
        const lCells: { col: number; row: number }[] = [];
        const forest: ForestBlock[] = [];
        const groundTiles: GroundTile[] = [];
        const wallTiles: Rect[] = [];
        const furnitureTiles: Rect[] = [];
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

          setDynamicBuildings({ typeA, typeB, typeC, clusters, forest, groundTiles, wallTiles, furnitureTiles, npcs, eyeCenter, bernardCenter, merchantCenter, gridSize, start });


          // Reposition the player once, when the dynamic village loads
          if (!dynSpawnDoneRef.current) {
            dynSpawnDoneRef.current = true;
            const dynW = gridSize * CELL;
            const dynH = gridSize * CELL;
            const sp = start
              ? { x: start.col * CELL, y: start.row * CELL }
              : { x: dynW / 2, y: dynH / 2 };
            playerRef.current = sp;
            playerTargetRef.current = sp;
            setPlayer(sp);
          }
          setVillageLoading(false);
        }

      } catch (e) {
        if (!cancelled) setVillageLoading(false);
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



  const triggerA = (nx: number, ny: number, a: { id: number | string }) => {
    if (a.id === 89) {
      if (user) void setFlag(user.id, 'touched_89', 'true');
      const unlocked = parseInt(getFlag('bernard_stage') || '0', 10) >= 2;
      if (!unlocked) {
        showLockWhisper('Not yet. Speak to Bernard first.');
        return true;
      }
      if (!navigatedRef.current) {
        navigatedRef.current = true;
        const status = subscriptionStatusRef.current;
        const target = status && canAccessMaze(status) ? '/door' : '/paywall';
        window.setTimeout(() => navigate(target), 600);
      }
      return true;
    }
    if (a.id === 23) {
      if (user) void setFlag(user.id, 'touched_23', 'true');
      const lv = currentLevelRef.current;
      // TEMP: lowered for testing, revert to lv < 3 before release
      if (lv < 1) {
        showLockWhisper('The Library opens later.');
        return true;
      }
      if (!navigatedRef.current) {
        navigatedRef.current = true;
        window.setTimeout(() => navigate('/library-door'), 600);
      }
      return true;
    }
    if (a.id === 47) {
      if (user) void setFlag(user.id, 'touched_47', 'true');
      const lv = currentLevelRef.current;
      if (lv < 3) {
        showLockWhisper('The Exchange opens later.');
        return true;
      }
      if (!navigatedRef.current) {
        navigatedRef.current = true;
        window.setTimeout(() => navigate('/exchange-door'), 600);
      }
      return true;
    }
    return false;
  };


  const activeObstacles = useMemo<Rect[]>(
    () =>
      dynamicBuildings
        ? [
            ...dynamicBuildings.clusters.map((c) => ({ id: c.id, x: c.x, y: c.y, w: c.w, h: c.h })),
            ...dynamicBuildings.typeB,
            ...dynamicBuildings.typeC,
            ...(dynamicBuildings.wallTiles ?? []),
            ...(dynamicBuildings.furnitureTiles ?? []),
          ]
        : OBSTACLES,
    [dynamicBuildings],
  );

  const move = (dx: number, dy: number) => {
    if (villageLoadingRef.current) return;
    const prev = playerTargetRef.current;


    const nx = Math.max(0, Math.min(mapSizeRef.current.w, prev.x + dx));
    const ny = Math.max(0, Math.min(mapSizeRef.current.h, prev.y + dy));


    // Type A: bumping fires response but cancels move
    for (const a of (dynamicBuildings ? dynamicBuildings.typeA : TYPE_A)) {
      if (inside(nx, ny, a)) {
        triggerA(nx, ny, a);
        return;
      }
    }

    // Obstacles (B + C + RIM) with 2px padding — also check whisper trigger on any whispered building
    for (const o of activeObstacles) {
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
    const merchX = dynamicBuildings ? (dynamicBuildings.merchantCenter ? dynamicBuildings.merchantCenter.x : mapSizeRef.current.w / 2) : MERCHANT.x;
    const merchY = dynamicBuildings ? (dynamicBuildings.merchantCenter ? dynamicBuildings.merchantCenter.y : mapSizeRef.current.h / 2) : MERCHANT.y;
    const dm = Math.hypot(fx - merchX, fy - merchY);
    if (dm <= 40) {
      if (!merchantTriggerLockRef.current) {
        merchantTriggerLockRef.current = true;
        setMerchantOpen(true);
      }
    } else {
      merchantTriggerLockRef.current = false;
    }

    // Bernard proximity → open dialogue (40px)
    const bernX = dynamicBuildings ? (dynamicBuildings.bernardCenter ? dynamicBuildings.bernardCenter.x : mapSizeRef.current.w / 2) : BERNARD_VILLAGE.x;
    const bernY = dynamicBuildings ? (dynamicBuildings.bernardCenter ? dynamicBuildings.bernardCenter.y : mapSizeRef.current.h / 2) : BERNARD_VILLAGE.y;
    const db = Math.hypot(fx - bernX, fy - bernY);
    if (db <= 40) {
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
      // Held-keys movement — process every 2 frames (~30Hz) for responsive feel
      keyFrameCounter++;
      if (keyFrameCounter >= 2) {
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
        const nx = cur.x + dx * 0.18;
        const ny = cur.y + dy * 0.18;
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
      npcs: dynamicBuildings.npcs.filter((n) => inBox(n.x, n.y, 6, 6)),
      typeA: dynamicBuildings.typeA.filter((b) => inBox(b.x, b.y, b.w, b.h)),
    };
  }, [dynamicBuildings, cullQx, cullQy, view.w, view.h]);

  // ===== TEMPORARY DEV PERF READOUT — remove once culling perf is confirmed =====
  const perfEnabled =
    registrationNumber === 1 ||
    new URLSearchParams(window.location.search).get('dev') === '1';
  const [perfStats, setPerfStats] = useState({ fps: 0, vis: 0, total: 0 });
  const perfCountsRef = useRef({ vis: 0, total: 0 });
  perfCountsRef.current = {
    vis: visible
      ? visible.forest.length + visible.groundTiles.length + visible.clusters.length +
        visible.npcs.length + visible.typeA.length
      : 0,
    total: dynamicBuildings
      ? dynamicBuildings.forest.length + dynamicBuildings.groundTiles.length +
        dynamicBuildings.clusters.length + dynamicBuildings.npcs.length +
        dynamicBuildings.typeA.length
      : 0,
  };
  useEffect(() => {
    if (!perfEnabled) return;
    let raf = 0;
    let frames = 0;
    let last = performance.now();
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1000) {
        setPerfStats({
          fps: Math.round((frames * 1000) / (now - last)),
          vis: perfCountsRef.current.vis,
          total: perfCountsRef.current.total,
        });
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [perfEnabled]);
  // ===== END TEMPORARY DEV PERF READOUT =====


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

  const dpadBtn: React.CSSProperties = {
    width: 44,
    height: 44,
    background: 'rgba(91,79,212,0.15)',
    border: '0.5px solid rgba(91,79,212,0.4)',
    borderRadius: 4,
    color: 'rgba(160,140,200,0.8)',
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

  // Per-Type-A depth styling: rgb tuple + darker shade tuple
  const TYPE_A_DEPTH: Record<number, { rgb: [number, number, number]; dark: [number, number, number] }> = {
    23: { rgb: [74, 158, 255], dark: [30, 60, 120] },
    47: { rgb: [29, 158, 117], dark: [10, 60, 45] },
    89: { rgb: [200, 150, 58], dark: [90, 60, 20] },
  };

  const renderTypeA = (b: typeof A_23 | typeof A_47 | typeof A_89, pulsing: boolean) => {
    const d = TYPE_A_DEPTH[b.id];
    const [r, g, bl] = d.rgb;
    const [dr, dg, db] = d.dark;
    return (
      <div
        key={`a-${b.id}`}
        style={{
          position: 'absolute',
          left: b.x,
          top: b.y,
          width: b.w,
          height: b.h,
          background: `linear-gradient(135deg, rgba(${r},${g},${bl},0.22) 0%, rgba(${r},${g},${bl},0.14) 60%, rgba(${dr},${dg},${db},0.25) 100%)`,
          borderTop: `1px solid rgba(${r},${g},${bl},0.55)`,
          borderLeft: `1px solid rgba(${r},${g},${bl},0.45)`,
          borderBottom: '0.5px solid rgba(20,10,50,0.9)',
          borderRight: '0.5px solid rgba(30,15,70,0.8)',
          boxShadow: `inset -3px -3px 8px rgba(0,0,0,0.35), inset 1px 1px 4px rgba(${r},${g},${bl},0.08)`,
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
              fontSize: 14,
              color: 'rgba(160,140,200,0.5)',
              marginTop: 4,
              animation: 'villageNotYet 1.5s ease-out forwards',
            }}
          >
            Not yet.
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
        @keyframes playerPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.6; } }
        @keyframes villageNotYet { 0% { opacity:.6 } 80% { opacity:.6 } 100% { opacity:0 } }
        @keyframes merchantSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
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
              width: MAP_W,
              height: MAP_H,
              transform: `translate(${cameraRef.current.x}px, ${cameraRef.current.y}px)`,
              willChange: 'transform',
            }}
          >


        {/* Grid overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(100,80,160,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(100,80,160,0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Outermost ring outline (hardcoded village only) */}
        {!dynamicBuildings && (
          <div
            style={{
              position: 'absolute',
              left: CX - OUTERMOST_RX,
              top: CY - OUTERMOST_RY,
              width: OUTERMOST_RX * 2,
              height: OUTERMOST_RY * 2,
              border: '0.5px solid rgba(100,80,160,0.05)',
              borderRadius: '50%',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        )}

        {/* Outer ring outline */}
        <div
          style={{
            position: 'absolute',
            left: CX - OUTER_RX,
            top: CY - OUTER_RY,
            width: OUTER_RX * 2,
            height: OUTER_RY * 2,
            border: '0.5px solid rgba(100,80,160,0.06)',
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
            border: '0.5px solid rgba(100,80,160,0.08)',
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
            border: '0.5px solid rgba(100,80,160,0.10)',
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Decorative ground tiles (paths, roads, squares, landmarks) — non-blocking */}
        {visible?.groundTiles.map((g) => {
          const paved = g.kind === 'PATH' || g.kind === 'ROAD';
          return (
            <div
              key={`gt-${g.x}-${g.y}`}
              style={{
                position: 'absolute',
                left: g.x,
                top: g.y,
                width: 20,
                height: 20,
                background: paved ? undefined : GROUND_TILE_COLORS[g.kind],
                pointerEvents: 'none',
                zIndex: 2,
              }}
            >
              {paved && <PavingCell col={Math.round(g.x / 20)} row={Math.round(g.y / 20)} />}
            </div>
          );
        })}

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

        {/* Forest blocks (outside outermost ring) */}

        {(visible ? visible.forest : FOREST).map((f) => (
          <ForestTreeCell key={`f-${f.x}-${f.y}`} x={f.x} y={f.y} w={f.w} h={f.h} />
        ))}

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
        <CharacterEye
          cx={dynamicBuildings ? (dynamicBuildings.eyeCenter ? dynamicBuildings.eyeCenter.x : mapW / 2) : CX}
          cy={dynamicBuildings ? (dynamicBuildings.eyeCenter ? dynamicBuildings.eyeCenter.y : mapH / 2) : CY}

          color="#5b4fd4"
          size="small"
          playerPosition={player}
          zIndex={1}
        />

        {/* Outermost rim buildings (hardcoded village only) */}
        {!dynamicBuildings &&
          TYPE_RIM.map((b) => (
            <div
              key={`rim-${b.id}`}
              style={{
                position: 'absolute',
                left: b.x,
                top: b.y,
                width: b.w,
                height: b.h,
                border: '0.5px solid rgba(100,80,160,0.25)',
                background: 'rgba(100,80,160,0.07)',
                zIndex: 1,
              }}
            />
          ))}

        {/* Clustered dynamic buildings (grouped by type, one image per cluster) */}
        {visible?.clusters.map((c) => (
          <ClusterBuilding key={c.id} cluster={c} />
        ))}

        {/* Type C buildings (hardcoded village only) */}
        {!dynamicBuildings && TYPE_C.map((b) => (
          <div
            key={`c-${b.id}`}
            style={{
              position: 'absolute',
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              background: 'linear-gradient(135deg, rgba(130,110,200,0.132) 0%, rgba(100,80,160,0.084) 60%, rgba(50,30,90,0.15) 100%)',
              borderTop: '1px solid rgba(140,120,220,0.33)',
              borderLeft: '1px solid rgba(130,110,200,0.27)',
              borderBottom: '0.5px solid rgba(20,10,50,0.54)',
              borderRight: '0.5px solid rgba(30,15,70,0.48)',
              boxShadow: 'inset -3px -3px 8px rgba(0,0,0,0.21), inset 1px 1px 4px rgba(140,120,220,0.048)',
              zIndex: 1,
            }}
          />
        ))}

        {/* Type B buildings (hardcoded village only) */}
        {!dynamicBuildings && TYPE_B.map((b) => (
          <div
            key={`b-${b.id}`}
            style={{
              position: 'absolute',
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              background: 'linear-gradient(135deg, rgba(130,110,200,0.22) 0%, rgba(100,80,160,0.14) 60%, rgba(50,30,90,0.25) 100%)',
              borderTop: '1px solid rgba(140,120,220,0.55)',
              borderLeft: '1px solid rgba(130,110,200,0.45)',
              borderBottom: '0.5px solid rgba(20,10,50,0.9)',
              borderRight: '0.5px solid rgba(30,15,70,0.8)',
              boxShadow: 'inset -3px -3px 8px rgba(0,0,0,0.35), inset 1px 1px 4px rgba(140,120,220,0.08)',
              zIndex: 2,
            }}
          />
        ))}

        {/* Type A — doors: pulsating gold markers in dynamic villages, boxes in hardcoded */}
        {visible
          ? visible.typeA.map((b) => (
              <div
                key={`door-${b.id}-${b.x}-${b.y}`}
                style={{
                  position: 'absolute',
                  left: b.x,
                  top: b.y,
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(244,197,66,0.22)',
                  border: '1px solid rgba(244,197,66,0.85)',
                  boxShadow: '0 0 10px rgba(244,197,66,0.55)',
                  animation: 'villagePulse 1.8s ease-in-out infinite',
                  pointerEvents: 'none',
                  zIndex: 6,
                }}
              >
                <span className="font-mono" style={{ fontSize: 9, color: '#f4c542' }}>
                  {b.id}
                </span>
                {(b.id === 23 || b.id === 47) && feedback.id === b.id && (
                  <p
                    className="font-fell italic"
                    style={{
                      position: 'absolute',
                      top: 22,
                      fontSize: 14,
                      color: 'rgba(160,140,200,0.5)',
                      whiteSpace: 'nowrap',
                      animation: 'villageNotYet 1.5s ease-out forwards',
                    }}
                  >
                    Not yet.
                  </p>
                )}
              </div>
            ))
          : (
            <>
              {renderTypeA(A_23, false)}
              {renderTypeA(A_47, false)}
              {renderTypeA(A_89, true)}
            </>

          )}

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
        <MerchantCharacter x={MERCHANT.x} y={MERCHANT.y} palette="green" />

        {/* Bernard — gold dot in town square with bell-ring pulse */}
        <div
          style={{
            position: 'absolute',
            left: BERNARD_VILLAGE.x - 6,
            top: BERNARD_VILLAGE.y - 6,
            width: 12, height: 12, borderRadius: '50%',
            background: '#c8963a',
            boxShadow: '0 0 12px rgba(200,150,58,0.7)',
            zIndex: 4,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: BERNARD_VILLAGE.x - 6,
            top: BERNARD_VILLAGE.y - 6,
            width: 12, height: 12, borderRadius: '50%',
            border: '1px solid rgba(200,150,58,0.6)',
            animation: 'bernardBellRing 8s ease-out infinite',
            pointerEvents: 'none',
            zIndex: 4,
          }}
        />
        <span
          className="font-mono"
          style={{
            position: 'absolute',
            left: BERNARD_VILLAGE.x - 4,
            top: BERNARD_VILLAGE.y - 24,
            fontSize: 14,
            color: 'rgba(200,150,58,0.6)',
            pointerEvents: 'none',
            zIndex: 4,
          }}
        >
          B
        </span>


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
            boxShadow: `0 0 8px ${auraColor}`,
            animation: 'playerPulse 1.6s ease-in-out infinite',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
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
    )}



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
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polygon points="12,7 2,1 2,13" fill="rgba(160,140,200,0.8)"/></svg>
        </div>
        <div />
        <div
          role="button"
          aria-label="Down"
          style={dpadBtn}
          {...dpadHandlers(0, 1)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polygon points="7,12 13,2 1,2" fill="rgba(160,140,200,0.8)"/></svg>
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
          borderTop: '0.5px solid rgba(169,140,255,0.3)',
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 12,
        }}
      >
        <span className="font-mono" style={{ fontSize: 15, letterSpacing: '0.18em', color: '#e0ddd5' }}>
          STEPS&nbsp;&nbsp;{String(stepsRemaining).padStart(2, '0')}
        </span>
        <span className="font-mono" style={{ fontSize: 15, letterSpacing: '0.18em', color: '#c8963a' }}>
          CREDITS&nbsp;&nbsp;{String(credits).padStart(2, '0')}
        </span>
        <span className="font-mono" style={{ fontSize: 15, letterSpacing: '0.18em', color: '#5b4fd4' }}>
          LEVEL&nbsp;&nbsp;{String(currentLevel).padStart(2, '0')}
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

      {/* TEMPORARY dev perf readout — strip this block once culling perf is confirmed */}
      {perfEnabled && (
        <div
          className="font-mono"
          style={{
            position: 'fixed',
            top: 40,
            right: 14,
            zIndex: 400,
            fontSize: 11,
            lineHeight: 1.5,
            textAlign: 'right',
            color: 'rgba(200,148,58,0.85)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div>FPS {perfStats.fps}</div>
          <div>VIS {perfStats.vis}</div>
          <div>TOT {perfStats.total}</div>
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
            }}
          >
            <div style={{ opacity: 0.7, marginBottom: 6 }}>DEV MENU</div>
            <button type="button" onClick={handleDevReset} style={{ background: 'transparent', border: '1px solid #a98cff', color: '#a98cff', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>Reset profile</button>
            <button type="button" onClick={async () => {
              Object.keys(localStorage).filter(k => k.startsWith('praem_')).forEach(k => localStorage.removeItem(k));
              localStorage.removeItem('praem_aura_color');
              sessionStorage.clear();
              if (user) {
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
            <button type="button" onClick={() => { setDevOverlay(false); navigate('/maze'); }} style={{ background: 'transparent', border: '1px solid #a98cff', color: '#a98cff', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>Skip to Maze</button>
            <button type="button" onClick={() => { setDevOverlay(false); navigate('/door'); }} style={{ background: 'transparent', border: '1px solid #a98cff', color: '#a98cff', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>Skip to Door</button>

            <div style={{ height: 1, background: 'rgba(160,140,200,0.15)', margin: '6px 0' }} />
            <div style={{ opacity: 0.7, fontSize: 11 }}>SUBSCRIPTION OVERRIDES</div>
            <button type="button" onClick={() => { sessionStorage.setItem('dev_sub_override', 'active'); setDevOverlay(false); }} style={{ background: 'transparent', border: '1px solid #a98cff', color: '#a98cff', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>SET SUB: ACTIVE</button>
            <button type="button" onClick={() => { sessionStorage.setItem('dev_sub_override', 'expired'); setDevOverlay(false); }} style={{ background: 'transparent', border: '1px solid #a98cff', color: '#a98cff', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>SET SUB: EXPIRED</button>
            <button type="button" onClick={() => { sessionStorage.removeItem('dev_sub_override'); setDevOverlay(false); }} style={{ background: 'transparent', border: '1px solid #a98cff', color: '#a98cff', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>CLEAR OVERRIDE</button>

            <div style={{ height: 1, background: 'rgba(160,140,200,0.15)', margin: '6px 0' }} />
            <div style={{ opacity: 0.7, fontSize: 11 }}>NAVIGATION</div>
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
              if (user) {
                await restUpdate(
                  'users',
                  {
                    title: overlaySelectedTitle,
                    levelup_pending: false,
                    levelup_newlevel: 0,
                    level: newLv,
                  },
                  'id',
                  user.id,
                );
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

      {/* Bernard bell-ring keyframe */}
      <style>{`
        @keyframes bernardBellRing {
          0% { transform: scale(1); opacity: 1; }
          80% { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>

      {/* Bernard dialogue overlay */}
      {bernardOpen && (() => {
        const d = getBernardDialogue();
        return (
          <BernardDialogue text={d.text} onShow={d.onShow}>
            {d.buttonLabel && (
              <button
                type="button"
                className="font-cinzel"
                onClick={() => {
                  d.buttonAction?.();
                  setBernardOpen(false);
                }}
                style={{
                  background: 'rgba(200,150,58,0.18)',
                  border: '0.5px solid rgba(200,150,58,0.5)',
                  color: '#c8963a',
                  padding: '8px 18px',
                  fontSize: 16,
                  letterSpacing: '0.3em',
                  cursor: 'pointer',
                }}
              >
                {d.buttonLabel.toUpperCase()}
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
                fontSize: 16,
                letterSpacing: '0.3em',
                cursor: 'pointer',
              }}
            >
              CLOSE
            </button>
          </BernardDialogue>
        );
      })()}

      <ProfileOverlay isOpen={profileOpenDisplay} onClose={closeProfile} context="village" />

      {paywallOpen && (
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
