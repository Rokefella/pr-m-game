import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const COLS = 30;
const ROWS = 30;
const CELL = 40;
const MAP_W = COLS * CELL;
const MAP_H = ROWS * CELL;

type Cell = { col: number; row: number };

// ---- Walls ----
const WALL_SET: Set<string> = (() => {
  const s = new Set<string>();
  const add = (c: number, r: number) => s.add(`${c},${r}`);
  // outer border
  for (let c = 0; c < COLS; c++) {
    add(c, 0);
    add(c, ROWS - 1);
  }
  for (let r = 0; r < ROWS; r++) {
    add(0, r);
    add(COLS - 1, r);
  }
  // 8 horizontal segments
  const hSegs: Array<[number, number, number]> = [
    [3, 4, 4], [10, 4, 5], [20, 5, 4],
    [4, 11, 5], [14, 11, 4], [22, 12, 4],
    [6, 18, 4], [18, 19, 5],
  ];
  for (const [c, r, len] of hSegs) {
    for (let i = 0; i < len; i++) add(c + i, r);
  }
  // 8 vertical segments
  const vSegs: Array<[number, number, number]> = [
    [7, 6, 4], [13, 7, 3], [23, 15, 4],
    [4, 14, 5], [10, 14, 3], [17, 14, 4],
    [25, 20, 5], [12, 22, 4],
  ];
  for (const [c, r, len] of vSegs) {
    for (let i = 0; i < len; i++) add(c, r + i);
  }
  return s;
})();

const isWall = (c: number, r: number) => WALL_SET.has(`${c},${r}`);

// ---- Primes ----
const PRIME_SET: Set<number> = (() => {
  const max = COLS * ROWS;
  const sieve = new Array(max).fill(true);
  sieve[0] = sieve[1] = false;
  for (let i = 2; i * i < max; i++) {
    if (sieve[i]) for (let j = i * i; j < max; j += i) sieve[j] = false;
  }
  const set = new Set<number>();
  for (let i = 2; i < max; i++) if (sieve[i]) set.add(i);
  return set;
})();

const PRIME_BUBBLE_CELLS: Set<string> = (() => {
  const s = new Set<string>();
  for (const n of PRIME_SET) {
    const pc = n % COLS;
    const pr = Math.floor(n / COLS);
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const c = pc + dc;
        const r = pr + dr;
        if (c >= 0 && c < COLS && r >= 0 && r < ROWS) {
          s.add(`${c},${r}`);
        }
      }
    }
  }
  return s;
})();

const inPrimeBubble = (c: number, r: number) => PRIME_BUBBLE_CELLS.has(`${c},${r}`);

// ---- Fragments ----
const FRAGMENTS: Array<Cell & { prime: number; line: string }> = [
  { col: 5, row: 5, prime: 23, line: 'Fragment 23. It has been waiting.' },
  { col: 24, row: 8, prime: 47, line: 'Fragment 47. It has been waiting.' },
  { col: 8, row: 22, prime: 89, line: 'Fragment 89. It has been waiting.' },
  { col: 22, row: 24, prime: 139, line: 'Fragment 139. It has been waiting.' },
  { col: 15, row: 8, prime: 211, line: 'Fragment 211. It has been waiting.' },
];

const DOOR: Cell = { col: 27, row: 27 };

const QUOTES = [
  'Navigate.',
  'The spiral remembers.',
  'You are inside her instrument.',
  'Find the fragments.',
  '89 is the center of everything.',
];

