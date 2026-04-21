import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Rect = { id: string | number; x: number; y: number; w: number; h: number };
type Trail = { x: number; y: number; id: number };

const MAP_W = 1200;
const MAP_H = 800;
const CX = 600;
const CY = 400;
const STEP = 12;

// Ring radii
const OUTER_RX = 520, OUTER_RY = 280;
const MIDDLE_RX = 340, MIDDLE_RY = 180;
const INNER_RX = 160, INNER_RY = 80;

// ---------- Type A: interactive ----------
const A_23 = { id: 23, x: 380, y: 375, w: 70, h: 50, color: '#4a9eff', bg: 'rgba(74,158,255,0.06)', label: 12 };
const A_47 = { id: 47, x: 860, y: 440, w: 70, h: 50, color: '#1d9e75', bg: 'rgba(29,158,117,0.06)', label: 12 };
const A_89 = { id: 89, x: 555, y: 170, w: 90, h: 70, color: '#c8963a', bg: 'rgba(200,150,58,0.06)', label: 14 };
const TYPE_A = [A_23, A_47, A_89];

// ---------- Type B: 30 secondary buildings (hand-tuned) ----------
const TYPE_B: Rect[] = [
  // Around middle ring (avoiding 89 top, 47 right-lower)
  { id: 'b1',  x: 280, y: 250, w: 55, h: 40 },
  { id: 'b2',  x: 350, y: 220, w: 45, h: 35 },
  { id: 'b3',  x: 430, y: 200, w: 50, h: 40 },
  { id: 'b4',  x: 500, y: 185, w: 45, h: 35 },
  // gap (street) before 89
  { id: 'b5',  x: 660, y: 185, w: 50, h: 40 },
  { id: 'b6',  x: 730, y: 200, w: 55, h: 35 },
  { id: 'b7',  x: 800, y: 225, w: 50, h: 45 },
  { id: 'b8',  x: 865, y: 260, w: 60, h: 40 },
  { id: 'b9',  x: 905, y: 320, w: 45, h: 50 },
  // gap before 47
  { id: 'b10', x: 905, y: 510, w: 50, h: 45 },
  { id: 'b11', x: 855, y: 555, w: 55, h: 40 },
  { id: 'b12', x: 790, y: 580, w: 60, h: 45 },
  { id: 'b13', x: 720, y: 595, w: 50, h: 40 },
  { id: 'b14', x: 645, y: 605, w: 55, h: 45 },
  { id: 'b15', x: 575, y: 610, w: 50, h: 40 },
  { id: 'b16', x: 500, y: 605, w: 55, h: 45 },
  { id: 'b17', x: 430, y: 595, w: 45, h: 40 },
  { id: 'b18', x: 365, y: 580, w: 60, h: 45 },
  { id: 'b19', x: 305, y: 555, w: 50, h: 40 },
  { id: 'b20', x: 260, y: 510, w: 45, h: 50 },
  { id: 'b21', x: 240, y: 440, w: 50, h: 45 },
  { id: 'b22', x: 240, y: 370, w: 50, h: 45 },
  { id: 'b23', x: 250, y: 310, w: 45, h: 40 },
  // Inner-ring perimeter (sparse — leaving streets to pupil)
  { id: 'b24', x: 470, y: 295, w: 40, h: 30 },
  { id: 'b25', x: 690, y: 295, w: 40, h: 30 },
  { id: 'b26', x: 690, y: 475, w: 40, h: 30 },
  { id: 'b27', x: 470, y: 475, w: 40, h: 30 },
  { id: 'b28', x: 555, y: 290, w: 35, h: 28 },
  { id: 'b29', x: 615, y: 485, w: 35, h: 28 },
  { id: 'b30', x: 405, y: 320, w: 40, h: 35 },
];

