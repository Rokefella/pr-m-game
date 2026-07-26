import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { updateUser } from '@/lib/userData';
import { getFlag } from '@/lib/questFlags';
import Avatar from '@/components/Avatar';



type Props = {
  isOpen: boolean;
  onClose: () => void;
  context?: 'village' | 'maze';
  runProgress?: { collected: number; required: number };
};

type SubStatus = 'dev' | 'trial' | 'active' | 'lifetime' | 'beta' | 'expired' | string;

type AccountUserRow = {
  username: string | null;
  credits: number;
  steps_remaining: number;
  registration_number: number | null;
  subscription_status: SubStatus;
  subscription_tier: string | null;
  trial_end: string | null;
  title: string | null;
  unlocked_titles: string[] | null;
  aura_color: string | null;
  level: number;
  avatar_hat: string | null;
  avatar_body: string | null;
  avatar_head: string | null;
};

const ProfileOverlay = ({ isOpen, onClose, context = 'village', runProgress }: Props) => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mainTab, setMainTab] = useState<'profile' | 'quests' | 'account' | 'growth' | 'folder'>('profile');
  const [growthOpen, setGrowthOpen] = useState<{ social: boolean; perception: boolean; trade: boolean }>({ social: false, perception: false, trade: false });
  const [folderFragments, setFolderFragments] = useState<Array<{ id: string; prime_number: number }>>([]);
  const [folderTooltip, setFolderTooltip] = useState<string | null>(null);
  const [questTab, setQuestTab] = useState<'active' | 'completed'>('active');
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());

  // Account tab state
  const [accountRow, setAccountRow] = useState<AccountUserRow | null>(null);
  const [emailForm, setEmailForm] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [nameForm, setNameForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameStep, setNameStep] = useState<'input' | 'confirm'>('input');
  const [nameMsg, setNameMsg] = useState('');
  const [nameMsgColor, setNameMsgColor] = useState('rgba(160,140,200,0.5)');
  const [deleteForm, setDeleteForm] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');
  const [titleDropdownOpen, setTitleDropdownOpen] = useState(false);

  // Reset expanded groups whenever the overlay closes
  useEffect(() => {
    if (!isOpen) {
      setOpenGroups(new Set());
      setEmailForm(false); setEmailMsg('');
      setPasswordMsg('');
      setNameForm(false); setNewName(''); setNameStep('input'); setNameMsg('');
      setDeleteForm(false); setDeleteText(''); setDeleteMsg('');
    }
  }, [isOpen]);

  // Fetch account data when overlay opens
  useEffect(() => {
    if (!isOpen || !user) return;
    let cancelled = false;
    supabase
      .from('users')
      .select('username, credits, steps_remaining, registration_number, subscription_status, subscription_tier, trial_end, title, unlocked_titles, aura_color, level, avatar_hat, avatar_body, avatar_head')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setAccountRow(data as AccountUserRow);
      });
    return () => { cancelled = true; };
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen || !user) return;
    let cancelled = false;

    console.log('[Folder] fetching, user:', user?.id,
      'isOpen:', isOpen,
      'token:', !!localStorage.getItem('praem-auth-token'));

    const tokenRaw = localStorage.getItem('praem-auth-token');
    if (!tokenRaw) return;
    const accessToken = JSON.parse(tokenRaw).access_token;
    if (!accessToken) return;

    fetch(
      `https://jngofylkynipsnzyyzdq.supabase.co/rest/v1/fragments?select=id%2Cprime_number%2Ccollected_at&user_id=eq.${encodeURIComponent(user.id)}&order=collected_at.desc`,
      {
        headers: {
          apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZ29meWxreW5pcHNuenl5emRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NjIzNDEsImV4cCI6MjA5MjUzODM0MX0.FWvc_DwabUSkxgHVwKRA3T2SMTlQ7aQr12a7yGUEW64',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setFolderFragments(Array.isArray(data) ? data : []);
      })
      .catch((e) => console.error('[Folder] fetch error', e));
    return () => { cancelled = true; };
  }, [isOpen, user]);

  

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
  const level = String(accountRow?.level ?? 1);
  const titleRaw = localStorage.getItem('praem_title');
  const title = titleRaw && titleRaw.trim() !== '' ? titleRaw : '';
  const fragmentCount = folderFragments.length;
  const fragmentDisplayValue =
    context === 'maze' && runProgress
      ? `${runProgress.collected}/${runProgress.required}`
      : `${fragmentCount}`;

  const stage = parseInt(getFlag('bernard_stage') ?? '0', 10);
  const alexandraActive = getFlag('alexandra_quest') === 'active';
  const subscribed = accountRow ? ['active','lifetime','dev','beta'].includes(accountRow.subscription_status) : false;
  const subType = accountRow?.subscription_tier ?? '';


  // Subscription display mapping
  const subStatus: SubStatus = accountRow?.subscription_status ?? 'expired';
  const trialDays = (() => {
    if (!accountRow?.trial_end) return 0;
    const end = new Date(accountRow.trial_end);
    const diff = end.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();
  const subDisplay = (() => {
    switch (subStatus) {
      case 'dev': return { text: 'DEV ACCESS', color: '#c8963a' };
      case 'trial': return { text: `TRIAL — ${trialDays} DAYS REMAINING`, color: 'rgba(160,140,200,0.7)' };
      case 'active': return { text: 'SUBSCRIBED', color: '#c8963a' };
      case 'lifetime': return { text: 'FOUNDING MEMBER', color: '#c8963a' };
      case 'beta': return { text: 'BETA ACCESS', color: 'rgba(160,140,200,0.7)' };
      case 'expired': return { text: 'NOT SUBSCRIBED', color: 'rgba(160,140,200,0.3)' };
      default: return { text: 'NOT SUBSCRIBED', color: 'rgba(160,140,200,0.3)' };
    }
  })();

  type Quest = { key: string; name: string; giver: string; status: string; gold?: boolean };

  const activeQuests: Quest[] = [];
  if (alexandraActive) activeQuests.push({ key: 'a-alexandra', name: 'The One Who Was Here Before', giver: 'Bernard', status: 'Someone was here before. Follow it far enough and you will find them.', gold: true });
  if (stage === 0) activeQuests.push({ key: 'a-find-bernard', name: 'Find Bernard', giver: 'Bernard', status: 'Seek out Bernard in the Village square.' });
  if (stage === 1) activeQuests.push({ key: 'a-blue', name: 'Find the Blue Door', giver: 'Bernard', status: 'Find the blue door inside the Instrument.' });
  if (stage === 2) activeQuests.push({ key: 'a-frag', name: 'Find a fragment', giver: 'Bernard', status: 'Collect one fragment and return to Bernard.' });
  if (stage === 3) activeQuests.push({ key: 'a-gold', name: 'Find the golden door', giver: 'Bernard', status: 'Collect all 5 fragments and find the golden door.' });
  if (stage === 4) activeQuests.push({ key: 'a-return', name: 'Return to Bernard', giver: 'Bernard', status: 'Return to Bernard in the Village square.' });

  const completedQuests: Quest[] = [];
  if (stage >= 1) completedQuests.push({ key: 'c-welcome', name: 'Welcome to the Village', giver: 'Bernard', status: 'Bernard welcomed you to the Village.' });
  if (stage >= 2) completedQuests.push({ key: 'c-blue', name: 'Find the Blue Door', giver: 'Bernard', status: "You found Bernard's room." });
  if (stage >= 3) completedQuests.push({ key: 'c-frag', name: 'Find a fragment', giver: 'Bernard', status: 'Fragment collected. The instrument spoke.' });
  if (stage >= 4) completedQuests.push({ key: 'c-gold', name: 'Find the golden door and Shadow Realm', giver: 'Bernard', status: 'You found the golden door.' });
  if (stage >= 5) completedQuests.push({ key: 'c-return', name: 'The return', giver: 'Bernard', status: 'You returned to Bernard. Wanderer title granted.' });


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

  // Account tab styles
  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: undefined,
    fontSize: 11,
    letterSpacing: '0.2em',
    color: 'rgba(160,140,200,0.4)',
    margin: 0,
  };
  const valueStyle: React.CSSProperties = {
    fontSize: 13,
    color: 'rgba(200,185,255,0.9)',
    marginTop: 6,
  };
  const ghostBtn: React.CSSProperties = {
    fontSize: 13,
    letterSpacing: '0.2em',
    color: 'rgba(160,140,200,0.6)',
    background: 'transparent',
    border: '0.5px solid rgba(160,140,200,0.2)',
    padding: '8px 16px',
    cursor: 'pointer',
    marginTop: 10,
  };
  const redGhostBtn: React.CSSProperties = {
    ...ghostBtn,
    border: '0.5px solid rgba(200,80,80,0.2)',
    color: 'rgba(200,80,80,0.4)',
  };
  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(160,140,200,0.3)',
    color: '#e0ddd5',
    fontStyle: 'italic',
    fontSize: 13,
    borderRadius: 0,
    padding: '4px 0',
    width: '100%',
    outline: 'none',
    marginTop: 10,
  };
  const msgStyle: React.CSSProperties = {
    fontSize: 13,
    color: 'rgba(160,140,200,0.5)',
    marginTop: 8,
  };

  const handleSendEmailChangeLink = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.updateUser({ email: user.email });
    if (error) {
      setEmailMsg(error.message);
    } else {
      setEmailMsg('Check your inbox.');
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
    if (error) {
      setPasswordMsg(error.message);
    } else {
      setPasswordMsg('A reset link has been sent to your email.');
    }
  };

  const handleConfirmName = async () => {
    if (!user || !accountRow) return;
    if ((accountRow.credits ?? 0) < 10000) {
      setNameMsg('Insufficient credits.');
      setNameMsgColor('rgba(200,80,80,0.4)');
      return;
    }
    await updateUser(user.id, {
      credits: accountRow.credits - 10000,
      username: newName,
    });
    setAccountRow({ ...accountRow, credits: accountRow.credits - 10000, username: newName });
    localStorage.setItem('praem_username', newName);
    setNameMsg('Name changed.');
    setNameMsgColor('rgba(160,140,200,0.5)');
    setNameStep('input');
    setNewName('');
    setNameForm(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleDeleteConfirm = async () => {
    if (deleteText !== 'DELETE') return;
    await supabase.auth.signOut();
    setDeleteMsg('Contact support to complete deletion.');
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 150,
        background: '#04040a',
        overflow: 'auto',
        display: isOpen ? 'block' : 'none',
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
          <span>{accountRow?.username && accountRow.username.trim() !== '' ? accountRow.username : `#${regNum}`}</span>
          <span>#{regNum}</span>
        </div>

        {/* Main tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 24, borderBottom: '0.5px solid rgba(100,80,160,0.2)' }}>
          {(['profile', 'growth', 'quests', 'folder', 'account'] as const).map((t) => {
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
                  padding: '8px 0',
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 10,
                  letterSpacing: '0.15em',
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
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <Avatar
                view="front"
                hat={accountRow?.avatar_hat ?? 'none'}
                body={accountRow?.avatar_body ?? 'default'}
                head={accountRow?.avatar_head ?? 'default'}
                auraColor={accountRow?.aura_color ?? '#5b4fd4'}
                size={150}
              />
            </div>
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
                { label: 'FRAGMENTS', value: fragmentDisplayValue, color: '#5b4fd4' },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div className="font-mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(200,185,255,0.6)' }}>{s.label}</div>
                  <div className="font-mono" style={{ fontSize: 16, color: s.color, marginTop: 4 }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div
              style={{ marginTop: 24, textAlign: 'center' }}
              ref={(el) => {
                // attach outside-click handler via data attr; handled below
              }}
            >
              <div className="font-mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(200,185,255,0.6)' }}>TITLE</div>
              {(() => {
                const titles = accountRow?.unlocked_titles ?? [];
                const hasMultiple = titles.length >= 2;
                const titleColor = 'rgba(200,185,255,0.9)';
                return (
                  <>
                    <div
                      className="font-cinzel"
                      onClick={() => { if (hasMultiple) setTitleDropdownOpen((v) => !v); }}
                      style={{
                        fontSize: 14,
                        color: titleColor,
                        marginTop: 6,
                        letterSpacing: '0.2em',
                        cursor: hasMultiple ? 'pointer' : 'default',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {accountRow?.title ?? '—'}
                      {hasMultiple && (
                        <span style={{ fontSize: 10, color: titleColor }}>▾</span>
                      )}
                    </div>
                    {hasMultiple && titleDropdownOpen && (
                      <>
                        <div
                          onClick={() => setTitleDropdownOpen(false)}
                          style={{ position: 'fixed', inset: 0, zIndex: 200 }}
                        />
                        <div
                          style={{ position: 'relative', zIndex: 201, marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {titles.map((t) => {
                            const isActive = t === accountRow?.title;
                            return (
                              <div
                                key={t}
                                className="font-cinzel"
                                onClick={async () => {
                                  if (!user) return;
                                  await supabase.from('users').update({ title: t }).eq('id', user.id);
                                  setAccountRow((prev) => prev ? { ...prev, title: t } : prev);
                                  setTitleDropdownOpen(false);
                                }}
                                style={{
                                  fontSize: 14,
                                  letterSpacing: '0.2em',
                                  color: isActive ? '#c8963a' : 'rgba(160,140,200,0.6)',
                                  padding: '6px 0',
                                  cursor: 'pointer',
                                }}
                              >
                                {t}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>


            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div className="font-cinzel" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(160,140,200,0.4)' }}>
                DIMENSION
              </div>
              <div
                aria-label="Dimension"
                style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: accountRow?.aura_color ?? '#5b4fd4',
                  boxShadow: `0 0 6px ${(accountRow?.aura_color ?? '#5b4fd4')}99`,
                }}
              />
            </div>

            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
              {subStatus === 'dev' ? (
                <span className="font-cinzel" style={{ fontSize: 10, letterSpacing: '0.22em', color: '#c8963a' }}>
                  DEV ACCESS
                </span>
              ) : subscribed ? (
                <span className="font-cinzel" style={{ fontSize: 10, letterSpacing: '0.22em', color: 'rgba(160,140,200,0.4)' }}>
                  {(subType || 'monthly').toUpperCase()} MEMBER
                </span>
              ) : (
                <span className="font-cinzel" style={{ fontSize: 10, letterSpacing: '0.22em', color: 'rgba(160,140,200,0.4)' }}>
                  NOT SUBSCRIBED
                </span>
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
              {(() => {
                const list = questTab === 'active' ? activeQuests : completedQuests;
                const alexandra = questTab === 'active'
                  ? list.find((q) => q.gold)
                  : undefined;
                const rest = list.filter((q) => !q.gold);

                const groups = new Map<string, Quest[]>();
                rest.forEach((q) => {
                  const arr = groups.get(q.giver) ?? [];
                  arr.push(q);
                  groups.set(q.giver, arr);
                });
                const groupNames = Array.from(groups.keys());

                const toggleGroup = (name: string) => {
                  setOpenGroups((prev) => {
                    const next = new Set(prev);
                    if (next.has(name)) next.delete(name);
                    else next.add(name);
                    return next;
                  });
                };

                const renderQuestCard = (q: Quest, completed: boolean) => (
                  <div
                    key={q.key}
                    style={{ ...cardStyle, marginLeft: 12, ...(completed ? { opacity: 0.5 } : {}) }}
                  >
                    {completed ? (
                      <span
                        className="font-cinzel"
                        style={{ position: 'absolute', top: 8, right: 12, color: '#c8963a', fontSize: 14 }}
                      >
                        ✓
                      </span>
                    ) : (
                      <span
                        style={{
                          position: 'absolute', top: 12, right: 12,
                          width: 6, height: 6, borderRadius: '50%',
                          background: '#5b4fd4',
                          boxShadow: '0 0 6px #5b4fd4',
                        }}
                      />
                    )}
                    <p className="font-cinzel" style={questNameStyle}>{q.name.toUpperCase()}</p>
                    <p className="font-fell italic" style={giverStyle}>Given by {q.giver}</p>
                    <p className="font-fell italic" style={statusStyle}>{q.status}</p>
                  </div>
                );

                return (
                  <>
                    {alexandra && (
                      <div
                        style={{
                          ...cardStyle,
                          background: 'rgba(200,150,58,0.06)',
                          border: '0.5px solid rgba(200,150,58,0.3)',
                          marginBottom: 16,
                        }}
                      >
                        <p
                          className="font-cinzel"
                          style={{ margin: 0, fontSize: 8, letterSpacing: '0.2em', color: 'rgba(200,150,58,0.4)' }}
                        >
                          PRIMARY QUEST
                        </p>
                        <p
                          className="font-cinzel"
                          style={{ ...questNameStyle, color: '#c8963a', marginTop: 4 }}
                        >
                          {alexandra.name.toUpperCase()}
                        </p>
                        <p
                          className="font-fell italic"
                          style={{ ...giverStyle, color: 'rgba(160,140,200,0.6)' }}
                        >
                          Given by {alexandra.giver}
                        </p>
                        <p className="font-fell italic" style={statusStyle}>{alexandra.status}</p>
                      </div>
                    )}

                    {groupNames.length === 0 ? (
                      <p
                        className="font-fell italic"
                        style={{ textAlign: 'center', fontSize: 13, color: 'rgba(160,140,200,0.4)', margin: '24px 0' }}
                      >
                        {questTab === 'active' ? 'No other active quests.' : 'Nothing completed yet.'}
                      </p>
                    ) : (
                      groupNames.map((name) => {
                        const expanded = openGroups.has(name);
                        const items = groups.get(name)!;
                        return (
                          <div key={name} style={{ marginBottom: 10 }}>
                            <button
                              type="button"
                              onClick={() => toggleGroup(name)}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'rgba(100,80,160,0.06)',
                                border: '0.5px solid rgba(100,80,160,0.15)',
                                borderRadius: 'var(--border-radius-md)',
                                padding: '10px 14px',
                                cursor: 'pointer',
                              }}
                            >
                              <span
                                className="font-cinzel"
                                style={{ fontSize: 12, letterSpacing: '0.15em', color: 'rgba(200,185,255,0.9)' }}
                              >
                                {name.toUpperCase()}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span className="font-mono" style={{ fontSize: 10, color: 'rgba(160,140,200,0.5)' }}>
                                  {items.length} quest{items.length === 1 ? '' : 's'}
                                </span>
                                <span style={{ fontSize: 10, color: 'rgba(160,140,200,0.5)' }}>
                                  {expanded ? '▲' : '▼'}
                                </span>
                              </span>
                            </button>
                            {expanded && (
                              <div style={{ marginTop: 8 }}>
                                {items.map((q) => renderQuestCard(q, questTab === 'completed'))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* FOLDER content */}
        {mainTab === 'folder' && (() => {
          const count = folderFragments.length;
          const cells = Array.from({ length: 20 }, (_, i) => folderFragments[i] || null);
          return (
            <div style={{ marginTop: 24 }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 }}>
                <span className="font-cinzel" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'rgba(160,140,200,0.4)' }}>FOLDER</span>
                <span className="font-cinzel" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'rgba(160,140,200,0.4)' }}>{count} / 20</span>
              </div>

              {/* Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 60px)', gap: 8, justifyContent: 'center' }}>
                {cells.map((frag, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'relative',
                      width: 60,
                      height: 60,
                      border: frag
                        ? '1px solid rgba(167,139,250,0.4)'
                        : '1px dashed rgba(160,140,200,0.08)',
                      background: frag ? 'rgba(107,70,193,0.3)' : 'transparent',
                      cursor: frag ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onClick={() => frag && setFolderTooltip(folderTooltip === frag.id ? null : frag.id)}
                  >
                    {frag && (
                      <span
                        className="font-cinzel"
                        style={{ fontSize: 14, color: '#a78bfa' }}
                      >
                        {frag.prime_number}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Tooltip / flavour text */}
              {(() => {
                const selected = folderFragments.find((f) => f.id === folderTooltip);
                if (!selected) return null;
                return (
                  <p
                    className="font-fell italic"
                    style={{ textAlign: 'center', fontSize: 13, color: 'rgba(160,140,200,0.6)', marginTop: 16 }}
                  >
                    Prime {selected.prime_number}. You are inside the instrument now.
                  </p>
                );
              })()}

              {/* Status text */}
              {count === 0 && (
                <p className="font-fell italic" style={{ textAlign: 'center', fontSize: 13, color: 'rgba(160,140,200,0.3)', marginTop: 24 }}>
                  Your folder is empty. Enter the maze.
                </p>
              )}
              {count === 20 && (
                <p className="font-fell italic" style={{ textAlign: 'center', fontSize: 13, color: 'rgba(200,80,80,0.4)', marginTop: 24 }}>
                  Your folder is full. You cannot collect further fragments.
                </p>
              )}
              {count >= 18 && count < 20 && (
                <p className="font-fell italic" style={{ textAlign: 'center', fontSize: 13, color: 'rgba(200,150,58,0.5)', marginTop: 24 }}>
                  Your folder is nearly full. Find the Shadow Realm.
                </p>
              )}

              {/* Shadow realm note */}
              <p className="font-fell italic" style={{ textAlign: 'center', fontSize: 13, color: 'rgba(160,140,200,0.2)', marginTop: 32 }}>
                Fragments are lost if you leave the maze without visiting the Shadow Realm.
              </p>
            </div>
          );
        })()}



        {/* ACCOUNT content */}
        {mainTab === 'account' && (
          <div style={{ marginTop: 24 }}>
            {/* SECTION 1 — CREDENTIALS */}
            <div style={{ marginBottom: 32 }}>
              {/* EMAIL */}
              <p className="font-cinzel" style={sectionLabelStyle}>EMAIL</p>
              {!emailForm ? (
                <button type="button" className="font-cinzel" style={ghostBtn} onClick={() => { setEmailForm(true); setEmailMsg(''); }}>
                  CHANGE EMAIL
                </button>
              ) : (
                <div>
                  <p className="font-fell italic" style={msgStyle}>
                    A confirmation link will be sent to your current email address.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="font-cinzel" style={ghostBtn} onClick={handleSendEmailChangeLink}>SEND LINK</button>
                    <button type="button" className="font-cinzel" style={ghostBtn} onClick={() => { setEmailForm(false); setEmailMsg(''); }}>CANCEL</button>
                  </div>
                </div>
              )}
              {emailMsg && <p className="font-fell italic" style={msgStyle}>{emailMsg}</p>}

              {/* PASSWORD */}
              <p className="font-cinzel" style={{ ...sectionLabelStyle, marginTop: 24 }}>PASSWORD</p>
              <button type="button" className="font-cinzel" style={ghostBtn} onClick={handleSendPasswordReset}>
                CHANGE PASSWORD
              </button>
              {passwordMsg && <p className="font-fell italic" style={msgStyle}>{passwordMsg}</p>}

              {/* NAME */}
              <p className="font-cinzel" style={{ ...sectionLabelStyle, marginTop: 24 }}>NAME</p>
              <div className="font-mono" style={valueStyle}>{accountRow?.username ?? username}</div>
              {!nameForm ? (
                <button type="button" className="font-cinzel" style={ghostBtn} onClick={() => { setNameForm(true); setNameStep('input'); setNameMsg(''); }}>
                  CHANGE NAME
                </button>
              ) : nameStep === 'input' ? (
                <div>
                  <input
                    type="text"
                    className="font-fell"
                    style={inputStyle}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="new name"
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="font-cinzel" style={ghostBtn} onClick={() => newName && setNameStep('confirm')}>NEXT</button>
                    <button type="button" className="font-cinzel" style={ghostBtn} onClick={() => { setNameForm(false); setNewName(''); }}>CANCEL</button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-fell italic" style={msgStyle}>
                    Changing your name costs 10,000 credits. This cannot be undone.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="font-cinzel" style={ghostBtn} onClick={handleConfirmName}>CONFIRM</button>
                    <button type="button" className="font-cinzel" style={ghostBtn} onClick={() => { setNameForm(false); setNameStep('input'); setNewName(''); }}>CANCEL</button>
                  </div>
                </div>
              )}
              {nameMsg && <p className="font-fell italic" style={{ ...msgStyle, color: nameMsgColor }}>{nameMsg}</p>}
            </div>

            {/* SECTION 2 — SUBSCRIPTION */}
            <div style={{ marginBottom: 32 }}>
              <p className="font-cinzel" style={sectionLabelStyle}>SUBSCRIPTION</p>
              <div className="font-cinzel" style={{ ...valueStyle, color: subDisplay.color, letterSpacing: '0.18em' }}>
                {subDisplay.text}
              </div>
              <button
                type="button"
                className="font-cinzel"
                style={{
                  fontSize: 13,
                  letterSpacing: '0.2em',
                  background: 'transparent',
                  border: '0.5px solid rgba(160,140,200,0.2)',
                  color: 'rgba(160,140,200,0.4)',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  marginTop: 12,
                }}
                onClick={() => { onClose(); navigate('/paywall'); }}
              >
                MANAGE SUBSCRIPTION
              </button>
            </div>

            {/* SECTION 3 — DANGER */}
            <div>
              <p className="font-cinzel" style={{ ...sectionLabelStyle, color: 'rgba(200,80,80,0.4)' }}>DANGER</p>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, marginTop: 4 }}>
                <button type="button" className="font-cinzel" style={redGhostBtn} onClick={handleSignOut}>
                  SIGN OUT
                </button>
                {!deleteForm ? (
                  <button type="button" className="font-cinzel" style={redGhostBtn} onClick={() => { setDeleteForm(true); setDeleteMsg(''); }}>
                    DELETE ACCOUNT
                  </button>
                ) : (
                  <div style={{ width: '100%' }}>
                    <p className="font-fell italic" style={msgStyle}>Type DELETE to confirm</p>
                    <input
                      type="text"
                      className="font-fell"
                      style={inputStyle}
                      value={deleteText}
                      onChange={(e) => setDeleteText(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="font-cinzel" style={redGhostBtn} onClick={handleDeleteConfirm}>CONFIRM</button>
                      <button type="button" className="font-cinzel" style={ghostBtn} onClick={() => { setDeleteForm(false); setDeleteText(''); setDeleteMsg(''); }}>CANCEL</button>
                    </div>
                    {deleteMsg && <p className="font-fell italic" style={msgStyle}>{deleteMsg}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* GROWTH content */}
        {mainTab === 'growth' && (
          <div style={{ marginTop: 24 }}>
            {([
              { key: 'social' as const, name: 'SOCIAL', color: '#c8963a', borderRgba: 'rgba(200,150,58,0.2)', desc: "Social affinity grants deeper resonance with the village's inhabitants. Dialogue paths others cannot hear." },
              { key: 'perception' as const, name: 'PERCEPTION', color: '#2dd4bf', borderRgba: 'rgba(45,212,191,0.2)', desc: 'Perception affinity extends your awareness within the maze. What others stumble into, you see first.' },
              { key: 'trade' as const, name: 'TRADE', color: '#a78bfa', borderRgba: 'rgba(167,139,250,0.2)', desc: 'Trade affinity reduces the friction of movement. Every step costs less when you know the value of things.' },
            ]).map((a, idx) => {
              const open = growthOpen[a.key];
              return (
                <div key={a.key} style={{ marginBottom: idx < 2 ? 20 : 0 }}>
                  <button
                    type="button"
                    onClick={() => setGrowthOpen((s) => ({ ...s, [a.key]: !s[a.key] }))}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: open ? '1px solid transparent' : '1px solid rgba(160,140,200,0.08)',
                      padding: '12px 0',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, display: 'inline-block' }} />
                      <span className="font-cinzel" style={{ fontSize: 11, letterSpacing: '0.2em', color: '#e0ddd5' }}>{a.name}</span>
                    </span>
                    <span style={{ color: 'rgba(160,140,200,0.3)', fontSize: 11 }}>{open ? '▲' : '▼'}</span>
                  </button>
                  <div
                    style={{
                      maxHeight: open ? 400 : 0,
                      overflow: 'hidden',
                      transition: 'max-height 240ms ease',
                    }}
                  >
                    <div style={{ padding: '12px 0 16px' }}>
                      <p className="font-fell italic" style={{ fontSize: 15, color: 'rgba(160,140,200,0.5)', marginBottom: 16 }}>
                        {a.desc}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 10 }}>
                        {[0, 1, 2, 3, 4].map((n) => (
                          <span
                            key={n}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: n === 0 ? a.color : 'transparent',
                              border: n === 0 ? 'none' : `1px solid ${a.borderRgba}`,
                              display: 'inline-block',
                            }}
                          />
                        ))}
                      </div>
                      <p className="font-cinzel" style={{ textAlign: 'center', fontSize: 8, letterSpacing: '0.2em', color: 'rgba(160,140,200,0.3)', margin: 0 }}>
                        LEVEL 1 / 5
                      </p>
                      <p className="font-fell italic" style={{ textAlign: 'center', fontSize: 12, color: 'rgba(160,140,200,0.2)', marginTop: 6 }}>
                        Further progression locked.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <p className="font-fell italic" style={{ textAlign: 'center', fontSize: 10, color: 'rgba(160,140,200,0.2)', marginTop: 24 }}>
              Your affinities emerge through play. They cannot be chosen.
            </p>
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
