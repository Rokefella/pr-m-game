import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { restInsert } from '@/lib/supabaseRest';

const ProfileSetup = () => {
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const auraColor = (typeof window !== 'undefined' && localStorage.getItem('praem_aura_color')) || '#5b4fd4';

  const handleEnter = async () => {
    if (saving) return;

    let playerId = localStorage.getItem('praem_player_id');
    if (!playerId) {
      playerId = crypto.randomUUID();
      localStorage.setItem('praem_player_id', playerId);
    }

    setSaving(true);

    const result = await restInsert('users', {
      id: playerId,
      username: username.trim() || 'Anonymous',
      entity_answer: localStorage.getItem('praem_entity_answer'),
      aura_color: auraColor,
    });

    console.error('DIRECT REST RESULT:', JSON.stringify(result));

    navigate('/village');
  };

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: '#04040a', padding: '52px 22px 28px', maxWidth: 390, margin: '0 auto' }}
    >
      {/* Title */}
      <h1
        className="font-cinzel text-center"
        style={{
          fontSize: 18,
          fontWeight: 400,
          letterSpacing: '0.28em',
          color: '#e0ddd5',
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
              border: '1px solid rgba(169,140,255,0.2)',
              borderRadius: '50%',
            }}
          />
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 64,
              height: 64,
              background: '#1a1a2e',
              border: '1px solid #3a3a5a',
              borderRadius: '50%',
            }}
          >
            <svg width="28" height="36" viewBox="0 0 28 36" fill="none">
              <circle cx="14" cy="10" r="10" fill="#4a4a7a" />
              <path d="M6 22 L22 22 L28 38 L0 38 Z" fill="#4a4a7a" />
            </svg>
          </div>
        </div>
      </div>

      {/* Username */}
      <div>
        <label
          className="font-mono block"
          style={{
            fontSize: 14,
            letterSpacing: '0.2em',
            color: '#9a9890',
            marginBottom: 5,
          }}
        >
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="choose a name for this dimension"
          className="font-mono w-full placeholder:text-[#5a5855]"
          style={{
            background: '#0e0e16',
            border: '0.5px solid #3a3a44',
            padding: '9px 11px',
            fontSize: 16,
            color: '#e0ddd5',
            borderRadius: 0,
            outline: 'none',
            fontStyle: 'normal',
          }}
        />
        <p
          className="font-mono italic"
          style={{
            fontSize: 14,
            color: 'rgba(169,140,255,0.8)',
            marginTop: 3,
          }}
        >
          cannot be changed once you enter
        </p>
      </div>

      {/* Dimension */}
      <div style={{ marginTop: 14 }}>
        <p
          className="font-cinzel"
          style={{
            fontSize: 14,
            color: 'rgba(160,140,200,0.4)',
            letterSpacing: '0.2em',
            marginBottom: 8,
          }}
        >
          YOUR DIMENSION
        </p>
        <div
          aria-label="Your dimension"
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: auraColor,
            boxShadow: `0 0 8px ${auraColor}80`,
          }}
        />
      </div>

      {/* Title Slot */}
      <div
        style={{
          marginTop: 12,
          background: '#0e0e1e',
          border: '1px solid #3a3a5a',
          padding: '10px 12px',
        }}
      >
        <p
          className="font-mono"
          style={{
            fontSize: 14,
            letterSpacing: '0.18em',
            color: '#9a9890',
            marginBottom: 2,
          }}
        >
          Title
        </p>
        <p
          className="font-cinzel"
          style={{ fontSize: 18, color: '#9a9890' }}
        >
          —
        </p>
        <p
          className="font-mono italic"
          style={{ fontSize: 14, color: '#5a5855', marginTop: 3 }}
        >
          titles are earned · not chosen · first at level 5
        </p>
        <p
          className="font-mono italic"
          style={{ fontSize: 14, color: '#5a5855', marginTop: 2 }}
        >
          first 500 players receive a founding title
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={handleEnter}
        className="font-cinzel w-full"
        style={{
          marginTop: 'auto',
          marginBottom: 0,
          background: '#e0ddd5',
          color: '#04040a',
          padding: 11,
          fontSize: 16,
          letterSpacing: '0.3em',
          border: 'none',
          borderRadius: 0,
          textAlign: 'center',
          cursor: 'pointer',
        }}
      >
        ENTER
      </button>
    </div>
  );
};

export default ProfileSetup;