// ---------- Type C: 70 background buildings (hand-tuned along outer ring + scatter) ----------
const TYPE_C: Rect[] = [
  // Outer ring upper arc
  { id: 'c1',  x: 95,  y: 380, w: 35, h: 25 },
  { id: 'c2',  x: 105, y: 320, w: 30, h: 22 },
  { id: 'c3',  x: 120, y: 270, w: 35, h: 25 },
  { id: 'c4',  x: 145, y: 220, w: 40, h: 28 },
  { id: 'c5',  x: 180, y: 180, w: 35, h: 25 },
  { id: 'c6',  x: 220, y: 150, w: 30, h: 22 },
  { id: 'c7',  x: 270, y: 130, w: 40, h: 28 },
  { id: 'c8',  x: 320, y: 115, w: 35, h: 25 },
  { id: 'c9',  x: 375, y: 105, w: 30, h: 22 },
  { id: 'c10', x: 430, y: 100, w: 40, h: 28 },
  { id: 'c11', x: 485, y: 100, w: 35, h: 25 },
  { id: 'c12', x: 540, y: 105, w: 30, h: 22 },
  // gap above 89
  { id: 'c13', x: 660, y: 105, w: 30, h: 22 },
  { id: 'c14', x: 715, y: 105, w: 35, h: 25 },
  { id: 'c15', x: 770, y: 110, w: 40, h: 28 },
  { id: 'c16', x: 825, y: 120, w: 35, h: 25 },
  { id: 'c17', x: 880, y: 135, w: 30, h: 22 },
  { id: 'c18', x: 930, y: 155, w: 40, h: 28 },
  { id: 'c19', x: 975, y: 185, w: 35, h: 25 },
  { id: 'c20', x: 1015, y: 220, w: 30, h: 22 },
  { id: 'c21', x: 1045, y: 265, w: 35, h: 25 },
  { id: 'c22', x: 1065, y: 315, w: 40, h: 28 },
  { id: 'c23', x: 1075, y: 370, w: 35, h: 25 },
  { id: 'c24', x: 1075, y: 425, w: 30, h: 22 },
  { id: 'c25', x: 1065, y: 480, w: 40, h: 28 },
  { id: 'c26', x: 1045, y: 530, w: 35, h: 25 },
  { id: 'c27', x: 1015, y: 580, w: 30, h: 22 },
  { id: 'c28', x: 975, y: 615, w: 40, h: 28 },
  { id: 'c29', x: 930, y: 645, w: 35, h: 25 },
  { id: 'c30', x: 880, y: 670, w: 30, h: 22 },
  { id: 'c31', x: 825, y: 685, w: 35, h: 25 },
  { id: 'c32', x: 770, y: 695, w: 40, h: 28 },
  { id: 'c33', x: 715, y: 700, w: 35, h: 25 },
  { id: 'c34', x: 660, y: 700, w: 30, h: 22 },
  // gap south
  { id: 'c35', x: 540, y: 700, w: 30, h: 22 },
  { id: 'c36', x: 485, y: 700, w: 35, h: 25 },
  { id: 'c37', x: 430, y: 695, w: 40, h: 28 },
  { id: 'c38', x: 375, y: 685, w: 35, h: 25 },
  { id: 'c39', x: 320, y: 670, w: 30, h: 22 },
  { id: 'c40', x: 270, y: 645, w: 40, h: 28 },
  { id: 'c41', x: 220, y: 615, w: 35, h: 25 },
  { id: 'c42', x: 180, y: 580, w: 30, h: 22 },
  { id: 'c43', x: 145, y: 530, w: 40, h: 28 },
  { id: 'c44', x: 120, y: 480, w: 35, h: 25 },
  { id: 'c45', x: 105, y: 425, w: 30, h: 22 },
  // Scatter between outer & middle rings
  { id: 'c46', x: 200, y: 250, w: 28, h: 20 },
  { id: 'c47', x: 200, y: 530, w: 28, h: 20 },
  { id: 'c48', x: 360, y: 155, w: 30, h: 22 },
  { id: 'c49', x: 360, y: 625, w: 30, h: 22 },
  { id: 'c50', x: 470, y: 145, w: 28, h: 20 },
  { id: 'c51', x: 470, y: 645, w: 28, h: 20 },
  { id: 'c52', x: 720, y: 145, w: 28, h: 20 },
  { id: 'c53', x: 720, y: 645, w: 28, h: 20 },
  { id: 'c54', x: 990, y: 250, w: 30, h: 22 },
  { id: 'c55', x: 990, y: 530, w: 30, h: 22 },
  { id: 'c56', x: 165, y: 410, w: 25, h: 18 },
  { id: 'c57', x: 1010, y: 400, w: 25, h: 18 },
  { id: 'c58', x: 590, y: 75,  w: 30, h: 20 },
  { id: 'c59', x: 590, y: 730, w: 30, h: 20 },
  { id: 'c60', x: 285, y: 200, w: 25, h: 18 },
  { id: 'c61', x: 285, y: 580, w: 25, h: 18 },
  { id: 'c62', x: 880, y: 195, w: 25, h: 18 },
  { id: 'c63', x: 880, y: 580, w: 25, h: 18 },
  { id: 'c64', x: 410, y: 250, w: 22, h: 16 },
  { id: 'c65', x: 410, y: 535, w: 22, h: 16 },
  { id: 'c66', x: 760, y: 250, w: 22, h: 16 },
  { id: 'c67', x: 760, y: 540, w: 22, h: 16 },
  { id: 'c68', x: 130, y: 360, w: 22, h: 16 },
  { id: 'c69', x: 1045, y: 360, w: 22, h: 16 },
  { id: 'c70', x: 600, y: 130, w: 22, h: 16 },
];

