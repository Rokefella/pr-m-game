import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AuthPlate, AuthField, authErrorMessage } from '@/components/AuthPlate';
import { Button } from '@/components/ui/button';

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
    });
    setSubmitting(false);
    if (err) {
      setError(authErrorMessage(err.message));
      return;
    }
    if (!data.user) {
      setError('Signup failed. Please try again.');
      return;
    }
    if (data.session === null) {
      setAwaitingConfirmation(true);
      return;
    }
    navigate('/intro');
  };

  return <AuthPlate heading="PRÆM" linkTo="/login" linkText="Already have an account?">
    {awaitingConfirmation ? <div className="auth-confirmation" role="status">
      <p className="font-fell italic">Check your email to confirm your account, then come back and log in.</p>
      <Button className="auth-submit font-cinzel" onClick={() => navigate('/login')}>GO TO LOGIN</Button>
    </div> : <form onSubmit={handleSubmit} className="auth-form">
      <AuthField id="email" label="EMAIL" value={email} onChange={setEmail} autoComplete="email" />
      <AuthField id="password" label="PASSWORD" value={password} onChange={setPassword} autoComplete="new-password" password />
      <AuthField id="confirm-password" label="CONFIRM PASSWORD" value={confirm} onChange={setConfirm} autoComplete="new-password" password />
      {error && <p role="alert" className="auth-error font-fell italic">{error}</p>}
      <Button type="submit" disabled={submitting} className="auth-submit font-cinzel">ENTER</Button>
    </form>}
  </AuthPlate>;
};

export default Signup;
