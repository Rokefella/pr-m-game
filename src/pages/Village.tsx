import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
const A_23 = { id: 23 as const, x: 720, y: 675, w: 70, h: 50, color: '#4a9eff', bg: 'rgba(74,158,255,0.06)', label: 12 };
const A_47 = { id: 47 as const, x: 1580, y: 780, w: 70, h: 50, color: '#1d9e75', bg: 'rgba(29,158,117,0.06)', label: 12 };
const A_89 = { id: 89 as const, x: 1055, y: 440, w: 90, h: 70, color: '#c8963a', bg: 'rgba(200,150,58,0.06)', label: 14 };
const TYPE_A = [A_23, A_47, A_89];

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

  const [view, setView] = useState({ w: 390, h: 800 });
  useEffect(() => {
    const update = () => setView({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    };
  }, []);

  const triggerA = (nx: number, ny: number) => {
    if (inside(nx, ny, A_89)) {
      if (!navigatedRef.current) {
        navigatedRef.current = true;
        window.setTimeout(() => navigate('/door'), 600);
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

    // Obstacles (B + C + RIM) with 2px padding
    for (const o of OBSTACLES) {
      if (
        nx >= o.x - 2 &&
        nx <= o.x + o.w + 2 &&
        ny >= o.y - 2 &&
        ny <= o.y + o.h + 2
      ) {
        return;
      }
    }

    // Commit target
    playerTargetRef.current = { x: nx, y: ny };
  };

  // Keyboard arrow keys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); move(0, -STEP); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); move(0, STEP); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); move(-STEP, 0); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); move(STEP, 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Player lerp loop — visual chases target at 0.18/frame
  useEffect(() => {
    let raf = 0;
    const loop = () => {
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
    touchAction: 'none',
  };

  const renderTypeA = (b: typeof A_23 | typeof A_47 | typeof A_89, pulsing: boolean) => (
    <div
      key={`a-${b.id}`}
      style={{
        position: 'absolute',
        left: b.x,
        top: b.y,
        width: b.w,
        height: b.h,
        border: `1px solid ${b.color}`,
        background: b.bg,
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
              'linear-gradient(rgba(100,80,160,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(100,80,160,0.08) 1px, transparent 1px)',
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
            border: '0.5px solid rgba(100,80,160,0.05)',
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
            stroke="rgba(160,140,200,0.4)"
            strokeWidth={0.5}
            fill="none"
          />
          <circle
            cx={30 + eyePupil.x}
            cy={20 + eyePupil.y}
            r={3.5}
            fill="#5b4fd4"
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
              border: '0.5px solid rgba(100,80,160,0.25)',
              background: 'rgba(100,80,160,0.07)',
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
              border: '0.5px solid rgba(100,80,160,0.45)',
              background: 'rgba(100,80,160,0.12)',
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
              border: '1px solid rgba(100,80,160,0.7)',
              background: 'rgba(100,80,160,0.20)',
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
                <stop offset="0%" stopColor="#5b4fd4" stopOpacity={0} />
                <stop offset="100%" stopColor="#5b4fd4" stopOpacity={0.8} />
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

        {/* Player dot */}
        <div
          style={{
            position: 'absolute',
            left: player.x - 4,
            top: player.y - 4,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#5b4fd4',
            boxShadow: '0 0 8px rgba(91,79,212,0.8)',
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
          fontSize: 13,
          color: 'rgba(160,140,200,0.6)',
          margin: 0,
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        Another one enters?
      </p>

      {/* D-pad */}
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
          onPointerDown={(e) => {
            e.preventDefault();
            move(0, -STEP);
          }}
        >
          ▲
        </div>
        <div />
        <div
          role="button"
          aria-label="Left"
          style={dpadBtn}
          onPointerDown={(e) => {
            e.preventDefault();
            move(-STEP, 0);
          }}
        >
          ◄
        </div>
        <div />
        <div
          role="button"
          aria-label="Right"
          style={dpadBtn}
          onPointerDown={(e) => {
            e.preventDefault();
            move(STEP, 0);
          }}
        >
          ►
        </div>
        <div />
        <div
          role="button"
          aria-label="Down"
          style={dpadBtn}
          onPointerDown={(e) => {
            e.preventDefault();
            move(0, STEP);
          }}
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
          borderTop: '0.5px solid rgba(169,140,255,0.3)',
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 12,
        }}
      >
        <span className="font-mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: '#e0ddd5' }}>
          MAZE STEPS&nbsp;&nbsp;0
        </span>
        <span className="font-mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: '#c8963a' }}>
          CREDITS&nbsp;&nbsp;0
        </span>
        <span className="font-mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: '#5b4fd4' }}>
          LEVEL&nbsp;&nbsp;1
        </span>
      </div>
    </div>
  );
};

export default Village;
