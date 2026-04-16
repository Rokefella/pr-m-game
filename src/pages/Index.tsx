const SIGIL_PATTERN: ('filled' | 'dim' | 'empty')[][] = [
  ['empty', 'filled', 'empty', 'filled', 'empty'],
  ['empty', 'empty', 'filled', 'empty', 'empty'],
  ['filled', 'empty', 'filled', 'empty', 'filled'],
  ['empty', 'filled', 'empty', 'filled', 'empty'],
  ['filled', 'empty', 'filled', 'empty', 'dim'],
];

const FILLED_DELAYS = [0, 0.15, 0.4, 0.6, 0.25, 0.8, 0.5, 0.35, 0.7, 0.95];

const STARS = [
  { x: '8%', y: '12%', size: 1, opacity: 0.25, duration: 5, delay: 0 },
  { x: '92%', y: '8%', size: 1.5, opacity: 0.35, duration: 4, delay: 1.2 },
  { x: '15%', y: '85%', size: 1, opacity: 0.2, duration: 6, delay: 0.5 },
  { x: '88%', y: '78%', size: 1.5, opacity: 0.4, duration: 3.5, delay: 2 },
  { x: '5%', y: '45%', size: 1, opacity: 0.15, duration: 7, delay: 0.8 },
  { x: '95%', y: '55%', size: 1, opacity: 0.3, duration: 4.5, delay: 1.5 },
  { x: '22%', y: '5%', size: 1.5, opacity: 0.45, duration: 5.5, delay: 0.3 },
  { x: '78%', y: '92%', size: 1, opacity: 0.2, duration: 8, delay: 2.5 },
  { x: '12%', y: '68%', size: 1.5, opacity: 0.35, duration: 3, delay: 1 },
  { x: '85%', y: '25%', size: 1, opacity: 0.25, duration: 6.5, delay: 1.8 },
];

import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();
  let filledIndex = 0;

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#04040a' }}
    >
      {/* Background Glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 45% 30% at 50% 50%, rgba(80,50,20,0.10) 0%, transparent 60%)',
        }}
      />

      {/* Stars */}
      {STARS.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: star.x,
            top: star.y,
            width: star.size,
            height: star.size,
            backgroundColor: '#e0ddd5',
            '--twinkle-min': star.opacity * 0.5,
            '--twinkle-max': star.opacity,
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
          } as React.CSSProperties}
        />
      ))}

      {/* Center Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Sigil Grid */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(5, 10px)',
            gap: '4px',
          }}
        >
          {SIGIL_PATTERN.flat().map((type, i) => {
            if (type === 'filled') {
              const delay = FILLED_DELAYS[filledIndex % FILLED_DELAYS.length];
              filledIndex++;
              return (
                <div
                  key={i}
                  className="rounded-full"
                  style={{
                    width: 10,
                    height: 10,
                    backgroundColor: '#e0ddd5',
                    opacity: 0.65,
                    boxShadow: '0 0 5px rgba(224,221,213,0.3)',
                    animation: `sigil-pulse 3s ease-in-out ${delay}s infinite`,
                  }}
                />
              );
            }
            if (type === 'dim') {
              return (
                <div
                  key={i}
                  className="rounded-full"
                  style={{
                    width: 10,
                    height: 10,
                    backgroundColor: '#e0ddd5',
                    opacity: 0.12,
                  }}
                />
              );
            }
            return (
              <div
                key={i}
                className="rounded-full"
                style={{
                  width: 10,
                  height: 10,
                  backgroundColor: 'transparent',
                  border: '0.5px solid rgba(224,221,213,0.07)',
                }}
              />
            );
          })}
        </div>

        {/* Wordmark */}
        <h1
          className="font-cinzel font-normal uppercase text-[42px] sm:text-[52px]"
          style={{
            letterSpacing: '0.25em',
            color: '#e0ddd5',
            marginTop: 28,
          }}
        >
          PRÆM
        </h1>

        {/* Enter Button */}
        <button
          onClick={() => navigate('/entity-questions')}
          className="font-fell italic"
          style={{
            fontSize: 12,
            letterSpacing: '0.4em',
            color: '#a98cff',
            marginTop: 44,
            padding: '10px 26px',
            border: '0.5px solid rgba(169,140,255,0.35)',
            background: 'transparent',
            borderRadius: 0,
            cursor: 'pointer',
            textShadow: '0 0 12px rgba(169,140,255,0.6)',
            animation: 'breathe 3s ease-in-out infinite',
          }}
        >
          ENTER
        </button>
      </div>
    </div>
  );
};

export default Index;
