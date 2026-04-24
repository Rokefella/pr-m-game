const SIGIL_PATTERN: ('filled' | 'dim' | 'empty')[][] = [
  ['empty', 'filled', 'empty', 'filled', 'empty'],
  ['empty', 'empty', 'filled', 'empty', 'empty'],
  ['filled', 'empty', 'filled', 'empty', 'filled'],
  ['empty', 'filled', 'empty', 'filled', 'empty'],
  ['filled', 'empty', 'filled', 'empty', 'dim'],
];

const FILLED_DELAYS = [0, 0.15, 0.4, 0.6, 0.25, 0.8, 0.5, 0.35, 0.7, 0.95];

const STARS = [
  { x: '8%', y: '12%', size: 1, opacity: 0.25, duration: 5, delay: 0 },
  { x: '92%', y: '8%', size: 1.5, opacity: 0.35, duration: 4, delay: 1.2 },
  { x: '15%', y: '85%', size: 1, opacity: 0.2, duration: 6, delay: 0.5 },
  { x: '88%', y: '78%', size: 1.5, opacity: 0.4, duration: 3.5, delay: 2 },
  { x: '5%', y: '45%', size: 1, opacity: 0.15, duration: 7, delay: 0.8 },
  { x: '95%', y: '55%', size: 1, opacity: 0.3, duration: 4.5, delay: 1.5 },
  { x: '22%', y: '5%', size: 1.5, opacity: 0.45, duration: 5.5, delay: 0.3 },
  { x: '78%', y: '92%', size: 1, opacity: 0.2, duration: 8, delay: 2.5 },
  { x: '12%', y: '68%', size: 1.5, opacity: 0.35, duration: 3, delay: 1 },
  { x: '85%', y: '25%', size: 1, opacity: 0.25, duration: 6.5, delay: 1.8 },
];

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const handleEnter = async () => {
    if (loading) return;
    if (!user) {
      navigate('/email-entry');
      return;
    }
    const { data } = await supabase
      .from('users')
      .select('entity_answer, username')
      .eq('id', user.id)
      .maybeSingle();
    if (!data || (!data.entity_answer && !data.username)) {
      navigate('/entity-questions');
    } else {
      navigate('/village');
    }
  };

  let filledIndex = 0;

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#04040a' }}
    >
      {/* Background Glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 45% 30% at 50% 50%, rgba(80,50,20,0.10) 0%, transparent 60%)',
        }}
      />

      {/* Stars */}
      {STARS.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: star.x,
            top: star.y,
            width: star.size,
            height: star.size,
            backgroundColor: '#e0ddd5',
            '--twinkle-min': star.opacity * 0.5,
            '--twinkle-max': star.opacity,
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
          } as React.CSSProperties}
        />
      ))}

      {/* Center Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Eye Sigil */}
        <svg width="80" height="50" viewBox="0 0 110 68" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="55" cy="34" rx="52" ry="31" stroke="rgba(91,79,212,0.1)" strokeWidth="9" />
          <ellipse cx="55" cy="34" rx="51" ry="30" stroke="rgba(255,255,255,0.82)" strokeWidth="0.8" />
          <circle cx="55" cy="34" r="13" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" fill="none" />
          <circle cx="55" cy="34" r="9" fill="rgba(91,79,212,0.2)" />
          <circle cx="55" cy="34" r="6" fill="#5b4fd4" />
          <circle cx="55" cy="34" r="2.5" fill="rgba(255,255,255,0.55)" />
          <line x1="3" y1="34" x2="11" y2="34" stroke="rgba(255,255,255,0.38)" strokeWidth="0.8" />
          <line x1="99" y1="34" x2="107" y2="34" stroke="rgba(255,255,255,0.38)" strokeWidth="0.8" />
          <line x1="55" y1="3" x2="55" y2="11" stroke="rgba(255,255,255,0.38)" strokeWidth="0.8" />
          <line x1="55" y1="57" x2="55" y2="65" stroke="rgba(255,255,255,0.38)" strokeWidth="0.8" />
          <line x1="15" y1="11" x2="20" y2="16" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
          <line x1="90" y1="11" x2="85" y2="16" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
          <line x1="15" y1="57" x2="20" y2="52" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
          <line x1="90" y1="57" x2="85" y2="52" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
        </svg>

        {/* Wordmark */}
        <h1
          className="font-cinzel font-normal uppercase text-[43px] sm:text-[53px]"
          style={{
            letterSpacing: '0.25em',
            color: '#e0ddd5',
            marginTop: 28,
          }}
        >
          PRÆM
        </h1>

        {/* Enter Button */}
        <button
          onClick={handleEnter}
          className="font-fell italic"
          style={{
            fontSize: 13,
            letterSpacing: '0.4em',
            color: '#a98cff',
            marginTop: 44,
            padding: '10px 26px',
            border: '0.5px solid rgba(169,140,255,0.35)',
            background: 'transparent',
            borderRadius: 0,
            cursor: 'pointer',
            textShadow: '0 0 12px rgba(169,140,255,0.6)',
            animation: 'breathe 3s ease-in-out infinite',
          }}
        >
          ENTER
        </button>
      </div>
    </div>
  );
};

export default Index;
