import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AuthPlate, AuthField, authErrorMessage } from '@/components/AuthPlate';
import { Button } from '@/components/ui/button';
import { preloadWorld } from '@/lib/routePreload';

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
    void preloadWorld().catch(() => undefined);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (err) {
      setError(authErrorMessage(err.message));
      return;
    }
    navigate('/world');
  };

  return <AuthPlate heading="RETURN" linkTo="/signup" linkText="New to PRAEM?">
    <form onSubmit={handleSubmit} className="auth-form">
      <AuthField id="email" label="EMAIL" value={email} onChange={setEmail} autoComplete="email" />
      <AuthField id="password" label="PASSWORD" value={password} onChange={setPassword} autoComplete="current-password" password />
      {error && <p role="alert" className="auth-error font-fell italic">{error}</p>}
      <Button type="submit" disabled={submitting} className="auth-submit font-cinzel">ENTER</Button>
    </form>
  </AuthPlate>;
};

export default Login;
