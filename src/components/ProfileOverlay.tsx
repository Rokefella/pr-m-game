import { useEffect, useMemo, useState } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const TITLES_BY_LEVEL: Record<number, string> = {
  1: 'Wanderer',
  2: 'Seeker',
  3: 'Initiate',
};

type Quest = {
  key: string;
  name: string;
  giver: string;
  status: string;
  dimension: 'purple' | 'amber' | 'teal';
};

const dimensionColor = (d: Quest['dimension']) =>
  d === 'purple' ? '#a98cff' : d === 'amber' ? '#c8943a' : '#1a9e7a';

const readBool = (k: string) => typeof window !== 'undefined' && window.localStorage.getItem(k) === 'true';
const readStr = (k: string) => (typeof window !== 'undefined' ? window.localStorage.getItem(k) : null);
const readInt = (k: string, fallback = 0) => {
  const v = readStr(k);
  if (v === null) return fallback;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
};

const ProfileOverlay = ({ isOpen, onClose }: Props) => {
  const [tab, setTab] = useState<'profile' | 'quests'>('profile');
  const [titleVersion, setTitleVersion] = useState(0);

  // Re-read storage each open
  const data = useMemo(() => {
    if (!isOpen) return null;
    const username = readStr('praem_username') || 'Wanderer';
    const reg = readInt('praem_registration_number', 0);
    const level = readInt('praem_level', 1);
    const credits = readInt('praem_credits', 0);
    const steps = readInt('praem_steps', 0);
    const fragments = (() => {
      try {
        return (JSON.parse(readStr('praem_fragments') || '[]') as number[]).length;
      } catch { return 0; }
    })();
    const title = readStr('praem_title') || TITLES_BY_LEVEL[level] || 'Wanderer';
    const aura = readStr('praem_aura_color') || '#5b4fd4';
    const unlocked = (() => {
      try {
        const arr = JSON.parse(readStr('praem_unlocked_titles') || '[]') as string[];
        if (Array.isArray(arr) && arr.length) return arr;
      } catch { /* ignore */ }
      return [TITLES_BY_LEVEL[level] || 'Wanderer'];
    })();

    const f00 = readBool('praem_bernard_00');
    const f01 = readBool('praem_bernard_01');
    const f02 = readBool('praem_bernard_02');
    const f03 = readBool('praem_bernard_03');
    const f04 = readBool('praem_bernard_04');
    const f05 = readBool('praem_bernard_05');
    const f06 = readBool('praem_bernard_06');

    const active: Quest[] = [];
    if (f02 && !f03) active.push({ key: 'q-blue', name: 'Find the blue door', giver: 'Bernard', status: 'Find the blue door inside the Instrument', dimension: 'purple' });
    if (f03 && !f04) active.push({ key: 'q-frag', name: 'Find a fragment', giver: 'Bernard', status: 'Collect one fragment and return to Bernard in his room', dimension: 'purple' });
    if (f04 && !f05) active.push({ key: 'q-gold', name: 'Find the golden door', giver: 'Bernard', status: 'Collect all 5 fragments and find the golden door', dimension: 'purple' });
    if (f05 && !f06) active.push({ key: 'q-return', name: 'Return to Bernard', giver: 'Bernard', status: 'Return to Bernard in the Village square', dimension: 'purple' });

    const completed: Quest[] = [];
    if (f00) completed.push({ key: 'c-welcome', name: 'Welcome to the Village', giver: 'Bernard', status: 'Bernard welcomed you to the Village', dimension: 'purple' });
    if (f01) completed.push({ key: 'c-feet', name: 'Find your feet', giver: 'Bernard', status: 'You found the three buildings', dimension: 'purple' });
    if (f03) completed.push({ key: 'c-blue', name: 'Find the blue door', giver: 'Bernard', status: "You found Bernard's room", dimension: 'purple' });
    if (f04) completed.push({ key: 'c-frag', name: 'Find a fragment', giver: 'Bernard', status: 'Fragment collected. The instrument spoke.', dimension: 'purple' });
    if (f06) completed.push({ key: 'c-return', name: 'The return', giver: 'Bernard', status: 'You completed Level 1 and returned to Bernard', dimension: 'purple' });

    return { username, reg, level, credits, steps, fragments, title, aura, unlocked, active, completed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, titleVersion]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  const selectTitle = (t: string) => {
    window.localStorage.setItem('praem_title', t);
    setTitleVersion((v) => v + 1);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 150,
        background: '#04040a',
        overflow: 'auto',
      }}
    >
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'linear-gradient(rgba(100,80,160,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(100,80,160,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', maxWidth: 520, margin: '0 auto', padding: '24px 20px 60px' }}>
        {/* Header */}
        <div className="font-mono" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'rgba(160,140,200,0.7)' }}>
          <span>{data.username}</span>
          <span>#{String(data.reg).padStart(4, '0')}</span>
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="font-cinzel"
          aria-label="Close"
          style={{
            position: 'absolute', top: 18, right: 18,
            background: 'transparent', border: 'none',
            color: 'rgba(160,140,200,0.5)', fontSize: 16,
            cursor: 'pointer', padding: 6,
          }}
        >
          ×
        </button>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 24, borderBottom: '0.5px solid rgba(100,80,160,0.2)' }}>
          {(['profile', 'quests'] as const).map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="font-cinzel"
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: active ? '1px solid #5b4fd4' : '1px solid transparent',
                  padding: '8px 20px',
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  color: active ? 'rgba(160,140,200,0.9)' : 'rgba(160,140,200,0.4)',
                  cursor: 'pointer',
                  marginBottom: -1,
                }}
              >
                {t.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {tab === 'profile' && (
          <div style={{ marginTop: 8 }}>
            <p className="font-cinzel" style={{ textAlign: 'center', fontSize: 32, color: '#c8963a', margin: '24px 0 0' }}>
              #{String(data.reg).padStart(4, '0')}
            </p>
            <p className="font-cinzel" style={{ textAlign: 'center', fontSize: 18, color: 'rgba(160,140,200,0.8)', margin: '8px 0 0', letterSpacing: '0.18em' }}>
              LEVEL {data.level}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 24, paddingTop: 16, borderTop: '0.5px solid rgba(100,80,160,0.2)', borderBottom: '0.5px solid rgba(100,80,160,0.2)', paddingBottom: 16 }}>
              {[
                { label: 'CREDITS', value: data.credits, color: '#c8963a' },
                { label: 'STEPS', value: data.steps, color: '#e0ddd5' },
                { label: 'FRAGMENTS', value: `${data.fragments}/5`, color: '#5b4fd4' },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div className="font-mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(160,140,200,0.5)' }}>{s.label}</div>
                  <div className="font-mono" style={{ fontSize: 16, color: s.color, marginTop: 4 }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Title */}
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <div className="font-mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(160,140,200,0.5)' }}>TITLE</div>
              <div className="font-cinzel" style={{ fontSize: 14, color: 'rgba(160,140,200,0.6)', marginTop: 4, letterSpacing: '0.2em' }}>
                {data.title.toUpperCase()}
              </div>
              {data.unlocked.length > 1 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                  {data.unlocked.map((t) => {
                    const sel = t === data.title;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => selectTitle(t)}
                        className="font-cinzel"
                        style={{
                          fontSize: 9, letterSpacing: '0.18em',
                          padding: '6px 12px',
                          background: sel ? 'rgba(91,79,212,0.15)' : 'transparent',
                          border: `0.5px solid ${sel ? '#5b4fd4' : 'rgba(100,80,160,0.3)'}`,
                          color: sel ? 'rgba(160,140,200,0.9)' : 'rgba(160,140,200,0.5)',
                          cursor: 'pointer',
                        }}
                      >
                        {t.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Aura */}
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div className="font-mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(160,140,200,0.5)' }}>AURA</div>
              <div
                style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: data.aura,
                  boxShadow: `0 0 10px ${data.aura}`,
                }}
              />
            </div>
          </div>
        )}

        {tab === 'quests' && (
          <div style={{ marginTop: 24 }}>
            <p className="font-cinzel" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(160,140,200,0.4)', margin: '0 0 8px' }}>
              ACTIVE
            </p>
            {data.active.length === 0 ? (
              <p className="font-fell italic" style={{ textAlign: 'center', fontSize: 14, color: 'rgba(160,140,200,0.3)', margin: '24px 0' }}>
                No active quests.
              </p>
            ) : (
              data.active.map((q) => (
                <div
                  key={q.key}
                  style={{
                    position: 'relative',
                    background: 'rgba(100,80,160,0.06)',
                    border: '0.5px solid rgba(100,80,160,0.2)',
                    padding: '10px 12px',
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute', top: 12, right: 12,
                      width: 6, height: 6, borderRadius: '50%',
                      background: dimensionColor(q.dimension),
                      boxShadow: `0 0 6px ${dimensionColor(q.dimension)}`,
                    }}
                  />
                  <p className="font-cinzel" style={{ margin: 0, fontSize: 11, letterSpacing: '0.15em', color: 'rgba(160,140,200,0.9)' }}>
                    {q.name.toUpperCase()}
                  </p>
                  <p className="font-fell italic" style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(160,140,200,0.5)' }}>
                    Given by {q.giver}
                  </p>
                  <p className="font-fell italic" style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(160,140,200,0.7)' }}>
                    {q.status}
                  </p>
                </div>
              ))
            )}

            <p className="font-cinzel" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(160,140,200,0.4)', margin: '24px 0 8px' }}>
              COMPLETED
            </p>
            {data.completed.length === 0 ? (
              <p className="font-fell italic" style={{ textAlign: 'center', fontSize: 14, color: 'rgba(160,140,200,0.3)', margin: '24px 0' }}>
                Nothing completed yet.
              </p>
            ) : (
              data.completed.map((q) => (
                <div
                  key={q.key}
                  style={{
                    position: 'relative',
                    background: 'rgba(100,80,160,0.04)',
                    border: '0.5px solid rgba(100,80,160,0.1)',
                    padding: '10px 12px',
                    marginBottom: 8,
                    opacity: 0.7,
                  }}
                >
                  <span
                    className="font-cinzel"
                    style={{
                      position: 'absolute', top: 8, right: 12,
                      color: '#c8963a', fontSize: 14,
                    }}
                  >
                    ✓
                  </span>
                  <p className="font-cinzel" style={{ margin: 0, fontSize: 11, letterSpacing: '0.15em', color: 'rgba(160,140,200,0.5)' }}>
                    {q.name.toUpperCase()}
                  </p>
                  <p className="font-fell italic" style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(160,140,200,0.4)' }}>
                    Given by {q.giver}
                  </p>
                  <p className="font-fell italic" style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(160,140,200,0.5)' }}>
                    {q.status}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const ProfileButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Open profile"
    className="font-cinzel"
    style={{
      width: 24, height: 24, borderRadius: '50%',
      background: 'rgba(91,79,212,0.2)',
      border: '0.5px solid rgba(91,79,212,0.4)',
      color: 'rgba(160,140,200,0.8)',
      fontSize: 10,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', padding: 0,
      letterSpacing: 0,
    }}
  >
    P
  </button>
);

export default ProfileOverlay;
