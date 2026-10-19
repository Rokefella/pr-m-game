import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PlateFrame from '@/components/theme/PlateFrame';
import PixelSigil, { type SigilId } from '@/components/theme/intro/PixelSigil';
import { useReducedMotion } from '@/components/theme/useReducedMotion';

const QUOTE =
  '“When atoms move straight downward through the void, at a time and place that cannot be foreseen, they swerve a little from their course — just enough to call it a change of direction.”';

const SCREENS: { sigil?: SigilId; text: string; attribution?: string }[] = [
  { text: QUOTE, attribution: '— Lucretius, De Rerum Natura, Book II' },
  { sigil: 'fire', text: 'First, there was fire.' },
  { sigil: 'gods', text: 'Man could not explain it. So man made Gods.' },
  { sigil: 'atoms', text: 'Then man looked closer. Gods became atoms.' },
  { sigil: 'stars', text: 'Atoms became stars. Stars became distance without end.' },
  {
    sigil: 'quantum',
    text: 'Then man looked the other way — smaller than atoms. And found the same uncertainty waiting there.',
  },
  { sigil: 'swerve', text: 'The further we reach, the less certain we become.' },
  { sigil: 'praem', text: 'This is where PRÆM begins.' },
];

const TYPE_MS = 28;
const BRACKET = { position: 'absolute', width: 10, height: 10, borderColor: '#f5c060', borderStyle: 'solid', borderWidth: 0 } as const;

const Intro = () => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const screen = SCREENS[index];
  const done = reduced || typed >= screen.text.length;

  useEffect(() => { setTyped(0); }, [index]);
  useEffect(() => {
    if (done) return;
    const t = window.setTimeout(() => setTyped(n => n + 1), TYPE_MS);
    return () => window.clearTimeout(t);
  }, [typed, done]);

  const advance = () => {
    if (!done) { setTyped(screen.text.length); return; }
    if (index < SCREENS.length - 1) {
      setIndex(index + 1);
    } else {
      navigate('/profile-setup');
    }
  };

  const shown = done ? screen.text : screen.text.slice(0, typed);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Continue"
      onClick={advance}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') advance();
      }}
      className="relative flex select-none flex-col items-center justify-center overflow-hidden"
      style={{
        height: '100dvh', backgroundColor: '#0e1228', cursor: 'pointer', outline: 'none',
        backgroundImage: 'radial-gradient(rgba(142,153,208,0.07) 1px, transparent 1px)', backgroundSize: '16px 16px',
        padding: 'max(16px, env(safe-area-inset-top)) 12px max(8px, env(safe-area-inset-bottom))',
      }}
    >
      <PlateFrame width="min(92vw, 360px)" glow="#b79bff">
        <div key={index} className="relative z-10 flex flex-col items-center text-center" style={{ padding: '28px 20px 22px' }}>
          {screen.sigil && (
            <div style={{ position: 'relative', width: 160, height: 160, background: '#0f1329', border: '1px solid #2f3560', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <PixelSigil id={screen.sigil} size={128} />
              <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, rgba(232,228,255,0.07) 0 1px, transparent 1px 4px)' }} />
              <i style={{ ...BRACKET, top: -2, left: -2, borderTopWidth: 2, borderLeftWidth: 2 }} />
              <i style={{ ...BRACKET, top: -2, right: -2, borderTopWidth: 2, borderRightWidth: 2 }} />
              <i style={{ ...BRACKET, bottom: -2, left: -2, borderBottomWidth: 2, borderLeftWidth: 2 }} />
              <i style={{ ...BRACKET, bottom: -2, right: -2, borderBottomWidth: 2, borderRightWidth: 2 }} />
            </div>
          )}
          <p className="font-fell italic" aria-label={screen.text} style={{ fontSize: 20, lineHeight: 1.7, color: '#e8e4ff', minHeight: '3.4em' }}>
            {shown}
            {!done && <span aria-hidden="true" style={{ display: 'inline-block', width: 1, height: '1em', background: '#b79bff', marginLeft: 2, verticalAlign: '-0.15em', animation: 'introBlink 0.8s steps(1) infinite' }} />}
          </p>
          {screen.attribution && (
            <p className="font-fell italic" style={{ marginTop: 18, fontSize: 14, color: '#8e99d0', letterSpacing: '0.05em', opacity: done ? 1 : 0, transition: 'opacity 0.4s' }}>
              {screen.attribution}
            </p>
          )}
          <p className="font-mono" style={{ marginTop: 16, fontSize: 11, color: '#8e99d0', letterSpacing: '0.15em', visibility: done ? 'visible' : 'hidden' }}>
            tap to continue
          </p>
        </div>
      </PlateFrame>

      <div className="flex justify-center" style={{ marginTop: 22, gap: 6 }} aria-hidden="true">
        {SCREENS.map((_, i) => (
          <span key={i} style={{
            width: 10, height: 10, boxSizing: 'border-box',
            background: i === index ? '#b79bff' : i < index ? '#4a5385' : '#0f1329',
            border: `1px solid ${i === index ? '#f5c060' : i < index ? '#8e99d0' : '#2f3560'}`,
          }} />
        ))}
      </div>

      <button
        type="button"
        className="font-mono"
        onClick={(e) => { e.stopPropagation(); navigate('/profile-setup'); }}
        onKeyDown={(e) => e.stopPropagation()}
        style={{ marginTop: 8, minWidth: 44, minHeight: 44, padding: '0 14px', fontSize: 11, color: '#6a74b0', background: 'transparent', border: 'none', letterSpacing: '0.2em', cursor: 'pointer' }}
      >
        skip
      </button>

      <style>{`@keyframes introBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
    </div>
  );
};

export default Intro;
