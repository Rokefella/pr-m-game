import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Rect = { id: string | number; x: number; y: number; w: number; h: number };

const MAP_W = 2200;
const MAP_H = 1400;
const CX = 1100;
const CY = 700;
const STEP = 12;

const OUTERMOST_RX = 900, OUTERMOST_RY = 500;
const OUTER_RX = 600, OUTER_RY = 340;
const MIDDLE_RX = 380, MIDDLE_RY = 220;
const INNER_RX = 200, INNER_RY = 120;

// ---------- Type A: interactive (green palette + orange RETURN) ----------
const A_INF = { id: 'inf' as const, x: 720, y: 675, w: 70, h: 50, color: '#22c55e', bg: 'rgba(34,197,94,0.06)', label: '∞' };
const A_ZERO = { id: 'zero' as const, x: 1430, y: 675, w: 70, h: 50, color: '#16a34a', bg: 'rgba(22,163,74,0.06)', label: '0' };
const A_RETURN = { id: 'return' as const, x: 1560, y: 770, w: 80, h: 60, color: '#f97316', bg: 'rgba(249,115,22,0.08)', label: 'RETURN' };
const TYPE_A = [A_INF, A_ZERO, A_RETURN];

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

// Seeded LCG
const makeRng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
};

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

      if (x < 6 || y < 6 || x + w > MAP_W - 6 || y + h > MAP_H - 6) continue;

      const px = x + w / 2 - CX;
      const py = y + h / 2 - CY;
      if ((px * px) / (INNER_RX * INNER_RX) + (py * py) / (INNER_RY * INNER_RY) < 1) continue;

      let bad = false;
      for (const a of TYPE_A) {
        if (rectsOverlap(cand, a, padA)) { bad = true; break; }
      }
      if (bad) continue;

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

  let bIdx = 0;
  for (let a = 0; a < 360; a += 10) {
    placeOnEllipse(MIDDLE_RX, MIDDLE_RY, a, 6, 35, 55, 25, 45, B, [B], B_GAP, A_PADDING, 'b', bIdx++);
  }
  const innerB_RX = INNER_RX + 60;
  const innerB_RY = INNER_RY + 50;
  for (let i = 0; i < 14; i++) {
    const a = (i * 360) / 14;
    placeOnEllipse(innerB_RX, innerB_RY, a, 8, 35, 50, 25, 40, B, [B], B_GAP, A_PADDING, 'b', bIdx++);
  }

  let cIdx = 0;
  for (let a = 0; a < 360; a += 2) {
    placeOnEllipse(OUTER_RX, OUTER_RY, a, 3, 22, 36, 18, 28, C, [C, B], 4, C_VS_AB_PAD, 'c', cIdx++);
  }
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
  const midInRX = (MIDDLE_RX + INNER_RX) / 2 + 20;
  const midInRY = (MIDDLE_RY + INNER_RY) / 2 + 20;
  for (let i = 0; i < 18; i++) {
    const a = (i * 360) / 18 + 8;
    placeOnEllipse(midInRX, midInRY, a, 8, 20, 32, 14, 24, C, [C, B], C_GAP, C_VS_AB_PAD, 'c', cIdx++);
  }

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

