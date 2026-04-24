import { useEffect, useState } from 'react';

const FEATURES = [
  'Daily steps fuel your journey through the maze',
  'Fragment collection and archive',
  'Shadow Realm access',
  'Registration number — permanent',
  'All future levels',
];

const Paywall = () => {
  const [eyeVisible, setEyeVisible] = useState(false);
  const [showThanks, setShowThanks] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setEyeVisible(true), 50);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      className="relative flex min-h-screen w-full flex-col items-center overflow-y-auto"
      style={{ backgroundColor: '#04040a' }}
    >
      {/* Purple grid overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(91,79,212,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(91,79,212,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 flex w-full flex-col items-center px-6 pt-16 pb-12">
        {/* Eye */}
        <svg
          width="80"
          height="48"
          viewBox="0 0 80 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            opacity: eyeVisible ? 1 : 0,
            transition: 'opacity 800ms ease-out',
          }}
        >
          <ellipse cx="40" cy="24" rx="40" ry="24" stroke="rgba(160,140,200,0.5)" strokeWidth="0.8" fill="none" />
          <circle cx="40" cy="24" r="7" fill="rgba(91,79,212,0.15)" />
          <circle cx="40" cy="24" r="5" fill="#5b4fd4" />
          <circle cx="40" cy="24" r="2" fill="rgba(255,255,255,0.6)" />
        </svg>

        {/* Headline */}
        <p
          className="font-fell italic"
          style={{
            fontSize: 22,
            color: 'rgba(160,140,200,0.9)',
            marginTop: 24,
            textAlign: 'center',
          }}
        >
          The spiral continues.
        </p>

        {/* Sub text */}
        <p
          className="font-fell italic"
          style={{
            fontSize: 14,
            color: 'rgba(160,140,200,0.5)',
            marginTop: 12,
            textAlign: 'center',
          }}
        >
          Your trial has ended. Subscribe to keep navigating.
        </p>

        {/* Price */}
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span className="font-cinzel" style={{ fontSize: 48, color: '#c8963a', lineHeight: 1 }}>
            €2.99
          </span>
          <span
            className="font-fell italic"
            style={{
              fontSize: 13,
              color: 'rgba(160,140,200,0.4)',
              marginTop: 6,
            }}
          >
            per month
          </span>
        </div>

        {/* Features */}
        <ul
          style={{
            marginTop: 24,
            maxWidth: 280,
            width: '100%',
            listStyle: 'none',
            padding: 0,
          }}
        >
          {FEATURES.map((f) => (
            <li
              key={f}
              className="font-fell italic"
              style={{
                fontSize: 13,
                color: 'rgba(160,140,200,0.7)',
                lineHeight: 2,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: '#a98cff',
                  marginTop: 11,
                  flexShrink: 0,
                }}
              />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {/* Subscribe button */}
        <button
          type="button"
          onClick={() => setShowThanks(true)}
          className="font-cinzel"
          style={{
            marginTop: 32,
            fontSize: 13,
            letterSpacing: '0.3em',
            background: '#5b4fd4',
            color: '#ffffff',
            padding: '14px 48px',
            border: 'none',
            borderRadius: 0,
            cursor: 'pointer',
          }}
        >
          BEGIN
        </button>

        {showThanks && (
          <p
            className="font-fell italic"
            style={{
              marginTop: 16,
              fontSize: 14,
              color: 'rgba(160,140,200,0.6)',
              textAlign: 'center',
            }}
          >
            Payment coming soon. Thank you for your interest.
          </p>
        )}

        {/* Restore purchase */}
        <button
          type="button"
          className="font-cinzel"
          style={{
            marginTop: 18,
            fontSize: 9,
            color: 'rgba(160,140,200,0.2)',
            letterSpacing: '0.15em',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          RESTORE PURCHASE
        </button>

        {/* Bottom note */}
        <p
          className="font-fell italic"
          style={{
            marginTop: 16,
            fontSize: 11,
            color: 'rgba(160,140,200,0.3)',
            textAlign: 'center',
          }}
        >
          Cancel anytime. No commitment.
        </p>
      </div>
    </div>
  );
};

export default Paywall;
