import PraemSnake from './PraemSnake';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import PlateFrame from '@/components/theme/PlateFrame';
import { Button } from '@/components/ui/button';

export function authErrorMessage(message: string) {
  if (message === 'Invalid login credentials') return "Those details don't match.";
  if (message === 'User already registered') return 'That email already has an account.';
  if (message.toLowerCase().includes('at least 6')) return 'Use at least 6 characters.';
  return message;
}

export function AuthPlate({ heading, children, linkTo, linkText }: { heading: string; children: ReactNode; linkTo: string; linkText: string }) {
  return <main className="auth-screen">
    <div className="auth-stack">
      <PlateFrame width="min(92vw, 360px)" className="auth-plate">
        <div className="auth-logo"><PraemSnake size={64} /></div>
        <h1 className="auth-heading font-cinzel">{heading}</h1>
        {children}
      </PlateFrame>
      <Button asChild variant="link" className="auth-link font-mono"><Link to={linkTo}>{linkText}</Link></Button>
    </div>
  </main>;
}

export function AuthField({ id, label, value, onChange, autoComplete, password = false }: { id: string; label: string; value: string; onChange: (value: string) => void; autoComplete: string; password?: boolean }) {
  const [visible, setVisible] = useState(false);
  return <div className="auth-field">
    <label htmlFor={id} className="auth-label font-mono">{label}</label>
    <div className="auth-input-wrap">
      <input id={id} name={id} type={password ? (visible ? 'text' : 'password') : 'email'} required autoComplete={autoComplete} value={value} onChange={e => onChange(e.target.value)} className={`auth-input font-mono ${password ? 'auth-password' : ''}`} />
      {password && <Button type="button" variant="ghost" className="auth-toggle font-mono" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-controls={id} aria-pressed={visible} onClick={() => setVisible(v => !v)}>{visible ? 'HIDE' : 'SHOW'}</Button>}
    </div>
  </div>;
}