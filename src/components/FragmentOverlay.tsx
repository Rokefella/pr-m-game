import { useEffect, useRef, useState } from 'react';

interface FragmentOverlayProps {
  prime: number;
  index: number;
  onContinue: () => void;
}

const LINES: Record<number, string> = {
  0: '23. It was always going to be you.',
  1: '47. The spiral bends toward the willing.',
  2: '89. You are inside the instrument now.',
  3: '139. She left this for someone like you.',
  4: '211. The junction remembers every visitor.',
};

const FragmentOverlay = ({ prime, index, onContinue }: FragmentOverlayProps) => {
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
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // bg
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 0, 600, 800);

    // grid
    ctx.strokeStyle = 'rgba(100,80,160,0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 600; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 800);
      ctx.stroke();
    }
    for (let y = 0; y <= 800; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(600, y);
      ctx.stroke();
    }

    // eye oval at (300, 280) rx=80 ry=48
    ctx.strokeStyle = 'rgba(160,140,200,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(300, 280, 80, 48, 0, 0, Math.PI * 2);
    ctx.stroke();

    // pupil r=10
    ctx.fillStyle = '#5b4fd4';
    ctx.beginPath();
    ctx.arc(300, 280, 10, 0, Math.PI * 2);
    ctx.fill();

    // prime number at (300, 420) cinzel 96px gold
    ctx.fillStyle = '#c8963a';
    ctx.font = '96px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(prime), 300, 420);

    // player avatar at (300, 560): outer ring + filled circle
    ctx.strokeStyle = 'rgba(91,79,212,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(300, 560, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#5b4fd4';
    ctx.beginPath();
    ctx.arc(300, 560, 16, 0, Math.PI * 2);
    ctx.fill();

    // registration label below avatar
    ctx.fillStyle = 'rgba(160,140,200,0.4)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('#0001', 300, 590);

    // PRÆM at bottom
    ctx.fillStyle = 'rgba(160,140,200,0.4)';
    ctx.font = '14px Cinzel, serif';
    ctx.textAlign = 'center';
    // simulate letter-spacing 0.3em
    const label = 'PRÆM';
    const spacing = 14 * 0.3;
    let totalWidth = 0;
    const widths: number[] = [];
    for (const ch of label) {
      const w = ctx.measureText(ch).width;
      widths.push(w);
      totalWidth += w;
    }
    totalWidth += spacing * (label.length - 1);
    let cx = 300 - totalWidth / 2;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < label.length; i++) {
      ctx.fillText(label[i], cx, 740);
      cx += widths[i] + spacing;
    }

    // Save to localStorage instead of downloading
    try {
      const dataUrl = canvas.toDataURL('image/png');
      localStorage.setItem(`praem_fragment_${prime}`, dataUrl);
      const meta = {
        prime,
        collectedAt: Date.now(),
        registrationNumber: '0001',
        level: 1,
      };
      localStorage.setItem(`praem_fragment_${prime}_meta`, JSON.stringify(meta));
      setSavedMsg(true);
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
      savedTimerRef.current = window.setTimeout(() => setSavedMsg(false), 1500);
    } catch (err) {
      console.error('Failed to save fragment to backpack', err);
    }
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

      {/* Buttons */}
      {showButtons && (
        <div style={{ marginTop: 40, display: 'flex', gap: 16 }}>
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
            CAPTURE
          </button>
          <button
            className="font-cinzel"
            onClick={handleContinue}
            style={{
              fontSize: 11,
              letterSpacing: '0.28em',
              background: 'transparent',
              border: '0.5px solid rgba(160,140,200,0.4)',
              color: 'rgba(160,140,200,0.7)',
              padding: '10px 24px',
              cursor: 'pointer',
            }}
          >
            CONTINUE
          </button>
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
