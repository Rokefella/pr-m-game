import { useEffect, useRef, useState } from 'react';

interface FragmentOverlayProps {
  prime: number;
  index: number;
  registrationNumber: number;
  onContinue: () => void;
}

const LINES: Record<number, string> = {
  0: '23. It was always going to be you.',
  1: '47. The spiral bends toward the willing.',
  2: '89. You are inside the instrument now.',
  3: '139. She left this for someone like you.',
  4: '211. The junction remembers every visitor.',
  5: '257. You have gone further than most.',
  6: '293. Almost. The door is close.',
};

const FragmentOverlay = ({ prime, index, registrationNumber, onContinue }: FragmentOverlayProps) => {
  const regLabel = `#${String(registrationNumber).padStart(4, '0')}`;
  const fullLine = LINES[index] ?? `${prime}.`;
  const [bgOpacity, setBgOpacity] = useState(0);
  const [eyeRy, setEyeRy] = useState(2);
  const [typed, setTyped] = useState('');
  const [showPrime, setShowPrime] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const savedTimerRef = useRef<number | null>(null);
  const anchorRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // bg fade-in
    requestAnimationFrame(() => setBgOpacity(1));

    // eye opens over 800ms
    const eyeStart = performance.now();
    let raf = 0;
    const animateEye = (t: number) => {
      const p = Math.min(1, (t - eyeStart) / 800);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out
      setEyeRy(2 + (36 - 2) * eased);
      if (p < 1) raf = requestAnimationFrame(animateEye);
    };
    raf = requestAnimationFrame(animateEye);

    // typing starts after eye opens (800ms)
    let typeTimer: number | undefined;
    let primeTimer: number | undefined;
    let buttonsTimer: number | undefined;
    const typeStart = window.setTimeout(() => {
      let i = 0;
      const tick = () => {
        i += 1;
        setTyped(fullLine.slice(0, i));
        if (i < fullLine.length) {
          typeTimer = window.setTimeout(tick, 35);
        } else {
          // 400ms pause then prime
          primeTimer = window.setTimeout(() => {
            setShowPrime(true);
            // 500ms after prime → buttons
            buttonsTimer = window.setTimeout(() => setShowButtons(true), 500);
          }, 400);
        }
      };
      tick();
    }, 800);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(typeStart);
      if (typeTimer) window.clearTimeout(typeTimer);
      if (primeTimer) window.clearTimeout(primeTimer);
      if (buttonsTimer) window.clearTimeout(buttonsTimer);
    };
  }, [fullLine]);

  const handleContinue = () => {
    setFadingOut(true);
    window.setTimeout(onContinue, 400);
  };

  const handleCapture = () => {
    // Fragment is already persisted to the folder (Supabase) on collection.
    // Confirm to the player, then continue the normal post-collection flow.
    setSavedMsg(true);
    if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    savedTimerRef.current = window.setTimeout(() => {
      setSavedMsg(false);
      handleContinue();
    }, 800);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#04040a',
        opacity: fadingOut ? 0 : bgOpacity,
        transition: fadingOut ? 'opacity 400ms ease-out' : 'opacity 600ms ease-in',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
      }}
    >
      {/* Eye */}
      <svg
        width={140}
        height={88}
        viewBox="-70 -44 140 88"
        style={{ filter: 'drop-shadow(0 0 20px rgba(91,79,212,0.4))' }}
      >
        <ellipse
          cx={0}
          cy={0}
          rx={60}
          ry={eyeRy}
          stroke="rgba(160,140,200,0.6)"
          strokeWidth={1}
          fill="none"
        />
        {eyeRy > 8 && <circle cx={0} cy={0} r={8} fill="#5b4fd4" />}
      </svg>

      {/* Typed line */}
      <p
        className="font-fell italic"
        style={{
          marginTop: 40,
          fontSize: 18,
          color: 'rgba(160,140,200,0.9)',
          textAlign: 'center',
          minHeight: 24,
          maxWidth: '85vw',
        }}
      >
        {typed}
      </p>

      {/* Prime number */}
      {showPrime && (
        <div
          className="font-cinzel"
          style={{
            marginTop: 32,
            fontSize: 64,
            color: '#c8963a',
            animation: 'fragPrimePulse 1.2s ease-in-out infinite',
          }}
        >
          {prime}
        </div>
      )}

      {/* Player avatar */}
      {showPrime && (
        <div
          style={{
            marginTop: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <svg width={40} height={40} viewBox="-20 -20 40 40">
            <circle
              cx={0}
              cy={0}
              r={8}
              fill="#5b4fd4"
              style={{ filter: 'drop-shadow(0 0 12px rgba(91,79,212,0.8))' }}
            />
          </svg>
          <div
            className="font-mono"
            style={{ fontSize: 11, color: 'rgba(160,140,200,0.4)' }}
          >
            {regLabel}
          </div>
        </div>
      )}

      {/* Buttons */}
      {showButtons && (
        <div
          style={{
            marginTop: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 16 }}>
            <button
              className="font-cinzel"
              onClick={handleCapture}
              style={{
                fontSize: 11,
                letterSpacing: '0.28em',
                background: '#c8963a',
                color: '#04040a',
                padding: '10px 24px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              SAVE TO FOLDER
            </button>
          </div>
          {savedMsg && (
            <div
              className="font-fell italic"
              style={{
                fontSize: 13,
                color: 'rgba(160,140,200,0.6)',
              }}
            >
              Saved to your folder.
            </div>
          )}
        </div>
      )}

      <a ref={anchorRef} style={{ display: 'none' }} />

      <style>{`
        @keyframes fragPrimePulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default FragmentOverlay;
