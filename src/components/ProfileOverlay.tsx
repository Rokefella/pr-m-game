import React, { useState } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const ProfileOverlay = ({ isOpen, onClose }: Props) => {
  const [mainTab, setMainTab] = useState<'profile' | 'quests'>('profile');
  const [questTab, setQuestTab] = useState<'active' | 'completed'>('active');

  if (!isOpen) return null;

  // Synchronous reads — no useEffect, no async
  const username = localStorage.getItem('praem_username') || 'Wanderer';
  const storedReg = localStorage.getItem('praem_registration_number');
  console.log('Registration number from localStorage:', storedReg);
  let regNum: string;
  if (storedReg && storedReg.trim() !== '') {
    regNum = storedReg.padStart(4, '0');
  } else {
    const playerId = localStorage.getItem('praem_player_id');
    regNum = playerId ? playerId.slice(-4).toUpperCase() : '????';
  }
  const auraColor = localStorage.getItem('praem_aura_color') || '#5b4fd4';
  const credits = localStorage.getItem('praem_credits') || '50';
  const steps = localStorage.getItem('praem_steps') || '100';
  const level = localStorage.getItem('praem_level') || '1';
  const title = localStorage.getItem('praem_title') || 'Wanderer';
  const fragmentsRaw = localStorage.getItem('praem_fragments');
  let fragmentCount = 0;
  try {
    fragmentCount = fragmentsRaw ? (JSON.parse(fragmentsRaw) as unknown[]).length : 0;
  } catch { fragmentCount = 0; }

  const b00 = localStorage.getItem('praem_bernard_00') === 'true';
  const b01 = localStorage.getItem('praem_bernard_01') === 'true';
  const b02 = localStorage.getItem('praem_bernard_02') === 'true';
  const b03 = localStorage.getItem('praem_bernard_03') === 'true';
  const b04 = localStorage.getItem('praem_bernard_04') === 'true';
  const b05 = localStorage.getItem('praem_bernard_05') === 'true';
  const b06 = localStorage.getItem('praem_bernard_06') === 'true';
  const subscribed = localStorage.getItem('praem_subscribed') === 'true';
  const subType = localStorage.getItem('praem_subscription_type') || '';
  const alexandraQuest = localStorage.getItem('praem_quest_find_alexandra');
  const alexandraActive = alexandraQuest === 'active';

  type Quest = { key: string; name: string; giver: string; status: string; gold?: boolean };

  const activeQuests: Quest[] = [];
  if (alexandraActive) activeQuests.push({ key: 'a-alexandra', name: 'Find Alexandra', giver: 'Bernard', status: 'She built the Instrument. She is still inside it. Find her.', gold: true });
  if (b02 && !b03) activeQuests.push({ key: 'a-blue', name: 'Find the Blue Door', giver: 'Bernard', status: 'Find the blue door inside the Instrument' });
  if (b03 && !b04) activeQuests.push({ key: 'a-frag', name: 'Find a fragment', giver: 'Bernard', status: 'Collect one fragment and return to Bernard' });
  if (b04 && !b05) activeQuests.push({ key: 'a-gold', name: 'Find the golden door', giver: 'Bernard', status: 'Collect all 5 fragments and find the golden door' });
  if (b05 && !b06) activeQuests.push({ key: 'a-return', name: 'Return to Bernard', giver: 'Bernard', status: 'Return to Bernard in the Village square' });

  const completedQuests: Quest[] = [];
  if (b00) completedQuests.push({ key: 'c-welcome', name: 'Welcome to the Village', giver: 'Bernard', status: 'Bernard welcomed you to the Village' });
  if (b01) completedQuests.push({ key: 'c-feet', name: 'Find your feet', giver: 'Bernard', status: 'You found the three buildings' });
  if (b03) completedQuests.push({ key: 'c-blue', name: 'Find the Blue Door', giver: 'Bernard', status: "You found Bernard's room" });
  if (b04) completedQuests.push({ key: 'c-frag', name: 'Find a fragment', giver: 'Bernard', status: 'Fragment collected. The instrument spoke.' });
  if (b06) completedQuests.push({ key: 'c-return', name: 'The return', giver: 'Bernard', status: 'You completed Level 1' });

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    background: 'rgba(100,80,160,0.08)',
    border: '0.5px solid rgba(100,80,160,0.3)',
    borderRadius: 'var(--border-radius-md)',
    padding: '10px 14px',
    marginBottom: 8,
  };

  const questNameStyle: React.CSSProperties = {
    margin: 0, fontSize: 13, color: 'rgba(200,185,255,0.95)', letterSpacing: '0.12em',
  };
  const giverStyle: React.CSSProperties = {
    margin: '2px 0 0', fontSize: 12, color: 'rgba(160,140,200,0.7)',
  };
  const statusStyle: React.CSSProperties = {
    margin: '4px 0 0', fontSize: 13, color: 'rgba(200,185,255,0.85)',
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
      <div style={{ position: 'relative', maxWidth: 520, margin: '0 auto', padding: '24px 20px 140px' }}>
        {/* Header */}
        <div className="font-mono" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'rgba(200,185,255,0.8)' }}>
          <span>{username}</span>
          <span>#{regNum}</span>
        </div>

        {/* Main tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 24, borderBottom: '0.5px solid rgba(100,80,160,0.2)' }}>
          {(['profile', 'quests'] as const).map((t) => {
            const active = mainTab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setMainTab(t)}
                className="font-cinzel"
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: active ? '1.5px solid #5b4fd4' : '1.5px solid transparent',
                  padding: '8px 20px',
                  fontSize: 13,
                  letterSpacing: '0.2em',
                  color: active ? '#e0ddd5' : 'rgba(160,140,200,0.5)',
                  cursor: 'pointer',
                  marginBottom: -1,
                }}
              >
                {t.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* PROFILE content */}
        {mainTab === 'profile' && (
          <div style={{ marginTop: 8 }}>
            <p className="font-cinzel" style={{ textAlign: 'center', fontSize: 36, color: '#c8963a', margin: '24px 0 0' }}>
              #{regNum}
            </p>
            <p className="font-cinzel" style={{ textAlign: 'center', fontSize: 18, color: 'rgba(200,185,255,0.9)', margin: '8px 0 0', letterSpacing: '0.18em' }}>
              LEVEL {level}
            </p>

            <div
              style={{
                display: 'flex', justifyContent: 'space-around',
                marginTop: 24, paddingTop: 16, paddingBottom: 16,
                borderTop: '0.5px solid rgba(100,80,160,0.2)',
                borderBottom: '0.5px solid rgba(100,80,160,0.2)',
              }}
            >
              {[
                { label: 'CREDITS', value: credits, color: '#c8963a' },
                { label: 'STEPS', value: steps, color: '#e0ddd5' },
                { label: 'FRAGMENTS', value: `${fragmentCount}/5`, color: '#5b4fd4' },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div className="font-mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(200,185,255,0.6)' }}>{s.label}</div>
                  <div className="font-mono" style={{ fontSize: 16, color: s.color, marginTop: 4 }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <div className="font-mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(200,185,255,0.6)' }}>TITLE</div>
              <div className="font-cinzel" style={{ fontSize: 14, color: 'rgba(200,185,255,0.9)', marginTop: 6, letterSpacing: '0.2em' }}>
                {title.toUpperCase()}
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div className="font-cinzel" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(160,140,200,0.4)' }}>
                DIMENSION
              </div>
              <div
                aria-label="Dimension"
                style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: auraColor,
                  boxShadow: `0 0 6px ${auraColor}99`,
                }}
              />
            </div>

            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
              {subscribed ? (
                <span className="font-cinzel" style={{ fontSize: 10, letterSpacing: '0.22em', color: 'rgba(160,140,200,0.4)' }}>
                  {(subType || 'monthly').toUpperCase()} MEMBER
                </span>
              ) : (
                <button
                  type="button"
                  className="font-cinzel"
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new CustomEvent('praem:open-paywall'));
                  }}
                  style={{
                    fontSize: 11, letterSpacing: '0.22em', color: '#c8963a',
                    border: '0.5px solid #c8963a', background: 'transparent',
                    padding: '8px 20px', cursor: 'pointer',
                  }}
                >
                  SUBSCRIBE
                </button>
              )}
            </div>
          </div>
        )}

        {/* QUESTS content */}
        {mainTab === 'quests' && (
          <div style={{ marginTop: 16 }}>
            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: 4, borderBottom: '0.5px solid rgba(100,80,160,0.15)' }}>
              {(['active', 'completed'] as const).map((t) => {
                const active = questTab === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setQuestTab(t)}
                    className="font-cinzel"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: active ? '1px solid #5b4fd4' : '1px solid transparent',
                      padding: '6px 16px',
                      fontSize: 11,
                      letterSpacing: '0.2em',
                      color: active ? '#e0ddd5' : 'rgba(160,140,200,0.4)',
                      cursor: 'pointer',
                      marginBottom: -1,
                    }}
                  >
                    {t.toUpperCase()}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 16 }}>
              {questTab === 'active' && (
                activeQuests.length === 0 ? (
                  <p className="font-fell italic" style={{ textAlign: 'center', fontSize: 14, color: 'rgba(200,185,255,0.4)', margin: '32px 0' }}>
                    No active quests.
                  </p>
                ) : (
                  activeQuests.map((q) => (
                    <div key={q.key} style={cardStyle}>
                      <span
                        style={{
                          position: 'absolute', top: 12, right: 12,
                          width: 6, height: 6, borderRadius: '50%',
                          background: '#5b4fd4',
                          boxShadow: '0 0 6px #5b4fd4',
                        }}
                      />
                      <p className="font-cinzel" style={questNameStyle}>{q.name.toUpperCase()}</p>
                      <p className="font-fell italic" style={giverStyle}>Given by {q.giver}</p>
                      <p className="font-fell italic" style={statusStyle}>{q.status}</p>
                    </div>
                  ))
                )
              )}

              {questTab === 'completed' && (
                completedQuests.length === 0 ? (
                  <p className="font-fell italic" style={{ textAlign: 'center', fontSize: 14, color: 'rgba(200,185,255,0.4)', margin: '32px 0' }}>
                    Nothing completed yet.
                  </p>
                ) : (
                  completedQuests.map((q) => (
                    <div key={q.key} style={{ ...cardStyle, opacity: 0.5 }}>
                      <span
                        className="font-cinzel"
                        style={{
                          position: 'absolute', top: 8, right: 12,
                          color: '#c8963a', fontSize: 14,
                        }}
                      >
                        ✓
                      </span>
                      <p className="font-cinzel" style={questNameStyle}>{q.name.toUpperCase()}</p>
                      <p className="font-fell italic" style={giverStyle}>Given by {q.giver}</p>
                      <p className="font-fell italic" style={statusStyle}>{q.status}</p>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* LEAVE button */}
      <button
        type="button"
        onClick={onClose}
        className="font-cinzel"
        style={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 14,
          letterSpacing: '0.25em',
          color: '#e0ddd5',
          padding: '12px 32px',
          border: '0.5px solid rgba(200,185,255,0.4)',
          background: 'transparent',
          cursor: 'pointer',
          zIndex: 160,
        }}
      >
        LEAVE
      </button>
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

export default React.memo(ProfileOverlay, (prev, next) => prev.isOpen === next.isOpen);
