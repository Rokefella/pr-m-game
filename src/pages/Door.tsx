import { useNavigate } from 'react-router-dom';

const Door = () => {
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
          top: '12%',
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
        See you on the other side?
      </p>

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
          onClick={() => navigate('/maze')}
          style={{
            background: '#c8963a',
            color: '#04040a',
            padding: '10px 28px',
            fontSize: 11,
            letterSpacing: '0.28em',
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
            fontSize: 11,
            letterSpacing: '0.28em',
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

export default Door;
