import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ---- Map ----
const MAP_W = 2000;
const MAP_H = 2000;
const CX = 1000;
const CY = 1000;
const STEP = 12;

type Rect = { id: string; x: number; y: number; w: number; h: number };

// Seeded LCG
const makeRng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
};

const rectsOverlap = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  pad = 0,
) =>
  a.x - pad < b.x + b.w &&
  a.x + a.w + pad > b.x &&
  a.y - pad < b.y + b.h &&
  a.y + a.h + pad > b.y;

// ---- Building 89 (level exit) ----
const B89 = { id: 'b89', x: 1555, y: 965, w: 90, h: 70 };

// ---- Specific whisper-trigger Type B positions ----
const WHISPER_TARGETS: { p: [number, number]; msg: string }[] = [
  { p: [400, 400], msg: 'Your fragments are known to me.' },
  { p: [1600, 400], msg: 'The village was always a door.' },
  { p: [400, 1600], msg: 'Others have stood where you stand.' },
  { p: [1600, 1600], msg: 'The spiral has no end.' },
  { p: [1000, 300], msg: 'You will come back. They always do.' },
];

// ---- Generate buildings ----
const generateBuildings = () => {
  const rng = makeRng(0x5EAD09);
  const B: Rect[] = [];
  const C: Rect[] = [];
  const RIM: Rect[] = [];

  // Always place whisper-target Type B buildings first (anchored)
  WHISPER_TARGETS.forEach((wt, i) => {
    const w = 60, h = 50;
    const x = Math.round(wt.p[0] - w / 2);
    const y = Math.round(wt.p[1] - h / 2);
    B.push({ id: `b-anchor-${i}`, x, y, w, h });
  });

  const isClearOfSpawn = (x: number, y: number, w: number, h: number) => {
    const dx = (x + w / 2) - CX;
    const dy = (y + h / 2) - CY;
    return Math.hypot(dx, dy) > 80;
  };

  // 50 Type B (45 random + 5 anchored already placed)
  let attempts = 0;
  while (B.length < 50 && attempts < 2000) {
    attempts++;
    const w = 40 + Math.floor(rng() * 41); // 40-80
    const h = 40 + Math.floor(rng() * 41);
    const x = Math.floor(rng() * (MAP_W - w - 100)) + 50;
    const y = Math.floor(rng() * (MAP_H - h - 100)) + 50;
    const cand = { id: `b-${B.length}`, x, y, w, h };
    if (!isClearOfSpawn(x, y, w, h)) continue;
    if (rectsOverlap(cand, B89, 30)) continue;
    let bad = false;
    for (const o of B) { if (rectsOverlap(cand, o, 30)) { bad = true; break; } }
    if (bad) continue;
    B.push(cand);
  }

  // 100 Type C
  attempts = 0;
  while (C.length < 100 && attempts < 4000) {
    attempts++;
    const w = 20 + Math.floor(rng() * 21); // 20-40
    const h = 20 + Math.floor(rng() * 21);
    const x = Math.floor(rng() * (MAP_W - w - 80)) + 40;
    const y = Math.floor(rng() * (MAP_H - h - 80)) + 40;
    const cand = { id: `c-${C.length}`, x, y, w, h };
    if (!isClearOfSpawn(x, y, w, h)) continue;
    if (rectsOverlap(cand, B89, 20)) continue;
    let bad = false;
    for (const o of B) { if (rectsOverlap(cand, o, 8)) { bad = true; break; } }
    if (bad) continue;
    for (const o of C) { if (rectsOverlap(cand, o, 8)) { bad = true; break; } }
    if (bad) continue;
    C.push(cand);
  }

  // Outer boundary wall — every 40px along all 4 edges, 30x30
  const W_SIZE = 30;
  for (let x = 0; x < MAP_W; x += 40) {
    RIM.push({ id: `rim-t-${x}`, x, y: 0, w: W_SIZE, h: W_SIZE });
    RIM.push({ id: `rim-b-${x}`, x, y: MAP_H - W_SIZE, w: W_SIZE, h: W_SIZE });
  }
  for (let y = 0; y < MAP_H; y += 40) {
    RIM.push({ id: `rim-l-${y}`, x: 0, y, w: W_SIZE, h: W_SIZE });
    RIM.push({ id: `rim-r-${y}`, x: MAP_W - W_SIZE, y, w: W_SIZE, h: W_SIZE });
  }

  return { B, C, RIM };
};

