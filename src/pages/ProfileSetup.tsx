import { useState } from 'react';

const AURA_COLORS = ['#1a1a20', '#0e1428', '#0e1e14', '#1e0e0e', '#140e1e'];

const ProfileSetup = () => {
  const [selectedAura, setSelectedAura] = useState(4);

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: '#04040a', padding: '52px 22px 28px' }}
    >
      {/* Title */}
      <h1
        className="font-cinzel text-center"
        style={{
          fontSize: 9,
          fontWeight: 400,
          letterSpacing: '0.28em',
          color: '#9a9890',
          marginBottom: 28,
        }}
      >
        Who are you?
      </h1>

      {/* Avatar */}
      <div className="flex justify-center" style={{ marginBottom: 24 }}>
        <div className="relative" style={{ width: 64, height: 64 }}>
          <div
            className="absolute rounded-full"
            style={{
              inset: -3,
              border: '0.5px solid rgba(224,221,213,0.08)',
              borderRadius: '50%',
            }}
          />
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 64,
              height: 64,
              background: '#0e0e14',
              border: '0.5px solid #1a1a20',
              borderRadius: '50%',
            }}
          >
            <svg width="28" height="36" viewBox="0 0 28 36" fill="none">
              <circle cx="14" cy="10" r="10" fill="#1a1a28" />
              <path d="M6 22 L22 22 L28 38 L0 38 Z" fill="#1a1a28" />
            </svg>
          </div>
        </div>
      </div>

      {/* Username */}
      <div>
        <label
          className="font-mono block"
          style={{
            fontSize: 7,
            letterSpacing: '0.2em',
            color: '#9a9890',
            marginBottom: 5,
          }}
        >
          Username
        </label>
        <input
          type="text"
          placeholder="choose a name for this dimension"
          className="font-mono w-full placeholder:text-[#5a5855]"
          style={{
            background: '#0a0a0e',
            border: '0.5px solid #2a2a2e',
            padding: '9px 11px',
            fontSize: 10,
            color: '#e0ddd5',
            borderRadius: 0,
            outline: 'none',
            fontStyle: 'normal',
          }}
        />
        <p
          className="font-mono italic"
          style={{
            fontSize: 7,
            color: 'rgba(169,140,255,0.6)',
            marginTop: 3,
          }}
        >
          cannot be changed once you enter
        </p>
      </div>

      {/* Aura Colour */}
      <div style={{ marginTop: 14 }}>
        <label
          className="font-mono block"
          style={{
            fontSize: 7,
            color: '#9a9890',
            marginBottom: 6,
          }}
        >
          Aura colour
        </label>
        <div className="flex flex-row" style={{ gap: 7 }}>
          {AURA_COLORS.map((color, i) => (
            <button
              key={color}
              onClick={() => setSelectedAura(i)}
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: color,
                border:
                  selectedAura === i
                    ? '1px solid rgba(169,140,255,0.4)'
                    : '0.5px solid transparent',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* Title Slot */}
      <div
        style={{
          marginTop: 12,
          background: '#080810',
          border: '0.5px solid #1a1a20',
          padding: '10px 12px',
        }}
      >
        <p
          className="font-mono"
          style={{
            fontSize: 7,
            letterSpacing: '0.18em',
            color: '#5a5855',
            marginBottom: 2,
          }}
        >
          Title
        </p>
        <p
          className="font-cinzel"
          style={{ fontSize: 11, color: '#5a5855' }}
        >
          —
        </p>
        <p
          className="font-mono italic"
          style={{ fontSize: 7, color: '#3a3835', marginTop: 3 }}
        >
          titles are earned · not chosen · first at level 5
        </p>
      </div>

      {/* CTA */}
      <button
        className="font-cinzel w-full"
        style={{
          marginTop: 'auto',
          marginBottom: 0,
          background: '#e0ddd5',
          color: '#04040a',
          padding: 11,
          fontSize: 9,
          letterSpacing: '0.28em',
          border: 'none',
          borderRadius: 0,
          textAlign: 'center',
          cursor: 'pointer',
        }}
      >
        ENTER THE DIMENSION
      </button>
    </div>
  );
};

export default ProfileSetup;
