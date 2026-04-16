import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const EntityQuestions = () => {
  const navigate = useNavigate();
  const [revealed, setRevealed] = useState(false);
  const [eyeHovered, setEyeHovered] = useState(false);

  const options = [
    'You invited me.',
    'Something brought me here.',
    'I just had a feeling.',
  ];

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#04040a' }}
    >
      <div className="flex flex-col items-center">
        {/* Eye SVG */}
        <svg
          width="90"
          height="52"
          viewBox="0 0 90 52"
          fill="none"
          style={{ animation: 'eye-pulse 4s ease-in-out infinite', cursor: 'pointer' }}
          onClick={() => setRevealed(true)}
          onMouseEnter={() => setEyeHovered(true)}
          onMouseLeave={() => setEyeHovered(false)}
        >
          <ellipse
            cx="45"
            cy="26"
            rx="43"
            ry="24"
            stroke={eyeHovered ? 'rgba(169,140,255,0.65)' : 'rgba(169,140,255,0.45)'}
            strokeWidth="0.5"
            fill="none"
            style={{ transition: 'stroke 0.3s' }}
          />
          <circle
            cx="45"
            cy="26"
            r="14"
            fill="rgba(169,140,255,0.12)"
            stroke="rgba(169,140,255,0.5)"
            strokeWidth="0.5"
          />
          <circle cx="45" cy="26" r="5.2" fill="rgba(169,140,255,0.65)" />
          <circle cx="47.6" cy="23.4" r="1.7" fill="rgba(224,221,213,0.3)" />
        </svg>

        {/* Question */}
        <p
          className="font-fell italic"
          style={{
            fontSize: 16,
            color: '#e0ddd5',
            textAlign: 'center',
            lineHeight: 1.65,
            marginTop: 32,
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 1.5s, transform 1.5s',
          }}
        >
          Why have you come to this place?
        </p>

        {/* Options */}
        <div
          className="flex w-full flex-col"
          style={{ maxWidth: 280, marginTop: 36, gap: 10 }}
        >
          {options.map((text, i) => (
            <button
              key={text}
              onClick={() => navigate('/profile-setup')}
              className="font-fell italic"
              style={{
                fontSize: 12,
                color: '#c8c5bd',
                background: 'rgba(169,140,255,0.06)',
                border: '1px solid rgba(169,140,255,0.4)',
                padding: '11px 14px',
                borderRadius: 0,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'opacity 0.8s, transform 0.8s, color 0.2s, border-color 0.2s',
                opacity: revealed ? 1 : 0,
                transform: revealed ? 'translateY(0)' : 'translateY(8px)',
                transitionDelay: revealed ? `${1.5 + i * 0.3}s` : '0s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#e0ddd5';
                e.currentTarget.style.borderColor = 'rgba(169,140,255,0.55)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#c8c5bd';
                e.currentTarget.style.borderColor = 'rgba(169,140,255,0.4)';
              }}
            >
              {text}
            </button>
          ))}
        </div>

        {/* Warning */}
        <p
          className="font-mono"
          style={{
            fontSize: 8,
            letterSpacing: '0.14em',
            color: '#9a9890',
            textAlign: 'center',
            marginTop: 20,
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.8s, transform 0.8s',
            transitionDelay: revealed ? '2.4s' : '0s',
          }}
        >
          choose carefully · this cannot be undone
        </p>
      </div>
    </div>
  );
};

export default EntityQuestions;