const Maze = () => {
  const navigate = useNavigate();

  const [pos, setPos] = useState<Cell>({ col: 15, row: 15 });
  const posRef = useRef<Cell>({ col: 15, row: 15 });

  const [trail, setTrail] = useState<Cell[]>([]);
  const trailRef = useRef<Cell[]>([]);

  const [collected, setCollected] = useState<Set<number>>(new Set());
  const collectedRef = useRef<Set<number>>(new Set());

  const [steps, setSteps] = useState(0);
  const stepsRef = useRef(0);

  const [whisper, setWhisper] = useState<string | null>(null);
  const [whisperColor, setWhisperColor] = useState<string>('rgba(160,140,200,0.85)');
  const whisperTimer = useRef<number | null>(null);

  const [quoteIdx, setQuoteIdx] = useState(0);

  // camera
  const [cam, setCam] = useState({ x: 0, y: 0 });
  const camRef = useRef({ x: 0, y: 0 });

  const heldKeysRef = useRef<Set<string>>(new Set());
  const keyFrameCounter = useRef(0);

  const [pulse, setPulse] = useState(1);

  const showWhisper = (text: string, color = 'rgba(160,140,200,0.85)', dur = 3000) => {
    setWhisper(text);
    setWhisperColor(color);
    if (whisperTimer.current) window.clearTimeout(whisperTimer.current);
    whisperTimer.current = window.setTimeout(() => setWhisper(null), dur);
  };

  const tryMove = (dc: number, dr: number) => {
    const cur = posRef.current;
    const nc = Math.max(0, Math.min(COLS - 1, cur.col + dc));
    const nr = Math.max(0, Math.min(ROWS - 1, cur.row + dr));
    if (nc === cur.col && nr === cur.row) return;
    if (isWall(nc, nr)) return;

    const newPos = { col: nc, row: nr };
    posRef.current = newPos;
    setPos(newPos);
    stepsRef.current += 1;
    setSteps(stepsRef.current);

    // trail (skip if inside prime bubble)
    if (!inPrimeBubble(nc, nr)) {
      const exists = trailRef.current.some((t) => t.col === nc && t.row === nr);
      if (!exists) {
        trailRef.current = [...trailRef.current, newPos];
        setTrail(trailRef.current);
      }
    }

    // fragment check
    const frag = FRAGMENTS.find((f) => f.col === nc && f.row === nr);
    if (frag && !collectedRef.current.has(frag.prime)) {
      const next = new Set(collectedRef.current);
      next.add(frag.prime);
      collectedRef.current = next;
      setCollected(next);
      showWhisper(frag.line);
    }

    // door check
    if (nc === DOOR.col && nr === DOOR.row) {
      if (collectedRef.current.size >= 5) {
        showWhisper('The way opens.', '#c8963a', 2000);
        window.setTimeout(() => navigate('/shadow'), 2000);
      } else {
        showWhisper('You are not ready.', 'rgba(160,140,200,0.6)', 2000);
      }
    }
  };

  // keyboard listeners
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
      }
      heldKeysRef.current.add(e.key);
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

  // rAF loop: camera + held-key movement + pulse
  useEffect(() => {
    let raf = 0;
    let pulseT = 0;
    const tick = () => {
      // movement throttle (every 8 frames ~ 7Hz)
      keyFrameCounter.current += 1;
      if (keyFrameCounter.current >= 8) {
        keyFrameCounter.current = 0;
        const k = heldKeysRef.current;
        let dc = 0;
        let dr = 0;
        if (k.has('ArrowLeft')) dc -= 1;
        if (k.has('ArrowRight')) dc += 1;
        if (k.has('ArrowUp')) dr -= 1;
        if (k.has('ArrowDown')) dr += 1;
        if (dc !== 0 || dr !== 0) {
          // prefer single-axis move per tick to keep grid clean
          if (dc !== 0 && dr !== 0) {
            tryMove(dc, 0);
          } else {
            tryMove(dc, dr);
          }
        }
      }

      // camera follows player
      const targetX = window.innerWidth / 2 - (posRef.current.col * CELL + CELL / 2);
      const targetY = window.innerHeight / 2 - (posRef.current.row * CELL + CELL / 2);
      camRef.current = {
        x: camRef.current.x + (targetX - camRef.current.x) * 0.12,
        y: camRef.current.y + (targetY - camRef.current.y) * 0.12,
      };
      setCam({ x: camRef.current.x, y: camRef.current.y });

      // pulse
      pulseT += 1 / 60;
      const p = 1 + Math.sin((pulseT / 1.5) * Math.PI * 2) * 0.075 + 0.075;
      setPulse(p);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // quote rotation
  useEffect(() => {
    const id = window.setInterval(() => {
      setQuoteIdx((i) => (i + 1) % QUOTES.length);
    }, 90000);
    return () => window.clearInterval(id);
  }, []);

  const dpadMove = (dc: number, dr: number) => tryMove(dc, dr);

  const playerScreenX = window.innerWidth / 2;
  const playerScreenY = window.innerHeight / 2;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#04040a',
        overflow: 'hidden',
      }}
    >
      {/* MAP */}
      <div
        style={{
          position: 'absolute',
          width: MAP_W,
          height: MAP_H,
          transform: `translate(${cam.x}px, ${cam.y}px)`,
          willChange: 'transform',
        }}
      >
        {/* grid lines */}
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

        {/* walls */}
        {Array.from(WALL_SET).map((key) => {
          const [c, r] = key.split(',').map(Number);
          return (
            <div
              key={`w-${key}`}
              style={{
                position: 'absolute',
                left: c * CELL,
                top: r * CELL,
                width: CELL,
                height: CELL,
                background: 'rgba(100,80,160,0.18)',
                border: '0.5px solid rgba(100,80,160,0.5)',
              }}
            />
          );
        })}

        {/* trail dots */}
        {trail.map((t, i) => (
          <div
            key={`t-${i}`}
            style={{
              position: 'absolute',
              left: t.col * CELL + CELL / 2 - 2,
              top: t.row * CELL + CELL / 2 - 2,
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: 'rgba(91,79,212,0.4)',
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* fragments */}
        {FRAGMENTS.filter((f) => !collected.has(f.prime)).map((f) => (
          <div
            key={`f-${f.prime}`}
            style={{
              position: 'absolute',
              left: f.col * CELL + CELL / 2 - 3,
              top: f.row * CELL + CELL / 2 - 3,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'rgba(200,150,58,0.4)',
              boxShadow: '0 0 6px rgba(200,150,58,0.4)',
            }}
          />
        ))}

        {/* golden door */}
        <div
          style={{
            position: 'absolute',
            left: DOOR.col * CELL + (CELL - 32) / 2,
            top: DOOR.row * CELL + (CELL - 40) / 2,
            width: 32,
            height: 40,
            border: '1px solid #c8963a',
            background: 'rgba(200,150,58,0.08)',
          }}
        />
      </div>

      {/* PLAYER (fixed center) */}
      <div
        style={{
          position: 'fixed',
          left: playerScreenX - 4,
          top: playerScreenY - 4,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#5b4fd4',
          boxShadow: '0 0 8px rgba(91,79,212,0.8)',
          transform: `scale(${pulse})`,
          zIndex: 5,
          pointerEvents: 'none',
        }}
      />

      {/* VISIBILITY OVERLAY */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background:
            'radial-gradient(circle 380px at 50% 50%, transparent 320px, rgba(4,4,10,0.7) 360px, rgba(4,4,10,1) 400px)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* ENTITY QUOTE */}
      <p
        className="font-fell italic"
        style={{
          position: 'fixed',
          top: 24,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 14,
          color: 'rgba(160,140,200,0.5)',
          margin: 0,
          zIndex: 20,
          pointerEvents: 'none',
        }}
      >
        {QUOTES[quoteIdx]}
      </p>

      {/* WHISPER */}
      {whisper && (
        <p
          className="font-fell italic"
          style={{
            position: 'fixed',
            top: '20%',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 20,
            color: whisperColor,
            textShadow: '0 0 12px rgba(91,79,212,0.6)',
            margin: 0,
            zIndex: 30,
            pointerEvents: 'none',
          }}
        >
          {whisper}
        </p>
      )}

      {/* RETURN */}
      <button
        className="font-cinzel"
        onClick={() => navigate('/village')}
        style={{
          position: 'fixed',
          bottom: 110,
          left: 16,
          background: 'transparent',
          border: 'none',
          color: 'rgba(160,140,200,0.3)',
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
          bottom: 90,
          right: 20,
          width: 120,
          height: 120,
          zIndex: 25,
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
            onPointerDown={(e) => {
              e.preventDefault();
              dpadMove(b.dc, b.dr);
            }}
            style={{
              position: 'absolute',
              top: b.top,
              left: b.left,
              width: 40,
              height: 40,
              background: 'rgba(20,18,30,0.7)',
              border: '1px solid rgba(100,80,160,0.4)',
              color: 'rgba(160,140,200,0.7)',
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
          height: 44,
          background: 'rgba(8,6,16,0.92)',
          borderTop: '1px solid rgba(100,80,160,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '0 16px',
          fontSize: 10,
          letterSpacing: '0.15em',
          color: 'rgba(160,140,200,0.7)',
          zIndex: 25,
        }}
      >
        <span>MAZE STEPS {String(steps).padStart(4, '0')}</span>
        <span style={{ color: '#c8963a' }}>FRAGMENTS {collected.size}/5</span>
        <span style={{ color: '#a98cff' }}>LEVEL 01</span>
      </div>
    </div>
  );
};

export default Maze;
