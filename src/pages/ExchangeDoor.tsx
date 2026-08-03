import { useNavigate } from 'react-router-dom';

const ExchangeDoor = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#04040a',
        overflow: 'hidden',
      }}
    >
      {/* Animation keyframes */}
      <style>{`
        @keyframes doorGlow {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(0.96); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.04); }
        }
        @keyframes doorSeam {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.9; }
        }
      `}</style>

      {/* Purple grid overlay (same as Village) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(100,80,160,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(100,80,160,0.08) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Top quote */}
      <p
        className="font-fell italic"
        style={{
          position: 'absolute',
          top: '23%',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 18,
          color: '#e0ddd5',
          textShadow: '0 1px 12px rgba(0,0,0,0.9)',
          margin: 0,
          zIndex: 2,
        }}
      >
        What are you willing to give up?
      </p>

      {/* Arched door centerpiece */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -58%)',
          width: 260,
          height: 360,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        {/* Breathing glow behind the door */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 260,
            height: 260,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(29,158,117,0.55) 0%, rgba(29,158,117,0.25) 45%, transparent 70%)',
            animation: 'doorGlow 3.4s ease-in-out infinite',
          }}
        />

        {/* Arched double-door SVG */}
        <svg
          width={220}
          height={320}
          viewBox="0 0 220 320"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <defs>
            <linearGradient id="doorFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1d4a3e" stopOpacity="0.92" />
              <stop offset="50%" stopColor="#0f2f26" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#051915" stopOpacity="0.92" />
            </linearGradient>
            <linearGradient id="doorStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1d9e75" />
              <stop offset="50%" stopColor="#2ecc9e" />
              <stop offset="100%" stopColor="#1d9e75" />
            </linearGradient>
            <filter id="doorGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            </filter>
          </defs>

          {/* Outer arch fill */}
          <path
            d="M20,320 L20,110 Q20,20 110,20 Q200,20 200,110 L200,320"
            fill="url(#doorFill)"
            stroke="none"
          />
          {/* Outer arch teal stroke with glow */}
          <path
            d="M20,320 L20,110 Q20,20 110,20 Q200,20 200,110 L200,320"
            fill="none"
            stroke="url(#doorStroke)"
            strokeWidth="2"
            filter="url(#doorGlow)"
          />
          {/* Inset arch outline */}
          <path
            d="M34,320 L34,124 Q34,34 110,34 Q176,34 176,124 L176,320"
            fill="none"
            stroke="rgba(46,204,158,0.35)"
            strokeWidth="1"
          />
          {/* Center seam */}
          <line
            x1="110"
            y1="20"
            x2="110"
            y2="320"
            stroke="rgba(46,204,158,0.18)"
            strokeWidth="1"
          />
          {/* Door handles */}
          <circle cx="96" cy="178" r="4" fill="rgba(46,204,158,0.55)" />
          <circle cx="124" cy="178" r="4" fill="rgba(46,204,158,0.55)" />
          {/* Pulsing light seeping through the seam */}
          <line
            x1="110"
            y1="20"
            x2="110"
            y2="320"
            stroke="rgba(46,204,158,0.55)"
            strokeWidth="3"
            filter="url(#doorGlow)"
            style={{ animation: 'doorSeam 2.6s ease-in-out infinite' }}
          />
        </svg>
      </div>

      {/* Bottom buttons */}
      <div
        style={{
          position: 'absolute',
          bottom: '25%',
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
          zIndex: 2,
        }}
      >
        <button
          className="font-cinzel"
          onClick={() => navigate('/exchange')}
          style={{
            background: '#c8963a',
            color: '#04040a',
            padding: '10px 28px',
            fontSize: 16,
            letterSpacing: '0.3em',
            border: 'none',
            borderRadius: 0,
            cursor: 'pointer',
          }}
        >
          YES
        </button>
        <button
          className="font-cinzel"
          onClick={() => navigate('/village')}
          style={{
            background: 'transparent',
            color: '#9a9890',
            padding: '10px 22px',
            fontSize: 16,
            letterSpacing: '0.3em',
            border: '0.5px solid #5a5855',
            borderRadius: 0,
            cursor: 'pointer',
          }}
        >
          STAY
        </button>
      </div>
    </div>
  );
};

export default ExchangeDoor;
