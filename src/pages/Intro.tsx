import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const QUOTE =
  '“When atoms move straight downward through the void, at a time and place that cannot be foreseen, they swerve a little from their course — just enough to call it a change of direction.”';

const SCREENS: { sigil?: string; text: string; attribution?: string }[] = [
  { text: QUOTE, attribution: '— Lucretius, De Rerum Natura, Book II' },
  { sigil: '/assets/sigils/01-fire.svg', text: 'First, there was fire.' },
  { sigil: '/assets/sigils/02-gods.svg', text: 'Man could not explain it. So man made Gods.' },
  { sigil: '/assets/sigils/03-atoms.svg', text: 'Then man looked closer. Gods became atoms.' },
  { sigil: '/assets/sigils/04-stars.svg', text: 'Atoms became stars. Stars became distance without end.' },
  {
    sigil: '/assets/sigils/05-quantum.svg',
    text: 'Then man looked the other way — smaller than atoms. And found the same uncertainty waiting there.',
  },
  { sigil: '/assets/sigils/06-swerve.svg', text: 'The further we reach, the less certain we become.' },
  { sigil: '/assets/sigils/07-praem.svg', text: 'This is where PRÆM begins.' },
];

const Intro = () => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  const advance = () => {
    if (index < SCREENS.length - 1) {
      setIndex(index + 1);
    } else {
      navigate('/profile-setup');
    }
  };

  const screen = SCREENS[index];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Continue"
      onClick={advance}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') advance();
      }}
      className="relative flex min-h-screen select-none items-center justify-center overflow-hidden px-8"
      style={{ backgroundColor: '#000000', cursor: 'pointer', outline: 'none' }}
    >
      <div key={index} className="relative z-10 flex flex-col items-center text-center animate-fade-in">
        {screen.sigil && (
          <img
            src={screen.sigil}
            alt=""
            aria-hidden="true"
            style={{
              width: 132,
              height: 132,
              objectFit: 'contain',
              animation: 'introPulse 4.5s ease-in-out infinite',
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
            }}
          />
        )}
        <p
          className="font-fell italic"
          style={{
            marginTop: screen.sigil ? 44 : 0,
            maxWidth: screen.sigil ? 520 : 640,
            fontSize: 22,
            lineHeight: 1.7,
            color: '#e0ddd5',
            textShadow: '0 0 20px rgba(224,221,213,0.08)',
          }}
        >
          {screen.text}
        </p>
        {screen.attribution && (
          <p
            className="font-fell italic"
            style={{
              marginTop: 28,
              fontSize: 14,
              color: 'rgba(160,140,200,0.5)',
              letterSpacing: '0.05em',
            }}
          >
            {screen.attribution}
          </p>
        )}
      </div>

      {/* Progress */}
      <div
        className="absolute left-0 right-0 flex justify-center"
        style={{ bottom: 34, gap: 7 }}
      >
        {SCREENS.map((_, i) => (
          <span
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              backgroundColor: i === index ? 'rgba(169,140,255,0.85)' : 'rgba(224,221,213,0.15)',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes introPulse {
          0%, 100% { transform: scale(1); opacity: 0.72; }
          50% { transform: scale(1.07); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Intro;
