import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type TrailDot = { x: number; y: number; id: number };

const COLUMN_WIDTH = 390;

// Building rects (x1, y1, x2, y2) within the 390px column
const B89 = { x1: 145, y1: 90, x2: 245, y2: 170 };
const B23 = { x1: 30, y1: 240, x2: 110, y2: 300 };
const B47 = { x1: 280, y1: 240, x2: 360, y2: 300 };

const inside = (x: number, y: number, r: { x1: number; y1: number; x2: number; y2: number }) =>
  x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2;

const Village = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [player, setPlayer] = useState({ x: 195, y: 400 });
  const [trail, setTrail] = useState<TrailDot[]>([]);
  const [steps, setSteps] = useState(0);
  const [feedback, setFeedback] = useState<{ building: 23 | 47 | null }>({ building: null });
  const feedbackTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    };
  }, []);

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Add previous position to trail
    const id = Date.now() + Math.random();
    setTrail((prev) => {
      const next = [{ x: player.x, y: player.y, id }, ...prev].slice(0, 5);
      return next;
    });
    window.setTimeout(() => {
      setTrail((prev) => prev.filter((d) => d.id !== id));
    }, 1000);

    setPlayer({ x, y });
    setSteps((s) => s + 1);

    // Collision checks
    if (inside(x, y, B89)) {
      window.setTimeout(() => navigate('/door'), 600);
      return;
    }
    if (inside(x, y, B23)) {
      setFeedback({ building: 23 });
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
      feedbackTimer.current = window.setTimeout(() => setFeedback({ building: null }), 1500);
      return;
    }
    if (inside(x, y, B47)) {
      setFeedback({ building: 47 });
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
      feedbackTimer.current = window.setTimeout(() => setFeedback({ building: null }), 1500);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{
        backgroundColor: '#04040a',
        maxWidth: COLUMN_WIDTH,
        margin: '0 auto',
        minHeight: '100vh',
        position: 'relative',
      }}
    >
      <style>{`
        @keyframes villagePulse { 0%,100% { opacity:.4 } 50% { opacity:1 } }
        @keyframes villageIdle  { 0%,100% { transform: scale(1) } 50% { transform: scale(1.15) } }
        @keyframes villageFade  { from { opacity:.4 } to { opacity:0 } }
        @keyframes villageNotYet { 0% { opacity:.6 } 80% { opacity:.6 } 100% { opacity:0 } }
      `}</style>

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

      {/* Building 89 (Maze) */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 90,
          transform: 'translateX(-50%)',
          width: 100,
          height: 80,
          border: '1px solid #c8963a',
          background: 'rgba(200,150,58,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'villagePulse 2s ease-in-out infinite',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        <span className="font-mono" style={{ fontSize: 13, color: '#c8963a' }}>
          89
        </span>
      </div>

      {/* Building 23 (Library) */}
      <div
        style={{
          position: 'absolute',
          left: 30,
          top: 240,
          width: 80,
          height: 60,
          border: '1px solid #4a9eff',
          background: 'rgba(74,158,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        <span className="font-mono" style={{ fontSize: 11, color: '#4a9eff' }}>
          23
        </span>
        {feedback.building === 23 && (
          <p
            key={`fb23-${steps}`}
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

      {/* Building 47 (Exchange) */}
      <div
        style={{
          position: 'absolute',
          right: 30,
          top: 240,
          width: 80,
          height: 60,
          border: '1px solid #1d9e75',
          background: 'rgba(29,158,117,0.06)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        <span className="font-mono" style={{ fontSize: 11, color: '#1d9e75' }}>
          47
        </span>
        {feedback.building === 47 && (
          <p
            key={`fb47-${steps}`}
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

      {/* Trail dots */}
      {trail.map((d) => (
        <div
          key={d.id}
          style={{
            position: 'absolute',
            left: d.x - 2.5,
            top: d.y - 2.5,
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'rgba(91,79,212,0.2)',
            animation: 'villageFade 1s ease-out forwards',
            pointerEvents: 'none',
            zIndex: 3,
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
          transition: 'left 300ms ease-out, top 300ms ease-out',
          animation: 'villageIdle 1.5s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 4,
        }}
      />

      {/* Entity quote */}
      <p
        className="font-fell italic"
        style={{
          position: 'absolute',
          top: 24,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 12,
          color: 'rgba(160,140,200,0.6)',
          zIndex: 5,
          pointerEvents: 'none',
          margin: 0,
        }}
      >
        Another one enters?
      </p>

      {/* Tap capture layer */}
      <div
        onClick={handleTap}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'transparent',
          cursor: 'pointer',
          zIndex: 6,
        }}
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
          zIndex: 7,
        }}
      >
        <span
          className="font-mono"
          style={{ fontSize: 9, letterSpacing: '0.18em', color: '#e0ddd5' }}
        >
          MAZE STEPS&nbsp;&nbsp;{steps}
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 9, letterSpacing: '0.18em', color: '#c8963a' }}
        >
          CREDITS&nbsp;&nbsp;0
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 9, letterSpacing: '0.18em', color: '#5b4fd4' }}
        >
          LEVEL&nbsp;&nbsp;1
        </span>
      </div>
    </div>
  );
};

export default Village;