const { B: TYPE_B, C: TYPE_C, RIM: TYPE_RIM } = generateBuildings();
const OBSTACLES: Rect[] = [...TYPE_B, ...TYPE_C, ...TYPE_RIM];

// Map whispers to anchored Type B buildings (first 5)
const WHISPER_BY_RECT = new Map<Rect, string>();
WHISPER_TARGETS.forEach((wt, i) => {
  const r = TYPE_B[i];
  if (r) WHISPER_BY_RECT.set(r, wt.msg);
});

// 23rd Gate
const GATE = { x: 950, y: 170, w: 100, h: 60 };

// Atmosphere text
const ATMOS_TEXTS: { x: number; y: number; t: string }[] = [
  { x: 200, y: 200, t: 'you earned this' },
  { x: 1800, y: 300, t: 'she was here too' },
  { x: 150, y: 1000, t: 'the mathematics converge' },
  { x: 1850, y: 1000, t: 'junction 89' },
  { x: 300, y: 1800, t: 'not all who find this return' },
  { x: 1700, y: 1800, t: 'the spiral continues' },
  { x: 1000, y: 100, t: '∅' },
  { x: 1000, y: 1900, t: 'you are inside it now' },
];

const ShadowRealm = () => {
  const navigate = useNavigate();
  const navigatedRef = useRef(false);

  // Player at map center
  const [player, setPlayer] = useState({ x: CX, y: CY });
  const playerRef = useRef({ x: CX, y: CY });
  const playerTargetRef = useRef({ x: CX, y: CY });
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastMoveAtRef = useRef(Date.now());

  const [view, setView] = useState({ w: 390, h: 800 });
  const [screenCenter, setScreenCenter] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const u = () => {
      setView({ w: window.innerWidth, h: window.innerHeight });
      setScreenCenter({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    };
    u();
    window.addEventListener('resize', u);
    return () => window.removeEventListener('resize', u);
  }, []);

  // Camera
  const cameraRef = useRef({ x: 0, y: 0 });
  const [camera, setCamera] = useState({ x: 0, y: 0 });

  // Level
  const [currentLevel, setCurrentLevel] = useState(1);
  useEffect(() => {
    const lv = Number(localStorage.getItem('praem_level') || '1');
    setCurrentLevel(lv);
  }, []);

  // Whisper
  const [whisper, setWhisper] = useState<string | null>(null);
  const whisperTimer = useRef<number | null>(null);
  const lastWhisperKeyRef = useRef<string | null>(null);
  const showWhisper = (msg: string, dur = 3000) => {
    setWhisper(msg);
    if (whisperTimer.current) window.clearTimeout(whisperTimer.current);
    whisperTimer.current = window.setTimeout(() => setWhisper(null), dur);
  };

  // Eye pupil offset
  const eyePupilRef = useRef({ x: 0, y: 0 });
  const [eyePupil, setEyePupil] = useState({ x: 0, y: 0 });

  // Entry sequence opacity states
  const [gridOp, setGridOp] = useState(0);
  const [bldOp, setBldOp] = useState(0);
  const [eyeOp, setEyeOp] = useState(0);
  // Fade-out for level up
  const [fadeOut, setFadeOut] = useState(false);

  // 23rd state
  const eye5sShownRef = useRef(false);
  const gateWhisperShownRef = useRef(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setGridOp(1), 800);
    const t2 = window.setTimeout(() => setBldOp(1), 1800);
    const t3 = window.setTimeout(() => setEyeOp(1), 2400);
    const t4 = window.setTimeout(() => showWhisper('You found the other side.', 4000), 3600);
    const t5 = window.setTimeout(() => {
      if (!eye5sShownRef.current) {
        eye5sShownRef.current = true;
        showWhisper('Come back on the 23rd.', 4000);
      }
    }, 5000);
    return () => {
      [t1, t2, t3, t4, t5].forEach(window.clearTimeout);
      if (whisperTimer.current) window.clearTimeout(whisperTimer.current);
    };
  }, []);

  // Movement
  const heldKeysRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const ARROWS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
    const onDown = (e: KeyboardEvent) => {
      if (ARROWS.has(e.key)) { e.preventDefault(); heldKeysRef.current.add(e.key); }
    };
    const onUp = (e: KeyboardEvent) => heldKeysRef.current.delete(e.key);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  const triggerLevelUp = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    const cur = Number(localStorage.getItem('praem_level') || '1');
    const next = cur + 1;
    localStorage.setItem('praem_level', String(next));
    localStorage.setItem('praem_levelup_pending', 'true');
    localStorage.setItem('praem_levelup_newlevel', String(next));
    setFadeOut(true);
    window.setTimeout(() => navigate('/village'), 800);
  };

  const move = (dx: number, dy: number) => {
    if (navigatedRef.current) return;
    const prev = playerTargetRef.current;
    const nx = Math.max(0, Math.min(MAP_W, prev.x + dx));
    const ny = Math.max(0, Math.min(MAP_H, prev.y + dy));

    // Building 89 collision = level up
    if (
      nx >= B89.x - 2 && nx <= B89.x + B89.w + 2 &&
      ny >= B89.y - 2 && ny <= B89.y + B89.h + 2
    ) {
      triggerLevelUp();
      return;
    }

    // Gate collision
    if (
      nx >= GATE.x - 2 && nx <= GATE.x + GATE.w + 2 &&
      ny >= GATE.y - 2 && ny <= GATE.y + GATE.h + 2
    ) {
      const is23rd = new Date().getDate() === 23;
      if (is23rd) showWhisper('The entity gathers.', 3000);
      else showWhisper('Come back on the 23rd.', 3000);
      return;
    }

    // Whisper-trigger Type B buildings (no collision blocking — free exploration)
    for (const [rect, msg] of WHISPER_BY_RECT) {
      if (
        nx >= rect.x - 2 && nx <= rect.x + rect.w + 2 &&
        ny >= rect.y - 2 && ny <= rect.y + rect.h + 2
      ) {
        if (lastWhisperKeyRef.current !== rect.id) {
          lastWhisperKeyRef.current = rect.id;
          showWhisper(msg, 3000);
          window.setTimeout(() => { lastWhisperKeyRef.current = null; }, 3500);
        }
        break;
      }
    }

    velocityRef.current = { x: nx - prev.x, y: ny - prev.y };
    lastMoveAtRef.current = Date.now();
    playerTargetRef.current = { x: nx, y: ny };
  };

  // Main rAF loop
  useEffect(() => {
    let raf = 0;
    let frame = 0;
    const loop = () => {
      frame++;
      // held keys every 4 frames
      if (frame % 4 === 0) {
        const k = heldKeysRef.current;
        let kdx = 0, kdy = 0;
        if (k.has('ArrowLeft')) kdx -= STEP;
        if (k.has('ArrowRight')) kdx += STEP;
        if (k.has('ArrowUp')) kdy -= STEP;
        if (k.has('ArrowDown')) kdy += STEP;
        if (kdx && kdy) { kdx *= 0.707; kdy *= 0.707; }
        if (kdx || kdy) move(kdx, kdy);
      }

      // Player lerp
      const t = playerTargetRef.current;
      const c = playerRef.current;
      const dx = t.x - c.x;
      const dy = t.y - c.y;
      if (Math.hypot(dx, dy) < 0.5) {
        if (c.x !== t.x || c.y !== t.y) {
          playerRef.current = { x: t.x, y: t.y };
          setPlayer(playerRef.current);
        }
      } else {
        playerRef.current = { x: c.x + dx * 0.18, y: c.y + dy * 0.18 };
        setPlayer(playerRef.current);
      }

      // Camera
      const tx = view.w / 2 - playerRef.current.x;
      const ty = view.h / 2 - playerRef.current.y;
      cameraRef.current = {
        x: cameraRef.current.x + (tx - cameraRef.current.x) * 0.12,
        y: cameraRef.current.y + (ty - cameraRef.current.y) * 0.12,
      };
      setCamera({ x: cameraRef.current.x, y: cameraRef.current.y });

      // Eye pupil tracking
      const idleSince = Date.now() - lastMoveAtRef.current;
      let etx = 0, ety = 0;
      if (idleSince > 3000) {
        // idle scan: circular drift radius 5, period 10s
        const tm = Date.now() / 10000 * Math.PI * 2;
        etx = Math.cos(tm) * 5;
        ety = Math.sin(tm) * 5;
      } else {
        const v = velocityRef.current;
        const mag = Math.hypot(v.x, v.y);
        if (mag > 0.01) {
          etx = (v.x / mag) * 35;
          ety = (v.y / mag) * 35;
        }
      }
      const ep = eyePupilRef.current;
      eyePupilRef.current = {
        x: ep.x + (etx - ep.x) * 0.025,
        y: ep.y + (ety - ep.y) * 0.025,
      };
      setEyePupil({ x: eyePupilRef.current.x, y: eyePupilRef.current.y });

      // Damp velocity
      velocityRef.current = {
        x: velocityRef.current.x * 0.92,
        y: velocityRef.current.y * 0.92,
      };

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const dpadMove = (dc: number, dr: number) => move(dc * STEP, dr * STEP);
  const dpadIntervalRef = useRef<number | null>(null);
  const startDpadHold = (dc: number, dr: number) => {
    dpadMove(dc, dr);
    if (dpadIntervalRef.current) window.clearInterval(dpadIntervalRef.current);
    dpadIntervalRef.current = window.setInterval(() => dpadMove(dc, dr), 150);
  };
  const stopDpadHold = () => {
    if (dpadIntervalRef.current) {
      window.clearInterval(dpadIntervalRef.current);
      dpadIntervalRef.current = null;
    }
  };
  useEffect(() => () => { if (dpadIntervalRef.current) window.clearInterval(dpadIntervalRef.current); }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#04040a', overflow: 'hidden' }}>
      <style>{`
        @keyframes shadowDotPulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.15) } }
        @keyframes shadowEyeGlow {
          0%,100% { box-shadow: 0 0 30px rgba(34,197,94,0.3) }
          50% { box-shadow: 0 0 60px rgba(34,197,94,0.5) }
        }
        @keyframes shadowGlowRing { 0%,100% { opacity: 0.1 } 50% { opacity: 0.4 } }
        @keyframes shadow89Pulse {
          0%,100% { box-shadow: 0 0 10px rgba(249,115,22,0.5) }
          50% { box-shadow: 0 0 25px rgba(249,115,22,1.0) }
        }
        @keyframes shadowGatePulse {
          0%,100% { box-shadow: 0 0 10px rgba(34,197,94,0.4) }
          50% { box-shadow: 0 0 30px rgba(34,197,94,0.8) }
        }
        @keyframes shadowFadeOut { from { opacity: 0 } to { opacity: 1 } }
        @keyframes shadowWhisperFade { 0% { opacity: 0 } 10% { opacity: 1 } 90% { opacity: 1 } 100% { opacity: 0 } }
      `}</style>

      {/* Map layer */}
      <div
        style={{
          position: 'absolute',
          width: MAP_W,
          height: MAP_H,
          transform: `translate(${camera.x}px, ${camera.y}px)`,
          willChange: 'transform',
        }}
      >
        {/* Grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(20,80,40,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(20,80,40,0.10) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            opacity: gridOp,
            transition: 'opacity 1000ms ease-out',
            pointerEvents: 'none',
          }}
        />

        {/* Atmosphere text */}
        <div style={{ opacity: bldOp, transition: 'opacity 600ms ease-out' }}>
          {ATMOS_TEXTS.map((a, i) => (
            <span
              key={`atx-${i}`}
              className="font-fell italic"
              style={{
                position: 'absolute',
                left: a.x,
                top: a.y,
                fontSize: 10,
                color: 'rgba(20,120,50,0.18)',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {a.t}
            </span>
          ))}

          {/* Outer rim wall */}
          {TYPE_RIM.map((b) => (
            <div
              key={b.id}
              style={{
                position: 'absolute',
                left: b.x,
                top: b.y,
                width: b.w,
                height: b.h,
                border: '0.5px solid rgba(20,120,50,0.3)',
                background: 'rgba(20,120,50,0.08)',
              }}
            />
          ))}

          {/* Type C */}
          {TYPE_C.map((b) => (
            <div
              key={b.id}
              style={{
                position: 'absolute',
                left: b.x,
                top: b.y,
                width: b.w,
                height: b.h,
                border: '0.5px solid rgba(20,120,50,0.25)',
                background: 'rgba(20,120,50,0.07)',
              }}
            />
          ))}

          {/* Type B */}
          {TYPE_B.map((b) => (
            <div
              key={b.id}
              style={{
                position: 'absolute',
                left: b.x,
                top: b.y,
                width: b.w,
                height: b.h,
                border: '1px solid rgba(20,120,50,0.45)',
                background: 'rgba(20,120,50,0.10)',
              }}
            />
          ))}

          {/* Building 89 */}
          <div
            style={{
              position: 'absolute',
              left: B89.x,
              top: B89.y,
              width: B89.w,
              height: B89.h,
              border: '1.5px solid #f97316',
              background: 'rgba(249,115,22,0.10)',
              animation: 'shadow89Pulse 2s ease-in-out infinite',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="font-mono" style={{ fontSize: 14, color: '#f97316' }}>89</span>
          </div>

          {/* 23rd Gate */}
          <span
            className="font-mono"
            style={{
              position: 'absolute',
              left: GATE.x + GATE.w / 2 - 8,
              top: GATE.y - 18,
              fontSize: 11,
              color: 'rgba(34,197,94,0.5)',
            }}
          >
            23
          </span>
          <div
            style={{
              position: 'absolute',
              left: GATE.x,
              top: GATE.y,
              width: GATE.w,
              height: GATE.h,
              border: '1.5px solid #22c55e',
              borderRadius: '50%',
              background: 'rgba(34,197,94,0.05)',
              animation: 'shadowGatePulse 2s ease-in-out infinite',
            }}
          />
        </div>

        {/* Player dot (on map) */}
        <div
          style={{
            position: 'absolute',
            left: player.x - 4,
            top: player.y - 4,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 10px rgba(34,197,94,0.9)',
            animation: 'shadowDotPulse 1.5s ease-in-out infinite',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
      </div>

      {/* THE EYE — fixed to screen, outside map transform */}
      <svg
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 30,
          opacity: eyeOp,
          transition: 'opacity 1200ms ease-out',
          overflow: 'visible',
        }}
      >
        <ellipse
          cx={screenCenter.x}
          cy={screenCenter.y}
          rx={110}
          ry={68}
          stroke="rgba(34,197,94,0.15)"
          strokeWidth={8}
          fill="none"
          style={{ animation: 'shadowGlowRing 3s ease-in-out infinite' }}
        />
        <ellipse
          cx={screenCenter.x}
          cy={screenCenter.y}
          rx={100}
          ry={60}
          stroke="rgba(34,197,94,0.6)"
          strokeWidth={1.5}
          fill="none"
        />
        <circle
          cx={screenCenter.x + eyePupil.x}
          cy={screenCenter.y + eyePupil.y}
          r={18}
          fill="#16a34a"
        />
      </svg>

      {/* Whisper */}
      {whisper && (
        <p
          key={whisper}
          className="font-fell italic"
          style={{
            position: 'fixed',
            top: '20%',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 20,
            color: 'rgba(34,197,94,0.85)',
            textShadow: '0 0 12px rgba(34,197,94,0.4)',
            margin: 0,
            zIndex: 40,
            pointerEvents: 'none',
          }}
        >
          {whisper}
        </p>
      )}

      {/* RETURN button (above HUD) */}
      <button
        className="font-cinzel"
        onClick={() => navigate('/village')}
        style={{
          position: 'fixed',
          bottom: 50,
          left: 16,
          background: 'transparent',
          border: 'none',
          color: 'rgba(249,115,22,0.4)',
          fontSize: 10,
          letterSpacing: '0.2em',
          cursor: 'pointer',
          padding: 4,
          zIndex: 25,
        }}
      >
        RETURN
      </button>

      {/* D-PAD */}
      <div
        style={{
          position: 'fixed',
          bottom: 80,
          right: 16,
          width: 120,
          height: 120,
          zIndex: 55,
        }}
      >
        {[
          { dc: 0, dr: -1, top: 0, left: 40, label: '▲' },
          { dc: -1, dr: 0, top: 40, left: 0, label: '◀' },
          { dc: 1, dr: 0, top: 40, left: 80, label: '▶' },
          { dc: 0, dr: 1, top: 80, left: 40, label: '▼' },
        ].map((b, i) => (
          <button
            key={i}
            onPointerDown={(e) => { e.preventDefault(); dpadMove(b.dc, b.dr); }}
            style={{
              position: 'absolute',
              top: b.top,
              left: b.left,
              width: 40,
              height: 40,
              background: 'rgba(20,30,20,0.7)',
              border: '1px solid rgba(34,197,94,0.4)',
              color: 'rgba(34,197,94,0.7)',
              fontSize: 14,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* HUD */}
      <div
        className="font-mono"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(4,4,10,0.92)',
          borderTop: '0.5px solid rgba(34,197,94,0.3)',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 9,
          letterSpacing: '0.18em',
          zIndex: 60,
        }}
      >
        <span style={{ color: 'rgba(34,197,94,0.6)' }}>SHADOW</span>
        <span style={{ color: '#f97316' }}>FRAGMENTS 5/5</span>
        <span style={{ color: 'rgba(34,197,94,0.7)' }}>
          LEVEL {String(currentLevel).padStart(2, '0')}
        </span>
      </div>

      {/* Black fade-out overlay during level up */}
      {fadeOut && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#04040a',
            zIndex: 200,
            opacity: 0,
            animation: 'shadowFadeOut 800ms ease-in forwards',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
};

export default ShadowRealm;
