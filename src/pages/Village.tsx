import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Village = () => {
  const navigate = useNavigate();
  const [tapCount, setTapCount] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const handleTap = () => {
    const next = tapCount + 1;
    setTapCount(next);
    setZoomed(true);
    setTimeout(() => setZoomed(false), 800);
    if (next >= 3) {
      setTimeout(() => navigate('/door'), 400);
    }
  };

  return (
    <div
      className="relative overflow-hidden"
      style={{
        backgroundColor: '#04040a',
        maxWidth: 390,
        margin: '0 auto',
        minHeight: '100vh',
        position: 'relative',
      }}
    >
      {/* Background image */}
      <img
        src="/village.png"
        alt="Village"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: zoomed ? 'scale(1.08)' : 'scale(1.0)',
          transition: 'transform 800ms ease-in-out',
          zIndex: 0,
        }}
      />

      {/* Dark overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.15)',
          zIndex: 1,
        }}
      />

      {/* Tap layer */}
      <button
        onClick={handleTap}
        aria-label="Explore village"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          zIndex: 2,
          padding: 0,
        }}
      />

      {/* Entity quote */}
      <p
        className="font-fell italic"
        style={{
          position: 'absolute',
          top: '6%',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 13,
          color: 'rgba(160,140,200,0.7)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        Another one enters?
      </p>

      {/* Prime number labels */}
      <span
        className="font-mono"
        style={{
          position: 'absolute',
          left: '15%',
          top: '45%',
          fontSize: 14,
          color: '#4a9eff',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        23
      </span>
      <span
        className="font-mono"
        style={{
          position: 'absolute',
          right: '15%',
          top: '50%',
          fontSize: 14,
          color: '#1d9e75',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        47
      </span>
      <span
        className="font-mono"
        style={{
          position: 'absolute',
          left: '50%',
          top: '30%',
          transform: 'translateX(-50%)',
          fontSize: 14,
          color: '#c8963a',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        89
      </span>

      {/* Player silhouette */}
      <div
        style={{
          position: 'absolute',
          bottom: '18%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        <svg width="40" height="52" viewBox="0 0 28 36" fill="none">
          <circle cx="14" cy="10" r="10" fill="#5b4fd4" />
          <path d="M6 22 L22 22 L28 38 L0 38 Z" fill="#5b4fd4" />
        </svg>
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
          zIndex: 4,
        }}
      >
        <span
          className="font-mono"
          style={{
            fontSize: 9,
            letterSpacing: '0.18em',
            color: '#e0ddd5',
          }}
        >
          MAZE STEPS&nbsp;&nbsp;0
        </span>
        <span
          className="font-mono"
          style={{
            fontSize: 9,
            letterSpacing: '0.18em',
            color: '#c8963a',
          }}
        >
          CREDITS&nbsp;&nbsp;0
        </span>
        <span
          className="font-mono"
          style={{
            fontSize: 9,
            letterSpacing: '0.18em',
            color: '#5b4fd4',
          }}
        >
          LEVEL&nbsp;&nbsp;1
        </span>
      </div>
    </div>
  );
};

export default Village;
