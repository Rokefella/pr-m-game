import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { fetchOrCreateUser, upsertUser } from '@/lib/userData';
import PlateFrame from '@/components/theme/PlateFrame';
import PlayerAvatar, { paletteFromColor } from '@/components/PlayerAvatar';

const NAME_RE = /^[A-Za-z0-9 _-]+$/;
export function nameError(raw: string): string | null {
  const name = raw.trim();
  if (name.length > 0 && !NAME_RE.test(name)) return 'Letters, numbers, space, _ and - only.';
  if (name.length < 3) return 'Use at least 3 characters.';
  if (name.length > 16) return 'Use at most 16 characters.';
  return null;
}

const ProfileSetup = () => {
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState(false);
  const [auraColor, setAuraColor] = useState('#5b4fd4');
  const [registration, setRegistration] = useState<number | null>(null);
  const [avatarSize] = useState(() => (window.innerHeight < 700 ? 80 : 96));
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const row = await fetchOrCreateUser(user.id);
        if (cancelled) return;
        if (row.aura_color) setAuraColor(row.aura_color);
        if (row.registration_number) setRegistration(row.registration_number);
      } catch (e) {
        console.error('[ProfileSetup] fetchOrCreateUser failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const error = nameError(username);
  const showError = username.trim().length > 0 && error !== null;
  const valid = error === null;

  const handleEnter = async () => {
    if (saving || !valid) return;
    if (loading || !user) return;
    setSaving(true);
    try {
      await upsertUser(user.id, { username: username.trim(), aura_color: auraColor });
      navigate('/village');
    } catch (e) {
      console.error('[ProfileSetup] save failed', e);
      setSaving(false);
    }
  };

  const isFirst = registration === 1;
  const palette = isFirst ? 'red' : paletteFromColor(auraColor, registration);
  const plate = registration ? `#${String(registration).padStart(4, '0')}` : '#----';

  return (
    <div
      className="flex flex-col items-center justify-center overflow-hidden"
      style={{
        height: '100dvh', backgroundColor: '#0e1228',
        backgroundImage: 'radial-gradient(rgba(142,153,208,0.07) 1px, transparent 1px)', backgroundSize: '16px 16px',
        padding: 'max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))',
      }}
    >
      <PlateFrame width="min(92vw, 360px)" glow="#b79bff">
        <div className="relative z-10 flex flex-col" style={{ padding: '24px 20px 20px' }}>
          <h1 className="font-cinzel text-center" style={{ fontSize: 18, fontWeight: 400, letterSpacing: '0.28em', color: '#b79bff', marginBottom: 14 }}>
            WHO ARE YOU?
          </h1>

          <div className="flex flex-col items-center" style={{ marginBottom: 16 }}>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
              <div aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '42%', width: avatarSize * 1.5, height: avatarSize * 1.5, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: `radial-gradient(circle, ${isFirst ? 'rgba(240,120,120,0.22)' : 'rgba(183,155,255,0.22)'} 0%, transparent 70%)` }} />
              <div style={{ position: 'relative' }}><PlayerAvatar size={avatarSize} palette={palette} walking={false} /></div>
            </div>
            <span className="font-mono" style={{ marginTop: 6, background: '#0f1329', border: '1px solid #8e99d0', fontSize: 11, padding: '3px 10px', letterSpacing: '0.15em', color: isFirst ? '#f5b0b0' : '#aab4e8' }}>
              {plate}
            </span>
          </div>

          <label htmlFor="praem-name" className="font-mono block" style={{ fontSize: 11, letterSpacing: '0.2em', color: '#8e99d0', marginBottom: 6 }}>
            NAME FOR THIS DIMENSION
          </label>
          <input
            id="praem-name"
            type="text"
            value={username}
            maxLength={16}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            onChange={(e) => setUsername(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleEnter(); }}
            className="font-mono w-full"
            style={{ height: 48, background: '#0f1329', border: `1px solid ${focused ? '#b79bff' : '#4a5385'}`, padding: '0 12px', fontSize: 16, color: '#e8e4ff', borderRadius: 0, outline: 'none' }}
          />
          <p className="font-mono" role={showError ? 'alert' : undefined} style={{ fontSize: 11, marginTop: 6, color: showError ? '#d07a6a' : '#8e99d0', minHeight: '2.6em', lineHeight: 1.3 }}>
            {showError ? error : '3 to 16 characters. Cannot be changed once you enter.'}
          </p>

          <div style={{ marginTop: 6, background: '#0f1329', border: '1px solid #2f3560', padding: '8px 12px' }}>
            <p className="font-mono" style={{ fontSize: 11, letterSpacing: '0.18em', color: '#aab4e8', whiteSpace: 'pre' }}>TITLE  -</p>
            <p className="font-mono" style={{ fontSize: 11, color: '#6a74b0', marginTop: 2 }}>earned, not chosen</p>
          </div>

          <button
            type="button"
            onClick={handleEnter}
            disabled={!valid || saving}
            className="font-cinzel w-full"
            style={{
              marginTop: 18, minHeight: 48, background: '#c8963a', color: '#1a1448', fontSize: 16, letterSpacing: '0.3em',
              borderTop: '3px solid #f5c060', borderBottom: '3px solid #8a6420', borderLeft: 'none', borderRight: 'none', borderRadius: 0,
              cursor: valid && !saving ? 'pointer' : 'not-allowed', opacity: valid && !saving ? 1 : 0.45,
            }}
          >
            {saving ? '…' : 'ENTER'}
          </button>
        </div>
      </PlateFrame>
    </div>
  );
};

export default ProfileSetup;
