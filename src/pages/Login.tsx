import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '0.5px solid rgba(169,140,255,0.35)',
  background: 'transparent',
  color: '#e0ddd5',
  fontFamily: 'Cinzel, serif',
  fontSize: 16,
  letterSpacing: '0.15em',
  borderRadius: 0,
  outline: 'none',
};

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    navigate('/');
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6"
      style={{ backgroundColor: '#04040a' }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 45% 30% at 50% 50%, rgba(80,50,20,0.10) 0%, transparent 60%)',
        }}
      />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <svg width="80" height="48" viewBox="0 0 80 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="40" cy="24" rx="38" ry="21" stroke="rgba(160,140,200,0.5)" strokeWidth="0.8" fill="none" />
          <circle cx="40" cy="24" r="7" fill="rgba(91,79,212,0.15)" />
          <circle cx="40" cy="24" r="5" fill="#5b4fd4" />
          <circle cx="40" cy="24" r="2" fill="rgba(255,255,255,0.6)" />
          <line x1="1" y1="24" x2="8" y2="24" stroke="rgba(160,140,200,0.3)" strokeWidth="0.7" />
          <line x1="72" y1="24" x2="79" y2="24" stroke="rgba(160,140,200,0.3)" strokeWidth="0.7" />
          <line x1="40" y1="1" x2="40" y2="8" stroke="rgba(160,140,200,0.3)" strokeWidth="0.7" />
          <line x1="40" y1="40" x2="40" y2="47" stroke="rgba(160,140,200,0.3)" strokeWidth="0.7" />
        </svg>

        <h1
          className="font-cinzel font-normal uppercase text-[48px] sm:text-[56px]"
          style={{ letterSpacing: '0.25em', color: '#e0ddd5', marginTop: 24 }}
        >
          PRÆM
        </h1>

        <form onSubmit={handleSubmit} className="mt-10 flex w-full flex-col gap-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            style={{ ...inputStyle, color: email ? '#e0ddd5' : undefined }}
            className="placeholder:text-[#5a5855]"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            style={inputStyle}
            className="placeholder:text-[#5a5855]"
          />

          {error && (
            <p className="font-fell italic" style={{ color: '#c8943a', fontSize: 13, textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="font-fell italic self-center"
            style={{
              fontSize: 13,
              letterSpacing: '0.4em',
              color: '#a98cff',
              marginTop: 16,
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
        </form>

        <Link
          to="/signup"
          className="font-fell italic mt-8"
          style={{ color: '#5a5855', fontSize: 13, letterSpacing: '0.1em' }}
        >
          No account yet? Begin.
        </Link>
      </div>
    </div>
  );
};

export default Login;
