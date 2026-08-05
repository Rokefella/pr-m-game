import { useNavigate } from 'react-router-dom';

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-8"
      style={{ backgroundColor: '#04040a' }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 50% 35% at 50% 50%, rgba(80,50,20,0.08) 0%, transparent 65%)',
        }}
      />
      <div className="relative z-10 flex max-w-2xl flex-col items-center text-center">
        <p
          className="font-fell italic"
          style={{
            fontSize: 22,
            lineHeight: 1.7,
            color: '#e0ddd5',
            textShadow: '0 0 20px rgba(224,221,213,0.08)',
          }}
        >
          “When atoms move straight downward through the void, at a time and place that cannot be foreseen, they swerve a little from their course — just enough to call it a change of direction.”
        </p>
        <p
          className="font-fell italic mt-8"
          style={{
            fontSize: 14,
            color: 'rgba(160,140,200,0.5)',
            letterSpacing: '0.05em',
          }}
        >
          — Lucretius, De Rerum Natura, Book II
        </p>
        <button
          type="button"
          className="font-cinzel mt-16"
          onClick={() => navigate('/entity-questions')}
          style={{
            fontSize: 14,
            letterSpacing: '0.3em',
            color: '#a98cff',
            padding: '12px 32px',
            border: '0.5px solid rgba(169,140,255,0.35)',
            background: 'transparent',
            borderRadius: 0,
            cursor: 'pointer',
            textShadow: '0 0 12px rgba(169,140,255,0.6)',
          }}
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
};

export default Welcome;