// ---------- Forest blocks (green, denser, more oppressive) ----------
type ForestBlock = { x: number; y: number; w: number; h: number };
const generateForest = (): ForestBlock[] => {
  const rng = makeRng(0xF0FE57);
  const blocks: ForestBlock[] = [];
  const placed: ForestBlock[] = [];

  const targetCount = 360;
  let attempts = 0;
  while (blocks.length < targetCount && attempts < 7000) {
    attempts++;
    const ccx = rng() * (MAP_W - 40) + 20;
    const ccy = rng() * (MAP_H - 40) + 20;

    const nx = (ccx - CX) / OUTERMOST_RX;
    const ny = (ccy - CY) / OUTERMOST_RY;
    if (nx * nx + ny * ny < 1.05) continue;

    const clusterSize = 4 + Math.floor(rng() * 5);
    for (let i = 0; i < clusterSize && blocks.length < targetCount; i++) {
      const offX = (rng() * 2 - 1) * 26;
      const offY = (rng() * 2 - 1) * 26;
      const x = Math.round(ccx + offX);
      const y = Math.round(ccy + offY);
      const w = 12 + Math.floor(rng() * 11);
      const h = 12 + Math.floor(rng() * 7);

      if (x < 4 || y < 4 || x + w > MAP_W - 4 || y + h > MAP_H - 4) continue;

      const cx = x + w / 2, cy = y + h / 2;
      const enx = (cx - CX) / OUTERMOST_RX;
      const eny = (cy - CY) / OUTERMOST_RY;
      if (enx * enx + eny * eny < 1.02) continue;

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

// Atmosphere text fragments
const ATMOS_TEXTS: { x: number; y: number; t: string }[] = [
  { x: 200, y: 200, t: 'you earned this' },
  { x: 1900, y: 300, t: 'she was here too' },
  { x: 150, y: 900, t: 'the mathematics converge' },
  { x: 2000, y: 800, t: 'junction 89' },
  { x: 400, y: 1200, t: 'not all who find this return' },
  { x: 1700, y: 1100, t: 'the spiral continues' },
  { x: 1100, y: 150, t: '∅' },
  { x: 1100, y: 1320, t: 'you are inside it now' },
];

// Building whispers — 5 Type B by index
const B_WHISPERS: Record<number, string> = {
  3: 'Your fragments are known to me.',
  11: 'The village was always a door.',
  19: 'Others have stood where you stand.',
  27: 'The spiral has no end.',
  38: 'You will come back. They always do.',
};

// 23rd Gate position
const GATE_23 = { x: 1100, y: 200 };

// Spawn — somewhere safe inside outermost
const computeSpawn = (): { x: number; y: number } => {
  for (let i = 0; i < 100; i++) {
    const theta = Math.random() * Math.PI * 2;
    const t = 0.55 + Math.random() * 0.3;
    let x = CX + OUTERMOST_RX * t * Math.cos(theta);
    let y = CY + OUTERMOST_RY * t * Math.sin(theta);
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
  const navigatedRef = useRef(false);
  const whisperTimer = useRef<number | null>(null);
  const lastWhisperBIdxRef = useRef<number | null>(null);

  const initialPosRef = useRef<{ x: number; y: number } | null>(null);
  if (initialPosRef.current === null) initialPosRef.current = computeSpawn();
  const initialPos = initialPosRef.current;

  const [player, setPlayer] = useState(initialPos);
  const playerRef = useRef(initialPos);
  const lastMoveTimeRef = useRef<number>(performance.now());
  const velocityRef = useRef({ x: 0, y: 0 });

  const [view, setView] = useState({ w: 390, h: 800 });
  useEffect(() => {
    const update = () => setView({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Camera lerp
  const cameraRef = useRef({ x: 0, y: 0 });
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const cameraInitedRef = useRef(false);

  // Eye pupil
  const eyePupilRef = useRef({ x: 0, y: 0 });
  const [eyePupil, setEyePupil] = useState({ x: 0, y: 0 });

  // Whisper
  const [whisper, setWhisper] = useState<string | null>(null);
  const showWhisper = (msg: string, ms = 3000) => {
    setWhisper(msg);
    if (whisperTimer.current) window.clearTimeout(whisperTimer.current);
    whisperTimer.current = window.setTimeout(() => setWhisper(null), ms);
  };

  // 30s "You came" trigger
  const youCameTriggeredRef = useRef(false);
  const mountTimeRef = useRef(performance.now());

  // 23rd gate proximity
  const gateWhisperRef = useRef(false);

  // Entry sequence states
  const [showGrid, setShowGrid] = useState(false);
  const [showBuildings, setShowBuildings] = useState(false);
  const [showEye, setShowEye] = useState(false);
  useEffect(() => {
    const t1 = window.setTimeout(() => setShowGrid(true), 600);
    const t2 = window.setTimeout(() => setShowBuildings(true), 1600);
    const t3 = window.setTimeout(() => setShowEye(true), 2400);
    const t4 = window.setTimeout(() => showWhisper('You found the other side.', 4000), 3400);
    return () => {
      [t1, t2, t3, t4].forEach((t) => window.clearTimeout(t));
      if (whisperTimer.current) window.clearTimeout(whisperTimer.current);
    };
  }, []);

  const triggerA = (nx: number, ny: number) => {
    if (inside(nx, ny, A_RETURN)) {
      if (!navigatedRef.current) {
        navigatedRef.current = true;
        showWhisper('The village remembers you.', 1000);
        window.setTimeout(() => navigate('/village'), 800);
      }
      return true;
    }
    if (inside(nx, ny, A_INF)) {
      showWhisper('∞', 1500);
      return true;
    }
    if (inside(nx, ny, A_ZERO)) {
      showWhisper('0', 1500);
      return true;
    }
    return false;
  };

  const isOpenOn23rd = new Date().getDate() === 23;

  const move = (dx: number, dy: number) => {
    const prev = playerRef.current;
    const nx = Math.max(0, Math.min(MAP_W, prev.x + dx));
    const ny = Math.max(0, Math.min(MAP_H, prev.y + dy));

    for (const a of TYPE_A) {
      if (inside(nx, ny, a)) {
        triggerA(nx, ny);
        return;
      }
    }

    for (let i = 0; i < OBSTACLES.length; i++) {
      const o = OBSTACLES[i];
      if (
        nx >= o.x - 2 &&
        nx <= o.x + o.w + 2 &&
        ny >= o.y - 2 &&
        ny <= o.y + o.h + 2
      ) {
        // Only Type B has whispers; B occupies first TYPE_B.length entries of OBSTACLES
        if (i < TYPE_B.length) {
          const msg = B_WHISPERS[i];
          if (msg && lastWhisperBIdxRef.current !== i) {
            lastWhisperBIdxRef.current = i;
            showWhisper(msg, 3000);
            window.setTimeout(() => {
              if (lastWhisperBIdxRef.current === i) lastWhisperBIdxRef.current = null;
            }, 3500);
          }
        }
        return;
      }
    }

    // Hard ellipse boundary
    const BX = OUTERMOST_RX + 20;
    const BY = OUTERMOST_RY + 20;
    const ex = (nx - CX) / BX;
    const ey = (ny - CY) / BY;
    if (ex * ex + ey * ey > 1) return;

    // 23rd gate proximity check
    const dxg = nx - GATE_23.x;
    const dyg = ny - GATE_23.y;
    if (Math.hypot(dxg, dyg) < 60) {
      if (isOpenOn23rd && Math.hypot(dxg, dyg) < 30) {
        showWhisper('The entity gathers. Not yet built.', 3000);
      } else if (!gateWhisperRef.current) {
        gateWhisperRef.current = true;
        showWhisper('Come back on the 23rd.', 3000);
      }
    }

    velocityRef.current = { x: nx - prev.x, y: ny - prev.y };
    lastMoveTimeRef.current = performance.now();
    playerRef.current = { x: nx, y: ny };
    setPlayer({ x: nx, y: ny });
  };

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': e.preventDefault(); move(0, -STEP); break;
        case 'ArrowDown': e.preventDefault(); move(0, STEP); break;
        case 'ArrowLeft': e.preventDefault(); move(-STEP, 0); break;
        case 'ArrowRight': e.preventDefault(); move(STEP, 0); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Camera + eye pupil rAF loop
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      // Camera lerp
      const targetX = Math.max(view.w - MAP_W, Math.min(0, view.w / 2 - playerRef.current.x));
      const targetY = Math.max(view.h - MAP_H, Math.min(0, view.h / 2 - playerRef.current.y));
      if (!cameraInitedRef.current) {
        cameraRef.current = { x: targetX, y: targetY };
        cameraInitedRef.current = true;
      } else {
        cameraRef.current.x += (targetX - cameraRef.current.x) * 0.12;
        cameraRef.current.y += (targetY - cameraRef.current.y) * 0.12;
      }
      setCamera({ x: cameraRef.current.x, y: cameraRef.current.y });

      // Eye pupil tracking
      const now = performance.now();
      const idle = now - lastMoveTimeRef.current > 3000;
      let tx = 0, ty = 0;
      if (idle) {
        const t = (now / 1000) * (Math.PI * 2 / 8);
        tx = Math.cos(t) * 6;
        ty = Math.sin(t) * 6;
      } else {
        const v = velocityRef.current;
        const mag = Math.hypot(v.x, v.y);
        if (mag > 0.01) {
          tx = (v.x / mag) * 40;
          ty = (v.y / mag) * 40;
        }
        // decay velocity
        velocityRef.current = { x: v.x * 0.9, y: v.y * 0.9 };
      }
      eyePupilRef.current.x += (tx - eyePupilRef.current.x) * 0.03;
      eyePupilRef.current.y += (ty - eyePupilRef.current.y) * 0.03;
      setEyePupil({ x: eyePupilRef.current.x, y: eyePupilRef.current.y });

      // 30s entity whisper
      if (!youCameTriggeredRef.current && now - mountTimeRef.current > 30000) {
        youCameTriggeredRef.current = true;
        showWhisper('You came.', 3000);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [view]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#04040a', overflow: 'hidden' }}>
      {/* Map layer */}
      <div
        style={{
          position: 'absolute',
          width: MAP_W,
          height: MAP_H,
          transform: `translate(${camera.x}px, ${camera.y}px)`,
        }}
      >
        {/* Grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(20,80,40,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(20,80,40,0.12) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            opacity: showGrid ? 1 : 0,
            transition: 'opacity 1000ms ease-out',
            pointerEvents: 'none',
          }}
        />

        {/* Ring outlines */}
        <div style={{ position: 'absolute', left: CX - OUTER_RX, top: CY - OUTER_RY, width: OUTER_RX * 2, height: OUTER_RY * 2, borderRadius: '50%', border: '0.5px solid rgba(34,197,94,0.06)', opacity: showBuildings ? 1 : 0, transition: 'opacity 800ms', zIndex: 1 }} />
        <div style={{ position: 'absolute', left: CX - MIDDLE_RX, top: CY - MIDDLE_RY, width: MIDDLE_RX * 2, height: MIDDLE_RY * 2, borderRadius: '50%', border: '0.5px solid rgba(34,197,94,0.08)', opacity: showBuildings ? 1 : 0, transition: 'opacity 800ms', zIndex: 1 }} />
        <div style={{ position: 'absolute', left: CX - INNER_RX, top: CY - INNER_RY, width: INNER_RX * 2, height: INNER_RY * 2, borderRadius: '50%', border: '0.5px solid rgba(34,197,94,0.10)', opacity: showBuildings ? 1 : 0, transition: 'opacity 800ms', zIndex: 1 }} />

        {/* Buildings group */}
        <div style={{ position: 'absolute', inset: 0, opacity: showBuildings ? 1 : 0, transition: 'opacity 800ms ease-out' }}>
          {/* Forest */}
          {FOREST.map((f, i) => (
            <div
              key={`f${i}`}
              style={{
                position: 'absolute',
                left: f.x,
                top: f.y,
                width: f.w,
                height: f.h,
                background: 'rgba(20,80,40,0.20)',
                border: '0.5px solid rgba(20,80,40,0.25)',
                zIndex: 1,
              }}
            />
          ))}

          {/* Atmos texts */}
          {ATMOS_TEXTS.map((a, i) => (
            <div
              key={`at${i}`}
              className="font-fell italic"
              style={{
                position: 'absolute',
                left: a.x,
                top: a.y,
                fontSize: 10,
                color: 'rgba(20,120,50,0.2)',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            >
              {a.t}
            </div>
          ))}

          {/* Type C */}
          {TYPE_C.map((c) => (
            <div
              key={String(c.id)}
              style={{
                position: 'absolute',
                left: c.x,
                top: c.y,
                width: c.w,
                height: c.h,
                border: '0.5px solid rgba(20,120,50,0.25)',
                background: 'rgba(20,120,50,0.07)',
                zIndex: 2,
              }}
            />
          ))}

          {/* Type RIM */}
          {TYPE_RIM.map((r) => (
            <div
              key={String(r.id)}
              style={{
                position: 'absolute',
                left: r.x,
                top: r.y,
                width: r.w,
                height: r.h,
                border: '1px solid rgba(20,120,50,0.45)',
                background: 'rgba(20,120,50,0.10)',
                zIndex: 2,
              }}
            />
          ))}

          {/* Type B */}
          {TYPE_B.map((b) => (
            <div
              key={String(b.id)}
              style={{
                position: 'absolute',
                left: b.x,
                top: b.y,
                width: b.w,
                height: b.h,
                border: '1px solid rgba(20,120,50,0.45)',
                background: 'rgba(20,120,50,0.10)',
                zIndex: 3,
              }}
            />
          ))}

          {/* Type A */}
          {TYPE_A.map((a) => (
            <div
              key={String(a.id)}
              style={{
                position: 'absolute',
                left: a.x,
                top: a.y,
                width: a.w,
                height: a.h,
                border: `1px solid ${a.color}`,
                background: a.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 4,
              }}
            >
              <span
                className={a.id === 'return' ? 'font-mono' : 'font-fell'}
                style={{
                  fontSize: a.id === 'return' ? 11 : 18,
                  color: a.color,
                  letterSpacing: a.id === 'return' ? '0.15em' : 0,
                }}
              >
                {a.label}
              </span>
            </div>
          ))}

          {/* 23rd Gate */}
          <div
            style={{
              position: 'absolute',
              left: GATE_23.x - 50,
              top: GATE_23.y - 30,
              width: 100,
              height: 60,
              border: '1.5px solid #22c55e',
              borderRadius: '50%',
              animation: 'shadowGatePulse 2s ease-in-out infinite',
              opacity: isOpenOn23rd ? 1 : undefined,
              boxShadow: isOpenOn23rd ? '0 0 30px rgba(34,197,94,0.7)' : undefined,
              zIndex: 4,
            }}
          />
          <div
            className="font-mono"
            style={{
              position: 'absolute',
              left: GATE_23.x - 8,
              top: GATE_23.y - 50,
              fontSize: 11,
              color: 'rgba(34,197,94,0.5)',
              zIndex: 4,
            }}
          >
            {isOpenOn23rd ? 'OPEN' : '23'}
          </div>

          {/* Player */}
          <div
            style={{
              position: 'absolute',
              left: player.x - 6,
              top: player.y - 6,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#5b4fd4',
              boxShadow: '0 0 12px rgba(91,79,212,0.8)',
              zIndex: 5,
            }}
          />
        </div>
      </div>

      {/* The Eye — fixed to screen center */}
      <div
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          opacity: showEye ? 1 : 0,
          transition: 'opacity 1000ms ease-out',
          zIndex: 30,
        }}
      >
        <div
          style={{
            width: 200,
            height: 120,
            borderRadius: '50%',
            border: '1px solid rgba(34,197,94,0.5)',
            position: 'relative',
            animation: 'shadowEyeGlow 4s ease-in-out infinite',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 36,
              height: 36,
              marginLeft: -18,
              marginTop: -18,
              borderRadius: '50%',
              background: '#16a34a',
              transform: `translate(${eyePupil.x}px, ${eyePupil.y}px)`,
            }}
          />
        </div>
      </div>

      {/* Whisper */}
      {whisper && (
        <div
          className="font-fell italic"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            top: '30%',
            textAlign: 'center',
            fontSize: 20,
            color: 'rgba(34,197,94,0.85)',
            textShadow: '0 0 12px rgba(34,197,94,0.4)',
            zIndex: 60,
            pointerEvents: 'none',
            padding: '0 24px',
          }}
        >
          {whisper}
        </div>
      )}

      {/* Top-left RETURN text */}
      <button
        className="font-cinzel"
        onClick={() => navigate('/village')}
        style={{
          position: 'fixed',
          bottom: 80,
          left: 16,
          background: 'transparent',
          border: 'none',
          color: 'rgba(249,115,22,0.4)',
          fontSize: 10,
          letterSpacing: '0.2em',
          cursor: 'pointer',
          padding: 4,
          zIndex: 70,
        }}
      >
        RETURN
      </button>

      {/* HUD */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: 56,
          background: 'rgba(4,4,10,0.92)',
          borderTop: '1px solid rgba(34,197,94,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span className="font-mono" style={{ fontSize: 8, color: 'rgba(160,140,200,0.5)', letterSpacing: '0.2em' }}>REALM</span>
          <span className="font-mono" style={{ fontSize: 12, color: 'rgba(34,197,94,0.6)', letterSpacing: '0.2em' }}>SHADOW</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span className="font-mono" style={{ fontSize: 8, color: 'rgba(160,140,200,0.5)', letterSpacing: '0.2em' }}>FRAGMENTS</span>
          <span className="font-mono" style={{ fontSize: 12, color: '#f97316', letterSpacing: '0.2em' }}>5 / 5</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span className="font-mono" style={{ fontSize: 8, color: 'rgba(160,140,200,0.5)', letterSpacing: '0.2em' }}>LEVEL</span>
          <span className="font-mono" style={{ fontSize: 12, color: 'rgba(34,197,94,0.7)', letterSpacing: '0.2em' }}>01</span>
        </div>
      </div>

      {/* D-pad */}
      <div
        style={{
          position: 'fixed',
          right: 24,
          bottom: 80,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 44px)',
          gridTemplateRows: 'repeat(3, 44px)',
          gap: 4,
          zIndex: 55,
        }}
      >
        <div />
        <button onClick={() => move(0, -STEP)} style={dpadStyle}>↑</button>
        <div />
        <button onClick={() => move(-STEP, 0)} style={dpadStyle}>←</button>
        <div />
        <button onClick={() => move(STEP, 0)} style={dpadStyle}>→</button>
        <div />
        <button onClick={() => move(0, STEP)} style={dpadStyle}>↓</button>
        <div />
      </div>

      <style>{`
        @keyframes shadowGatePulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1.0; }
        }
        @keyframes shadowEyeGlow {
          0%, 100% { box-shadow: 0 0 30px rgba(34,197,94,0.3); }
          50% { box-shadow: 0 0 60px rgba(34,197,94,0.5); }
        }
      `}</style>
    </div>
  );
};

const dpadStyle: React.CSSProperties = {
  background: 'rgba(20,120,50,0.10)',
  border: '1px solid rgba(34,197,94,0.4)',
  color: 'rgba(34,197,94,0.7)',
  fontSize: 16,
  cursor: 'pointer',
  userSelect: 'none',
};

export default ShadowRealm;
