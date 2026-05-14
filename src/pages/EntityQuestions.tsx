import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Dim = 'amber' | 'teal' | 'purple';

const QUESTIONS: { q: string; answers: { label: string; dim: Dim; score: number }[] }[] = [
  {
    q: 'When you enter a room that is empty — what do you notice first?',
    answers: [
      { label: 'The light', dim: 'amber', score: 1 },
      { label: 'The silence', dim: 'teal', score: 2 },
      { label: 'The shape of the space', dim: 'purple', score: 0 },
    ],
  },
  {
    q: 'A door is open. You did not open it. What is your first thought?',
    answers: [
      { label: 'Someone was here before me', dim: 'teal', score: 2 },
      { label: 'Someone is coming back', dim: 'amber', score: 1 },
      { label: 'It was always open', dim: 'purple', score: 0 },
    ],
  },
  {
    q: 'You find a map of a place you have never been. Do you trust it?',
    answers: [
      { label: 'Yes — someone made it carefully', dim: 'amber', score: 1 },
      { label: 'No — maps are always someone\u2019s version', dim: 'purple', score: 0 },
      { label: 'It depends on who left it there', dim: 'teal', score: 2 },
    ],
  },
];

const EntityQuestions = () => {
  const navigate = useNavigate();
  const [revealed, setRevealed] = useState(false);
  const [eyeHovered, setEyeHovered] = useState(false);
  const [step, setStep] = useState(0); // 0..2
  const [scores, setScores] = useState<number[]>([]);

  const handleAnswer = (score: number) => {
    const next = [...scores, score];
    if (step < 2) {
      setScores(next);
      setStep(step + 1);
      return;
    }
    const total = next.reduce((a, b) => a + b, 0);
    let dim: Dim = 'purple';
    let color = '#5b4fd4';
    if (total >= 5) { dim = 'teal'; color = '#0d9488'; }
    else if (total >= 2) { dim = 'amber'; color = '#d97706'; }
    localStorage.setItem('praem_dimension', dim);
    localStorage.setItem('praem_aura_color', color);
    navigate('/profile-setup');
  };

  const current = QUESTIONS[step];

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#04040a' }}
    >
      <div className="flex flex-col items-center" style={{ padding: '0 22px' }}>
        {/* Intro text */}
        <p
          className="font-fell italic"
          style={{
            fontSize: 18,
            color: 'rgba(160,140,200,0.9)',
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          You are here. Three questions. Answer first.
        </p>

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
            cx="45" cy="26" rx="43" ry="24"
            stroke={eyeHovered ? 'rgba(169,140,255,0.65)' : 'rgba(169,140,255,0.45)'}
            strokeWidth="0.5" fill="none"
            style={{ transition: 'stroke 0.3s' }}
          />
          <circle cx="45" cy="26" r="14" fill="rgba(169,140,255,0.12)" stroke="rgba(169,140,255,0.5)" strokeWidth="0.5" />
          <circle cx="45" cy="26" r="5.2" fill="rgba(169,140,255,0.65)" />
          <circle cx="47.6" cy="23.4" r="1.7" fill="rgba(224,221,213,0.3)" />
        </svg>

        {/* Question */}
        <p
          key={`q-${step}`}
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
          {current.q}
        </p>

        {/* Options */}
        <div className="flex w-full flex-col" style={{ maxWidth: 280, marginTop: 36, gap: 10 }}>
          {current.answers.map((a, i) => (
            <button
              key={`${step}-${a.label}`}
              onClick={() => handleAnswer(a.score)}
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
                transitionDelay: revealed ? `${1.2 + i * 0.25}s` : '0s',
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
              {a.label}
            </button>
          ))}
        </div>

        {/* Progress */}
        <p
          className="font-mono"
          style={{
            fontSize: 11,
            color: 'rgba(160,140,200,0.3)',
            textAlign: 'center',
            marginTop: 28,
            letterSpacing: '0.1em',
          }}
        >
          {step + 1} / 3
        </p>
      </div>
    </div>
  );
};

export default EntityQuestions;
