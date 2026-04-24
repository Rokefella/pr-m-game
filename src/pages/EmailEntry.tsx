import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const FULL_TEXT = 'Leave a trace.';

const EmailEntry = () => {
  const [typed, setTyped] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Typewriter
  useEffect(() => {
    const startDelay = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setTyped(FULL_TEXT.slice(0, i));
        if (i >= FULL_TEXT.length) {
          clearInterval(interval);
          setTimeout(() => setShowInput(true), 600);
          setTimeout(() => setShowButton(true), 800);
        }
      }, 40);
    }, 800);
    return () => clearTimeout(startDelay);
  }, []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 2000);
    return () => clearTimeout(t);
  }, [error]);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!valid) {
      setError('The spiral requires a valid address.');
      return;
    }
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: 'https://playpraem.com' },
    });
    if (authError) {
      setError('The spiral requires a valid address.');
      return;
    }
    setSent(true);
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#04040a' }}
    >
      {/* Purple grid overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(169,140,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(169,140,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center" style={{ width: '100%', maxWidth: 320, padding: '0 20px' }}>
        {/* Eye SVG */}
        <svg
          width="80"
          height="50"
          viewBox="0 0 80 50"
          fill="none"
          style={{ animation: 'fadeIn 800ms ease-out forwards', opacity: 0 }}
        >
          <ellipse
            cx="40"
            cy="25"
            rx="32"
            ry="19"
            stroke="rgba(160,140,200,0.4)"
            strokeWidth="0.5"
            fill="none"
          />
          <circle cx="40" cy="25" r="5" fill="#5b4fd4" />
        </svg>

        {/* Typed text */}
        <p
          className="font-fell italic"
          style={{
            fontSize: 20,
            color: 'rgba(160,140,200,0.9)',
            textAlign: 'center',
            marginTop: 28,
            minHeight: 28,
          }}
        >
          {typed}
          <span style={{ opacity: typed.length < FULL_TEXT.length ? 1 : 0 }}>|</span>
        </p>

        {/* Email input */}
        {showInput && !sent && (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="font-fell italic"
            style={{
              marginTop: 36,
              width: '100%',
              maxWidth: 280,
              background: 'transparent',
              border: 'none',
              borderBottom: '0.5px solid rgba(160,140,200,0.3)',
              borderRadius: 0,
              outline: 'none',
              color: 'rgba(160,140,200,0.9)',
              fontSize: 16,
              textAlign: 'center',
              padding: '8px 4px',
              opacity: 0,
              animation: 'fadeIn 600ms ease-out forwards',
            }}
          />
        )}

        {/* ENTER button or confirmation */}
        {showButton && !sent && (
          <button
            onClick={handleSubmit}
            className="font-cinzel"
            style={{
              marginTop: 28,
              fontSize: 11,
              letterSpacing: '0.28em',
              background: '#5b4fd4',
              color: 'white',
              padding: '10px 32px',
              border: 'none',
              borderRadius: 0,
              cursor: 'pointer',
              opacity: 0,
              animation: 'fadeIn 600ms ease-out forwards',
            }}
          >
            ENTER
          </button>
        )}

        {sent && (
          <p
            className="font-fell italic"
            style={{
              marginTop: 36,
              fontSize: 14,
              color: 'rgba(160,140,200,0.6)',
              textAlign: 'center',
              opacity: 0,
              animation: 'fadeIn 800ms ease-out forwards',
            }}
          >
            A door has been opened. Check your email.
          </p>
        )}

        {error && (
          <p
            className="font-fell italic"
            style={{
              marginTop: 20,
              fontSize: 14,
              color: 'rgba(160,140,200,0.6)',
              textAlign: 'center',
            }}
          >
            {error}
          </p>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default EmailEntry;
