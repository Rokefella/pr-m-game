import { useNavigate } from 'react-router-dom';

const ShadowRealm = () => {
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
      <p
        className="font-fell italic"
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          transform: 'translateY(-50%)',
          textAlign: 'center',
          fontSize: 16,
          color: 'rgba(160,140,200,0.7)',
          margin: 0,
          zIndex: 1,
        }}
      >
        The shadow realm is not yet open.
      </p>
      <button
        className="font-cinzel"
        onClick={() => navigate('/village')}
        style={{
          position: 'absolute',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'transparent',
          color: 'rgba(160,140,200,0.4)',
          padding: '10px 22px',
          fontSize: 10,
          letterSpacing: '0.2em',
          border: 'none',
          cursor: 'pointer',
          zIndex: 1,
        }}
      >
        RETURN
      </button>
    </div>
  );
};

export default ShadowRealm;