const inside = (px: number, py: number, r: { x: number; y: number; w: number; h: number }) =>
  px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;

const Village = () => {
  const navigate = useNavigate();
  const navigatedRef = useRef(false);
  const feedbackTimer = useRef<number | null>(null);
  const trailIdRef = useRef(0);

  // Random start on outer ellipse (computed once)
  const [player, setPlayer] = useState(() => {
    const theta = Math.random() * Math.PI * 2;
    return {
      x: CX + OUTER_RX * Math.cos(theta),
      y: CY + OUTER_RY * Math.sin(theta),
    };
  });
  const [trail, setTrail] = useState<Trail[]>([]);
  const [feedback, setFeedback] = useState<{ id: 23 | 47 | null }>({ id: null });

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

  const move = (dx: number, dy: number) => {
    setPlayer((prev) => {
      const nx = Math.max(0, Math.min(MAP_W, prev.x + dx));
      const ny = Math.max(0, Math.min(MAP_H, prev.y + dy));

      // append previous position to trail
      const id = ++trailIdRef.current;
      setTrail((t) => {
        const next = [...t, { x: prev.x, y: prev.y, id }];
        return next.length > 50 ? next.slice(next.length - 50) : next;
      });

      // collisions
      if (inside(nx, ny, A_89)) {
        if (!navigatedRef.current) {
          navigatedRef.current = true;
          window.setTimeout(() => navigate('/door'), 600);
        }
      } else if (inside(nx, ny, A_23)) {
        setFeedback({ id: 23 });
        if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
        feedbackTimer.current = window.setTimeout(() => setFeedback({ id: null }), 1500);
      } else if (inside(nx, ny, A_47)) {
        setFeedback({ id: 47 });
        if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
        feedbackTimer.current = window.setTimeout(() => setFeedback({ id: null }), 1500);
      }

      return { x: nx, y: ny };
    });
  };

  // Camera translate (clamped)
  const camX = Math.min(0, Math.max(view.w - MAP_W, view.w / 2 - player.x));
  const camY = Math.min(0, Math.max(view.h - MAP_H, view.h / 2 - player.y));

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
          transform: `translate(${camX}px, ${camY}px)`,
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

        {/* Pupil outline */}
        <div
          style={{
            position: 'absolute',
            left: CX - INNER_RX,
            top: CY - INNER_RY,
            width: INNER_RX * 2,
            height: INNER_RY * 2,
            border: '0.5px solid rgba(100,80,160,0.15)',
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* ∅ symbol */}
        <div
          className="font-mono"
          style={{
            position: 'absolute',
            left: CX,
            top: CY,
            transform: 'translate(-50%, -50%)',
            fontSize: 24,
            color: 'rgba(100,80,160,0.2)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          ∅
        </div>

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
              border: '0.5px solid rgba(100,80,160,0.1)',
              background: 'rgba(100,80,160,0.02)',
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
              border: '0.5px solid rgba(100,80,160,0.25)',
              background: 'rgba(100,80,160,0.04)',
              zIndex: 2,
            }}
          />
        ))}

        {/* Type A buildings */}
        {renderTypeA(A_23, false)}
        {renderTypeA(A_47, false)}
        {renderTypeA(A_89, true)}

        {/* Trail dots */}
        {trail.map((d) => (
          <div
            key={d.id}
            style={{
              position: 'absolute',
              left: d.x - 2,
              top: d.y - 2,
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: 'rgba(91,79,212,0.15)',
              pointerEvents: 'none',
              zIndex: 4,
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
