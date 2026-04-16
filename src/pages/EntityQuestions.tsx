import { useNavigate } from 'react-router-dom';

const EntityQuestions = () => {
  const navigate = useNavigate();

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
          width="52"
          height="30"
          viewBox="0 0 52 30"
          fill="none"
          style={{ animation: 'eye-pulse 4s ease-in-out infinite' }}
        >
          <ellipse
            cx="26"
            cy="15"
            rx="25"
            ry="14"
            stroke="rgba(169,140,255,0.45)"
            strokeWidth="0.5"
            fill="none"
          />
          <circle
            cx="26"
            cy="15"
            r="8"
            fill="rgba(169,140,255,0.12)"
            stroke="rgba(169,140,255,0.5)"
            strokeWidth="0.5"
          />
          <circle cx="26" cy="15" r="3" fill="rgba(169,140,255,0.65)" />
          <circle cx="27.5" cy="13.5" r="1" fill="rgba(224,221,213,0.3)" />
        </svg>

        {/* Question */}
        <p
          className="font-fell italic"
          style={{
            fontSize: 15,
            color: 'rgba(224,221,213,0.65)',
            textAlign: 'center',
            lineHeight: 1.65,
            marginTop: 32,
          }}
        >
          Why have you come to this place?
        </p>

        {/* Options */}
        <div
          className="flex w-full flex-col"
          style={{ maxWidth: 280, marginTop: 36, gap: 10 }}
        >
          {options.map((text) => (
            <button
              key={text}
              onClick={() => navigate('/profile-setup')}
              className="font-fell italic"
              style={{
                fontSize: 11,
                color: 'rgba(224,221,213,0.4)',
                background: 'rgba(169,140,255,0.03)',
                border: '0.5px solid rgba(169,140,255,0.15)',
                padding: '11px 14px',
                borderRadius: 0,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'rgba(224,221,213,0.7)';
                e.currentTarget.style.borderColor = 'rgba(169,140,255,0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(224,221,213,0.4)';
                e.currentTarget.style.borderColor = 'rgba(169,140,255,0.15)';
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
            fontSize: 7,
            letterSpacing: '0.14em',
            color: '#3a3835',
            textAlign: 'center',
            marginTop: 20,
          }}
        >
          choose carefully · this cannot be undone
        </p>
      </div>
    </div>
  );
};

export default EntityQuestions;
