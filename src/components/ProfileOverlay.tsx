import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Z } from '@/lib/zIndex';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { updateUser } from '@/lib/userData';
import { getFlag } from '@/lib/questFlags';
import { BETA_MODE } from '@/lib/config';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { sendBetaFeedback } from '@/lib/betaFeedback';
import { formatPrime } from '@/lib/format';
import PlateFrame from '@/components/theme/PlateFrame';
import PlayerAvatar, { orbLook } from '@/components/PlayerAvatar';
import { DropDetail } from '@/components/DropDetail';
import { publishOrb, type OrbChange } from '@/lib/orb';
import { X } from 'lucide-react';
import { fragmentInventory, type FolderFragment } from '@/lib/carriedFragments';
import DropIcon from '@/components/DropIcon';
import Wardrobe from '@/components/Wardrobe';
import { USER_STEPS_REFRESHED, type MazeUseContext } from '@/lib/mechanics';
import { readOwnedDrops, DROPS_REFRESHED, type DropsRefresh, type OwnedDrop } from '@/lib/carriedDrops';






type Props = {
  isOpen: boolean;
  onClose: () => void;
  context?: 'village' | 'maze';
  runProgress?: { collected: number; required: number };
  mazeUse?: MazeUseContext;
  growthPoints?: number;
  socialStat?: number;
  perceptionStat?: number;
  tradeStat?: number;
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
  orb_dye?: string | null;
  level: number;
  avatar_hat: string | null;
  avatar_body: string | null;
  avatar_head: string | null;
  trade: number | null;
  growth_points: number | null;
  social: number | null;
  perception: number | null;
  extra_drop_capacity: number | null;
};

const ProfileOverlay = ({
  isOpen,
  onClose,
  context = 'village',
  runProgress,
  mazeUse,
  growthPoints: growthPointsProp = 0,
  socialStat: socialStatProp = 0,
  perceptionStat: perceptionStatProp = 0,
  tradeStat: tradeStatProp = 0,
}: Props) => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mainTab, setMainTab] = useState<'profile' | 'quests' | 'account' | 'growth' | 'folder'>('profile');
  const [growthOpen, setGrowthOpen] = useState<{ social: boolean; perception: boolean; trade: boolean }>({ social: false, perception: false, trade: false });
  const [growthPoints, setGrowthPoints] = useState(growthPointsProp);
  const [stats, setStats] = useState({ social: socialStatProp, perception: perceptionStatProp, trade: tradeStatProp });
  // Props are only initial values; once the fetched users row is in, the
  // database wins and stale parent props must not overwrite the numbers.
  // (Effects live below the accountRow state declaration.)

  const commitGrowthPoint = (key: 'social' | 'perception' | 'trade') => {
    if (!user) return;
    if (growthPoints <= 0 || stats[key] >= 5) return;
    const nextGp = growthPoints - 1;
    const nextVal = stats[key] + 1;
    setGrowthPoints(nextGp);
    setStats((s) => ({ ...s, [key]: nextVal }));
    updateUser(user.id, { growth_points: nextGp, [key]: nextVal } as never);
  };

  const [folderFragments, setFolderFragments] = useState<FolderFragment[]>([]);
  const [folderTooltip, setFolderTooltip] = useState<string | null>(null);
  const [ownedDrops, setOwnedDrops] = useState<OwnedDrop[]>([]);
  const [dropTooltip, setDropTooltip] = useState<string | null>(null);
  const [dropsNonce, setDropsNonce] = useState(0);
  const [dyeWhisper, setDyeWhisper] = useState('');
  const applyOrb = (c: OrbChange) => {
    setAccountRow(prev => prev ? { ...prev, aura_color: c.aura_color ?? prev.aura_color, orb_dye: c.orb_dye } : prev);
    publishOrb(c);
  };
  const [extraDropCapacity, setExtraDropCapacity] = useState(0);
  const [dropSlotMsg, setDropSlotMsg] = useState('');
  const [buyingSlot, setBuyingSlot] = useState(false);
  const [questTab, setQuestTab] = useState<'active' | 'completed'>('active');
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());

  // Account tab state
  const [accountRow, setAccountRow] = useState<AccountUserRow | null>(null);
  // Props are only initial values; once the fetched users row is in, the
  // database wins and stale parent props must not overwrite the numbers.
  useEffect(() => { if (!accountRow) setGrowthPoints(growthPointsProp); }, [growthPointsProp, accountRow]);
  useEffect(() => {
    if (accountRow) return;
    setStats({ social: socialStatProp, perception: perceptionStatProp, trade: tradeStatProp });
  }, [socialStatProp, perceptionStatProp, tradeStatProp, accountRow]);
  const [emailForm, setEmailForm] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [nameForm, setNameForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameStep, setNameStep] = useState<'input' | 'confirm'>('input');
  const [nameMsg, setNameMsg] = useState('');
  const [nameMsgColor, setNameMsgColor] = useState('var(--plate-label)');
  const [deleteForm, setDeleteForm] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');
  const [titleDropdownOpen, setTitleDropdownOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackThanks, setFeedbackThanks] = useState(false);
  const [feedbackViewport, setFeedbackViewport] = useState({ top: 0, height: window.innerHeight });
  useEffect(() => {
    if (!feedbackOpen) return;
    const viewport = window.visualViewport;
    const update = () => setFeedbackViewport({
      top: viewport?.offsetTop ?? 0,
      height: viewport?.height ?? window.innerHeight,
    });
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [feedbackOpen]);
  useEffect(() => {
    if (!feedbackThanks) return;
    const timer = window.setTimeout(() => setFeedbackThanks(false), 3500);
    return () => window.clearTimeout(timer);
  }, [feedbackThanks]);

  // Reset expanded groups whenever the overlay closes
  useEffect(() => {
    if (!isOpen) {
      setOpenGroups(new Set());
      setEmailForm(false); setEmailMsg('');
      setPasswordMsg('');
      setNameForm(false); setNewName(''); setNameStep('input'); setNameMsg('');
      setDeleteForm(false); setDeleteText(''); setDeleteMsg('');
      setFeedbackOpen(false); setFeedbackText(''); setFeedbackError(''); setFeedbackThanks(false);
    }
  }, [isOpen]);

  // Fetch account data when overlay opens
  useEffect(() => {
    if (!isOpen || !user) return;
    let cancelled = false;
    supabase
      .from('users')
      .select('username, credits, steps_remaining, registration_number, subscription_status, subscription_tier, trial_end, title, unlocked_titles, aura_color, orb_dye, level, avatar_hat, avatar_body, avatar_head, trade, extra_drop_capacity, growth_points, social, perception')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) {
          const row = data as unknown as AccountUserRow;
          setAccountRow(row);
          setExtraDropCapacity(row.extra_drop_capacity ?? 0);
          setGrowthPoints(row.growth_points ?? 0);
          setStats({ social: row.social ?? 0, perception: row.perception ?? 0, trade: row.trade ?? 0 });
          window.dispatchEvent(new CustomEvent(USER_STEPS_REFRESHED, { detail: { userId: user.id, steps: row.steps_remaining } }));
        }
      });
    return () => { cancelled = true; };
  }, [isOpen, user, dropsNonce]);

  // Fetch the player's owned drops when the overlay opens
  useEffect(() => {
    if (!isOpen || !user) return;
    let cancelled = false;
    readOwnedDrops(user.id).then(drops => {
      if (!cancelled) setOwnedDrops(drops);
    }).catch(error => { if (!cancelled) console.error('[Folder] drops fetch failed', error); });
    return () => { cancelled = true; };
  }, [isOpen, user, dropsNonce]);

  useEffect(() => {
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent<DropsRefresh>).detail;
      if (detail.userId !== user?.id) return;
      setOwnedDrops(detail.drops);
      setDropTooltip(id => detail.drops.some(drop => drop.id === id) ? id : null);
      // Cancel any older open-profile read so it cannot restore pre-mutation rows.
      setDropsNonce(n => n + 1);
    };
    window.addEventListener(DROPS_REFRESHED, refresh);
    return () => window.removeEventListener(DROPS_REFRESHED, refresh);
  }, [user?.id]);

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
      `https://jngofylkynipsnzyyzdq.supabase.co/rest/v1/fragments?select=id%2Cprime_number%2Ccollected_at%2Cbanked&user_id=eq.${encodeURIComponent(user.id)}&order=collected_at.desc`,
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

  

  // Values derived from the fetched user row
  const username = accountRow?.username ?? 'Wanderer';
  let regNum: string;
  if (accountRow?.registration_number != null) {
    regNum = String(accountRow.registration_number).padStart(4, '0');
  } else {
    regNum = user ? user.id.slice(-4).toUpperCase() : '????';
  }
  const auraColor = accountRow?.aura_color ?? 'var(--plate-voice)';
  const credits = String(accountRow?.credits ?? 50);
  const steps = String(accountRow?.steps_remaining ?? 100);
  const level = String(accountRow?.level ?? 1);
  const titleRaw = accountRow?.title ?? null;
  const title = titleRaw && titleRaw.trim() !== '' ? titleRaw : '';
  const { carried: carriedFragments, bankedCount } = fragmentInventory(folderFragments);
  const fragmentCount = carriedFragments.length;
  const fragmentDisplayValue =
    context === 'maze' && runProgress
      ? `${runProgress.collected}/${runProgress.required}`
      : `${fragmentCount}`;

  const stage = parseInt(getFlag('bernard_stage') ?? '0', 10);
  const alexandraActive = getFlag('alexandra_quest') === 'active';
  const subscribed = BETA_MODE || (accountRow ? ['active','lifetime','dev','beta'].includes(accountRow.subscription_status) : false);
  const subType = accountRow?.subscription_tier ?? '';


  // Subscription display mapping
  const subStatus: SubStatus = BETA_MODE ? 'active' : accountRow?.subscription_status ?? 'expired';
  const trialDays = (() => {
    if (BETA_MODE) return 0;
    if (!accountRow?.trial_end) return 0;
    const end = new Date(accountRow.trial_end);
    const diff = end.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();
  const subDisplay = (() => {
    switch (subStatus) {
      case 'dev': return { text: 'DEV ACCESS', color: 'var(--plate-gold)' };
      case 'trial': return { text: `TRIAL — ${trialDays} DAYS REMAINING`, color: 'var(--plate-label)' };
      case 'active': return { text: 'SUBSCRIBED', color: 'var(--plate-gold)' };
      case 'lifetime': return { text: 'FOUNDING MEMBER', color: 'var(--plate-gold)' };
      case 'beta': return { text: 'BETA ACCESS', color: 'var(--plate-label)' };
      case 'expired': return { text: 'NOT SUBSCRIBED', color: 'var(--plate-label)' };
      default: return { text: 'NOT SUBSCRIBED', color: 'var(--plate-label)' };
    }
  })();

  type Quest = { key: string; name: string; giver: string; status: string; gold?: boolean };

  const activeQuests: Quest[] = [];
  if (alexandraActive) activeQuests.push({ key: 'a-alexandra', name: 'The One Who Was Here Before', giver: 'Sam', status: 'Someone was here before. Follow it far enough and you will find them.', gold: true });
  if (stage === 0) activeQuests.push({ key: 'a-find-bernard', name: 'Find Sam', giver: 'Sam', status: 'Seek out Sam in the Village square.' });
  if (stage === 1) activeQuests.push({ key: 'a-blue', name: 'Find the Blue Door', giver: 'Sam', status: 'Find the blue door inside the Instrument.' });
  if (stage === 2) activeQuests.push({ key: 'a-frag', name: 'Find a fragment', giver: 'Sam', status: 'Collect one fragment and return to Sam.' });
  if (stage === 3) activeQuests.push({ key: 'a-gold', name: 'Find the golden door', giver: 'Sam', status: 'Collect all 5 fragments and find the golden door.' });
  if (stage === 4) activeQuests.push({ key: 'a-return', name: 'Return to Sam', giver: 'Sam', status: 'Return to Sam in the Village square.' });

  const completedQuests: Quest[] = [];
  if (stage >= 1) completedQuests.push({ key: 'c-welcome', name: 'Welcome to the Village', giver: 'Sam', status: 'Sam welcomed you to the Village.' });
  if (stage >= 2) completedQuests.push({ key: 'c-blue', name: 'Find the Blue Door', giver: 'Sam', status: "You found Sam's room." });
  if (stage >= 3) completedQuests.push({ key: 'c-frag', name: 'Find a fragment', giver: 'Sam', status: 'Fragment collected. The instrument spoke.' });
  if (stage >= 4) completedQuests.push({ key: 'c-gold', name: 'Find the golden door and Shadow Realm', giver: 'Sam', status: 'You found the golden door.' });
  if (stage >= 5) completedQuests.push({ key: 'c-return', name: 'The return', giver: 'Sam', status: 'You returned to Sam. Wanderer title granted.' });


  const cardStyle: React.CSSProperties = {
    position: 'relative',
    background: 'var(--plate-inset)',
    border: '0.5px solid var(--plate-label)',
    borderRadius: 0,
    padding: '10px 14px',
    marginBottom: 8,
  };

  const questNameStyle: React.CSSProperties = {
    margin: 0, fontSize: 13, color: 'var(--auth-text)', letterSpacing: '0.12em',
  };
  const giverStyle: React.CSSProperties = {
    margin: '2px 0 0', fontSize: 12, color: 'var(--plate-label)',
  };
  const statusStyle: React.CSSProperties = {
    margin: '4px 0 0', fontSize: 13, color: 'var(--auth-text)',
  };

  // Account tab styles
  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: undefined,
    fontSize: 11,
    letterSpacing: '0.2em',
    color: 'var(--plate-label)',
    margin: 0,
  };
  const valueStyle: React.CSSProperties = {
    fontSize: 13,
    color: 'var(--auth-text)',
    marginTop: 6,
  };
  const ghostBtn: React.CSSProperties = {
    fontSize: 13,
    letterSpacing: '0.2em',
    color: 'var(--plate-label)',
    background: 'transparent',
    border: '0.5px solid var(--plate-edge)',
    padding: '8px 16px',
    cursor: 'pointer',
    marginTop: 10,
  };
  const redGhostBtn: React.CSSProperties = {
    ...ghostBtn,
    border: '0.5px solid var(--auth-error)',
    color: 'var(--auth-error)',
  };
  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--plate-label)',
    color: 'var(--auth-text)',
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
    color: 'var(--plate-label)',
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
      setNameMsgColor('var(--auth-error)');
      return;
    }
    await updateUser(user.id, {
      credits: accountRow.credits - 10000,
      username: newName,
    });
    setAccountRow({ ...accountRow, credits: accountRow.credits - 10000, username: newName });
    await updateUser(user.id, { username: newName });
    setNameMsg('Name changed.');
    setNameMsgColor('var(--plate-label)');
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

  const handleSendFeedback = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || feedbackSending || !feedbackText.trim()) return;
    setFeedbackSending(true);
    setFeedbackError('');
    try {
      await sendBetaFeedback(feedbackText, window.location.pathname, navigator.userAgent,
        (payload) => supabase.from('beta_feedback').insert(payload));
      setFeedbackOpen(false);
      setFeedbackText('');
      setFeedbackThanks(true);
    } catch {
      setFeedbackError('Could not send. Please try again.');
    } finally {
      setFeedbackSending(false);
    }
  };

  return createPortal(
    <div className="profile-overlay" data-game-ui={isOpen ? 'open' : undefined} data-profile-open={isOpen ? 'true' : undefined} style={{ display: isOpen ? 'flex' : 'none' }}>
      <PlateFrame width="min(100vw, 440px)" className="profile-frame">
        <div className="profile-content">
          <header className="profile-header">
            <PlayerAvatar size={56} palette={orbLook(accountRow?.aura_color, accountRow?.orb_dye, accountRow?.registration_number)} walking={false} skin={accountRow?.avatar_body} registrationNumber={accountRow?.registration_number} auraColor={accountRow?.aura_color} orbDye={accountRow?.orb_dye} />
            <div className="profile-identity">
              <h2 className="font-cinzel">{accountRow?.username?.trim() || `#${regNum}`}</h2>
              <div className="profile-header-plates font-mono"><span className="fragment-registration">#{regNum}</span><span className="profile-level">LEVEL {level.padStart(2, '0')}</span></div>
              <p className="font-fell italic">{title || '—'}</p>
            </div>
            <Button variant="ghost" className="profile-close" aria-label="Close profile" onClick={onClose}><X /></Button>
          </header>
          <nav className="profile-tabs" aria-label="Profile tabs">
            {(['profile', 'growth', 'quests', 'folder', 'account'] as const).map(t => <Button key={t} variant="ghost" className={`font-mono profile-tab ${mainTab === t ? 'profile-tab-active' : ''}`} aria-pressed={mainTab === t} onClick={() => setMainTab(t)}>{t.toUpperCase()}</Button>)}
          </nav>
        {/* PROFILE content */}
        {mainTab === 'profile' && (
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                display: 'flex', justifyContent: 'space-around',
                marginTop: 24, paddingTop: 16, paddingBottom: 16,
                borderTop: '0.5px solid var(--plate-edge)',
                borderBottom: '0.5px solid var(--plate-edge)',
              }}
            >
              {[
                { label: 'CREDITS', value: credits, color: 'var(--plate-gold)' },
                { label: 'STEPS', value: steps, color: 'var(--auth-text)' },
                { label: 'FRAGMENTS', value: fragmentDisplayValue, color: 'var(--plate-voice)' },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div className="font-mono" style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--plate-label)' }}>{s.label}</div>
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
              <div className="font-mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--plate-label)' }}>TITLE</div>
              {(() => {
                const titles = accountRow?.unlocked_titles ?? [];
                const hasMultiple = titles.length >= 2;
                const titleColor = 'var(--auth-text)';
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
                        <span style={{ fontSize: 11, color: titleColor }}>▾</span>
                      )}
                    </div>
                    {hasMultiple && titleDropdownOpen && (
                      <>
                        <div
                          onClick={() => setTitleDropdownOpen(false)}
                          style={{ position: 'fixed', inset: 0, zIndex: Z.MODAL }}
                        />
                        <div
                          style={{ position: 'relative', zIndex: Z.MODAL, marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
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
                                  color: isActive ? 'var(--plate-gold)' : 'var(--plate-label)',
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
              <div className="font-cinzel" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--plate-label)' }}>
                DIMENSION
              </div>
              <div
                aria-label="Dimension"
                style={{
                  width: 12, height: 12, borderRadius: 0,
                  background: accountRow?.aura_color ?? 'var(--plate-voice)',
                  boxShadow: 'var(--console-digit-shadow)',
                }}
              />
            </div>

            <Wardrobe
              auraColor={accountRow?.aura_color ?? null}
              orbDye={accountRow?.orb_dye ?? null}
              registrationNumber={accountRow?.registration_number ?? null}
              avatarBody={accountRow?.avatar_body ?? null}
              onEquipped={(skin) => setAccountRow(prev => prev ? { ...prev, avatar_body: skin } : prev)}
            />

            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
              {subStatus === 'dev' ? (
                <span className="font-cinzel" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'var(--plate-gold)' }}>
                  DEV ACCESS
                </span>
              ) : subscribed ? (
                <span className="font-cinzel" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'var(--plate-label)' }}>
                  {(subType || 'monthly').toUpperCase()} MEMBER
                </span>
              ) : (
                <span className="font-cinzel" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'var(--plate-label)' }}>
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
            <div style={{ display: 'flex', gap: 4, borderBottom: '0.5px solid var(--plate-edge)' }}>
              {(['active', 'completed'] as const).map((t) => {
                const active = questTab === t;
                return (
                  <Button variant="ghost"
                    key={t}
                    type="button"
                    onClick={() => setQuestTab(t)}
                    className="font-cinzel"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: active ? '1px solid var(--plate-voice)' : '1px solid transparent',
                      padding: '6px 16px',
                      fontSize: 11,
                      letterSpacing: '0.2em',
                      color: active ? 'var(--auth-text)' : 'var(--plate-label)',
                      cursor: 'pointer',
                      marginBottom: -1,
                    }}
                  >
                    {t.toUpperCase()}
                  </Button>
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
                        style={{ position: 'absolute', top: 8, right: 12, color: 'var(--plate-gold)', fontSize: 14 }}
                      >
                        ✓
                      </span>
                    ) : (
                      <span
                        style={{
                          position: 'absolute', top: 12, right: 12,
                          width: 6, height: 6, borderRadius: 0,
                          background: 'var(--plate-voice)',
                          boxShadow: '0 0 6px var(--plate-voice)',
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
                          background: 'var(--plate-edge)',
                          border: '0.5px solid var(--plate-edge)',
                          marginBottom: 16,
                        }}
                      >
                        <p
                          className="font-cinzel"
                          style={{ margin: 0, fontSize: 11, letterSpacing: '0.2em', color: 'var(--plate-gold)' }}
                        >
                          PRIMARY QUEST
                        </p>
                        <p
                          className="font-cinzel"
                          style={{ ...questNameStyle, color: 'var(--plate-gold)', marginTop: 4 }}
                        >
                          {alexandra.name.toUpperCase()}
                        </p>
                        <p
                          className="font-fell italic"
                          style={{ ...giverStyle, color: 'var(--plate-label)' }}
                        >
                          Given by {alexandra.giver}
                        </p>
                        <p className="font-fell italic" style={statusStyle}>{alexandra.status}</p>
                      </div>
                    )}

                    {groupNames.length === 0 ? (
                      <p
                        className="font-fell italic"
                        style={{ textAlign: 'center', fontSize: 13, color: 'var(--plate-label)', margin: '24px 0' }}
                      >
                        {questTab === 'active' ? 'No other active quests.' : 'Nothing completed yet.'}
                      </p>
                    ) : (
                      groupNames.map((name) => {
                        const expanded = openGroups.has(name);
                        const items = groups.get(name) ?? [];
                        return (
                          <div key={name} style={{ marginBottom: 10 }}>
                            <Button variant="ghost"
                              type="button"
                              onClick={() => toggleGroup(name)}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'var(--plate-inset)',
                                border: '0.5px solid var(--plate-edge)',
                                borderRadius: 0,
                                padding: '10px 14px',
                                cursor: 'pointer',
                              }}
                            >
                              <span
                                className="font-cinzel"
                                style={{ fontSize: 12, letterSpacing: '0.15em', color: 'var(--auth-text)' }}
                              >
                                {name.toUpperCase()}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span className="font-mono" style={{ fontSize: 11, color: 'var(--plate-label)' }}>
                                  {items.length} quest{items.length === 1 ? '' : 's'}
                                </span>
                                <span style={{ fontSize: 11, color: 'var(--plate-label)' }}>
                                  {expanded ? '▲' : '▼'}
                                </span>
                              </span>
                            </Button>
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
          const count = carriedFragments.length;
          const cells = Array.from({ length: 20 }, (_, i) => carriedFragments[i] || null);
          return (
            <div style={{ marginTop: 24 }}>
              <div className="profile-section-label font-mono"><span>FOLDER</span><span>{count} / 20</span></div>
              <div className="profile-inventory-grid">
                {cells.map((frag, i) => <Button key={i} variant="outline" className={`profile-inventory-tile ${frag ? 'profile-fragment-carried' : 'profile-tile-empty'}`} disabled={!frag} aria-label={frag ? `Prime ${formatPrime(frag.prime_number)}` : `Empty fragment slot ${i + 1}`} onClick={() => frag && setFolderTooltip(folderTooltip === frag.id ? null : frag.id)}>{frag && <span className="font-cinzel">{formatPrime(frag.prime_number)}</span>}</Button>)}
              </div>
              <p className="profile-library font-mono">LIBRARY {bankedCount} banked</p>
              <p className="profile-carry-note font-fell italic">{count > 0 ? 'Carried fragments are lost if you leave the maze without visiting the Shadow Realm.' : 'Nothing carried. Fragments you find in the maze appear here until you bank them.'}</p>

              {/* Tooltip / flavour text */}
              {(() => {
                const selected = carriedFragments.find((f) => f.id === folderTooltip);
                if (!selected) return null;
                return (
                  <p
                    className="font-fell italic"
                    style={{ textAlign: 'center', fontSize: 13, color: 'var(--plate-label)', marginTop: 16 }}
                  >
                    Prime {formatPrime(selected.prime_number)}. You are inside the instrument now.
                  </p>
                );
              })()}

              {/* DROPS section */}
              {(() => {
                const tradeStat = accountRow?.trade ?? 0;
                const dropCapacity = 10 + tradeStat * 2 + extraDropCapacity;
                const owned = ownedDrops.length;
                const dropCells = Array.from({ length: dropCapacity }, (_, i) => ownedDrops[i] || null);
                const creditsNum = accountRow?.credits ?? 0;
                const SLOT_COST = 100;
                const canAfford = creditsNum >= SLOT_COST;
                const selectedDrop = ownedDrops.find((d) => d.id === dropTooltip) || null;

                const buySlot = async () => {
                  if (!user || !canAfford || buyingSlot) return;
                  setBuyingSlot(true);
                  setDropSlotMsg('');
                  const nextCredits = creditsNum - SLOT_COST;
                  const nextExtra = extraDropCapacity + 1;
                  const { error } = await supabase
                    .from('users')
                    .update({ credits: nextCredits, extra_drop_capacity: nextExtra } as never)
                    .eq('id', user.id);
                  if (error) {
                    console.error('[Folder] buy slot failed', error);
                    setDropSlotMsg('The exchange refused you. Try again.');
                  } else {
                    setExtraDropCapacity(nextExtra);
                    setAccountRow((r) => (r ? { ...r, credits: nextCredits, extra_drop_capacity: nextExtra } : r));
                    setDropSlotMsg('The folder widens. One more slot.');
                  }
                  setBuyingSlot(false);
                };

                return (
                  <div style={{ marginTop: 40 }}>
                    <div className="profile-section-label font-mono"><span>DROPS</span><span>{owned} / {dropCapacity}</span></div>
                    <div className="profile-inventory-grid">
                      {dropCells.map((drop, i) => <Button key={i} variant="outline" className={`profile-inventory-tile ${drop ? `profile-drop-filled${drop.carried ? ' profile-drop-carried' : ''}` : 'profile-tile-empty'}`} disabled={!drop} aria-label={drop ? drop.name : `Empty drop slot ${i + 1}`} onClick={() => drop && setDropTooltip(dropTooltip === drop.id ? null : drop.id)}>{drop && <span className="profile-drop-body"><DropIcon svg={drop.icon_svg} category={drop.category} size={40} drop_key={drop.drop_key} />{drop.category === 'key' && <span className="profile-key-badge font-mono">KEY</span>}<span className="font-fell italic">{drop.name}</span>{drop.carried && <span className="profile-carried-label font-mono">CARRIED</span>}</span>}</Button>)}
                    </div>
                    {ownedDrops.some(drop => drop.carried) && <p className="profile-carry-note font-fell italic">Dashed drops are carried. Bank them in the Shadow Realm or lose them if you leave the maze.</p>}

                    {selectedDrop && <DropDetail key={selectedDrop.id} drop={selectedDrop} maze={context === 'maze' ? mazeUse : undefined} steps={accountRow?.steps_remaining} onRefresh={() => setDropsNonce(n => n + 1)} onClose={() => setDropTooltip(null)} onUsed={(m, c) => { setDyeWhisper(m); setDropTooltip(null); setOwnedDrops(drops => drops.filter(d => d.id !== selectedDrop.id)); if (c) applyOrb(c); setDropsNonce(n => n + 1); }} />}
                    {dyeWhisper && <p className="font-fell italic dye-whisper">{dyeWhisper}</p>}
                    {ownedDrops.some(d => d.category === 'words') && <div style={{ marginTop: 24 }}><div className="profile-section-label font-mono"><span>CARVED WORDS</span></div>{ownedDrops.filter(d => d.category === 'words').map(d => <div key={d.id} style={{ marginTop: 12 }}><p className="font-cinzel">{d.name}</p>{d.description && <p className="font-fell italic" style={{ whiteSpace: 'pre-line', color: 'var(--plate-label)' }}>{d.description}</p>}</div>)}</div>}

                    {/* Status text */}
                    {owned === 0 && (
                      <p className="font-fell italic" style={{ textAlign: 'center', fontSize: 13, color: 'var(--plate-label)', marginTop: 24 }}>
                        You carry nothing. The village gives to those who ask.
                      </p>
                    )}
                    {owned >= dropCapacity && (
                      <p className="font-fell italic" style={{ textAlign: 'center', fontSize: 13, color: 'var(--auth-error)', marginTop: 24 }}>
                        You cannot carry more. Widen the folder.
                      </p>
                    )}

                    {/* Buy slot */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <Button variant="ghost"
                        onClick={buySlot}
                        disabled={!canAfford || buyingSlot}
                        className="font-cinzel"
                        style={{
                          ...ghostBtn,
                          marginTop: 20,
                          opacity: canAfford && !buyingSlot ? 1 : 0.35,
                          cursor: canAfford && !buyingSlot ? 'pointer' : 'default',
                        }}
                      >
                        BUY +1 SLOT — {SLOT_COST} CREDITS
                      </Button>
                    </div>
                    {dropSlotMsg && (
                      <p className="font-fell italic" style={{ textAlign: 'center', fontSize: 13, color: 'var(--plate-label)', marginTop: 10 }}>
                        {dropSlotMsg}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}



        {/* ACCOUNT content */}
        {mainTab === 'account' && (
          <div className="profile-account" style={{ marginTop: 24 }}>
            {/* SECTION 1 — CREDENTIALS */}
            <div style={{ marginBottom: 32 }}>
              {/* EMAIL */}
              <p className="font-mono" style={sectionLabelStyle}>EMAIL</p>
              {!emailForm ? (
                <Button variant="ghost" type="button" className="font-cinzel" style={ghostBtn} onClick={() => { setEmailForm(true); setEmailMsg(''); }}>
                  CHANGE EMAIL
                </Button>
              ) : (
                <div>
                  <p className="font-fell italic" style={msgStyle}>
                    A confirmation link will be sent to your current email address.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="ghost" type="button" className="font-cinzel" style={ghostBtn} onClick={handleSendEmailChangeLink}>SEND LINK</Button>
                    <Button variant="ghost" type="button" className="font-cinzel" style={ghostBtn} onClick={() => { setEmailForm(false); setEmailMsg(''); }}>CANCEL</Button>
                  </div>
                </div>
              )}
              {emailMsg && <p className="font-fell italic" style={msgStyle}>{emailMsg}</p>}

              {/* PASSWORD */}
              <p className="font-mono" style={{ ...sectionLabelStyle, marginTop: 24 }}>PASSWORD</p>
              <Button variant="ghost" type="button" className="font-cinzel" style={ghostBtn} onClick={handleSendPasswordReset}>
                CHANGE PASSWORD
              </Button>
              {passwordMsg && <p className="font-fell italic" style={msgStyle}>{passwordMsg}</p>}

              {/* NAME */}
              <p className="font-mono" style={{ ...sectionLabelStyle, marginTop: 24 }}>NAME</p>
              <div className="font-mono" style={valueStyle}>{accountRow?.username ?? username}</div>
              {!nameForm ? (
                <Button variant="ghost" type="button" className="font-cinzel" style={ghostBtn} onClick={() => { setNameForm(true); setNameStep('input'); setNameMsg(''); }}>
                  CHANGE NAME
                </Button>
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
                    <Button variant="ghost" type="button" className="font-cinzel" style={ghostBtn} onClick={() => newName && setNameStep('confirm')}>NEXT</Button>
                    <Button variant="ghost" type="button" className="font-cinzel" style={ghostBtn} onClick={() => { setNameForm(false); setNewName(''); }}>CANCEL</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-fell italic" style={msgStyle}>
                    Changing your name costs 10,000 credits. This cannot be undone.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="ghost" type="button" className="font-cinzel" style={ghostBtn} onClick={handleConfirmName}>CONFIRM</Button>
                    <Button variant="ghost" type="button" className="font-cinzel" style={ghostBtn} onClick={() => { setNameForm(false); setNameStep('input'); setNewName(''); }}>CANCEL</Button>
                  </div>
                </div>
              )}
              {nameMsg && <p className="font-fell italic" style={{ ...msgStyle, color: nameMsgColor }}>{nameMsg}</p>}
            </div>

            {/* SECTION 2 — SUBSCRIPTION */}
            <div style={{ marginBottom: 32 }}>
              <p className="font-mono" style={sectionLabelStyle}>SUBSCRIPTION</p>
              <div className="font-cinzel" style={{ ...valueStyle, color: subDisplay.color, letterSpacing: '0.18em' }}>
                {subDisplay.text}
              </div>
              {!BETA_MODE && <Button variant="ghost"
                type="button"
                className="font-cinzel"
                style={{
                  fontSize: 13,
                  letterSpacing: '0.2em',
                  background: 'transparent',
                  border: '0.5px solid var(--plate-edge)',
                  color: 'var(--plate-label)',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  marginTop: 12,
                }}
                onClick={() => { onClose(); navigate('/paywall'); }}
              >
                MANAGE SUBSCRIPTION
              </Button>}
            </div>

            <div className="mb-8">
              <Button type="button" variant="outline" className="font-cinzel profile-secondary" onClick={() => {
                setFeedbackError(''); setFeedbackThanks(false); setFeedbackOpen(true);
              }}>
                Send feedback
              </Button>
              {feedbackThanks && <p role="status" className="font-fell italic mt-2 text-base text-foreground">Thank you. Your feedback has been sent.</p>}
            </div>

            {/* SECTION 3 — DANGER */}
            <div>
              <p className="font-mono" style={{ ...sectionLabelStyle, color: 'var(--auth-error)' }}>DANGER</p>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, marginTop: 4 }}>
                <Button type="button" className="font-cinzel profile-signout" onClick={handleSignOut}>
                  SIGN OUT
                </Button>
                {!deleteForm ? (
                  <Button variant="ghost" type="button" className="font-cinzel" style={redGhostBtn} onClick={() => { setDeleteForm(true); setDeleteMsg(''); }}>
                    DELETE ACCOUNT
                  </Button>
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
                      <Button variant="ghost" type="button" className="font-cinzel" style={redGhostBtn} onClick={handleDeleteConfirm}>CONFIRM</Button>
                      <Button variant="ghost" type="button" className="font-cinzel" style={ghostBtn} onClick={() => { setDeleteForm(false); setDeleteText(''); setDeleteMsg(''); }}>CANCEL</Button>
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
              { key: 'social' as const, name: 'SOCIAL', color: 'var(--plate-gold)', borderRgba: 'var(--plate-edge)', desc: "Social affinity grants deeper resonance with the village's inhabitants. Dialogue paths others cannot hear." },
              { key: 'perception' as const, name: 'PERCEPTION', color: 'var(--console-teal)', borderRgba: 'var(--plate-edge)', desc: 'Perception affinity extends your awareness within the maze. What others stumble into, you see first.' },
              { key: 'trade' as const, name: 'TRADE', color: 'var(--plate-voice)', borderRgba: 'var(--plate-edge)', desc: 'Trade affinity reduces the friction of movement. Every step costs less when you know the value of things.' },
            ]).map((a, idx) => {
              const open = growthOpen[a.key];
              return (
                <div key={a.key} style={{ marginBottom: idx < 2 ? 20 : 0 }}>
                  <Button variant="ghost"
                    type="button"
                    onClick={() => setGrowthOpen((s) => ({ ...s, [a.key]: !s[a.key] }))}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: open ? '1px solid transparent' : '1px solid var(--plate-inset)',
                      padding: '12px 0',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 0, background: a.color, display: 'inline-block' }} />
                      <span className="font-mono profile-stat-label">{a.name}</span>
                    </span>
                    <span className="profile-stat-summary"><span className="font-cinzel profile-stat-value">{stats[a.key]}</span><span className="profile-pips" aria-label={`${stats[a.key]} of 5`} >{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < stats[a.key] * 2 ? 'profile-pip-filled' : ''} />)}</span><span>{open ? '▲' : '▼'}</span></span>
                  </Button>
                  {a.key === 'perception' && <p className="font-mono profile-perception-note">Widens your light: +0.5 cells per point</p>}
                  <div
                    style={{
                      maxHeight: open ? 400 : 0,
                      overflow: 'hidden',
                      transition: 'max-height 240ms ease',
                    }}
                  >
                    <div style={{ padding: '12px 0 16px' }}>
                      <p className="font-fell italic" style={{ fontSize: 15, color: 'var(--plate-label)', marginBottom: 16 }}>
                        {a.desc}
                      </p>
                      {growthPoints > 0 ? (
                        <Button variant="ghost"
                          type="button"
                          onClick={() => commitGrowthPoint(a.key)}
                          disabled={stats[a.key] >= 5}
                          className="font-cinzel"
                          style={{
                            display: 'block',
                            margin: '12px auto 0',
                            padding: '8px 16px',
                            background: 'transparent',
                            border: `1px solid ${stats[a.key] >= 5 ? 'var(--plate-edge)' : a.borderRgba}`,
                            color: stats[a.key] >= 5 ? 'var(--plate-edge)' : a.color,
                            fontSize: 11,
                            letterSpacing: '0.2em',
                            cursor: stats[a.key] >= 5 ? 'default' : 'pointer',
                          }}
                        >
                          COMMIT A GROWTH POINT
                        </Button>
                      ) : (
                        <p className="font-fell italic" style={{ textAlign: 'center', fontSize: 12, color: 'var(--plate-edge)', marginTop: 8 }}>
                          No growth points available — earn them by completing quests.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

          </div>
        )}
      </div>

      </PlateFrame>
      <DialogPrimitive.Root open={feedbackOpen && isOpen} onOpenChange={(open) => {
        if (!feedbackSending) { setFeedbackOpen(open); setFeedbackError(''); }
      }}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-background/80" style={{ zIndex: Z.MODAL }} />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed left-0 right-0 mx-auto w-full max-w-[520px] -translate-y-full overflow-y-auto border-t border-purple/30 bg-background p-5 pb-[max(20px,env(safe-area-inset-bottom))] text-foreground focus:outline-none"
            style={{ zIndex: Z.MODAL, top: feedbackViewport.top + feedbackViewport.height, maxHeight: Math.max(0, feedbackViewport.height - 12) }}
            onEscapeKeyDown={(event) => { if (feedbackSending) event.preventDefault(); }}
            onPointerDownOutside={(event) => { if (feedbackSending) event.preventDefault(); }}
          >
            <DialogPrimitive.Title className="font-cinzel m-0 mb-4 text-lg font-normal">Send feedback</DialogPrimitive.Title>
            <form onSubmit={handleSendFeedback} className="flex min-w-0 flex-col gap-3">
              <Textarea aria-label="Feedback message" rows={4} value={feedbackText}
                onChange={(event) => setFeedbackText(event.target.value)} disabled={feedbackSending}
                className="font-fell min-h-[80px] max-h-[28dvh] resize-none rounded-none border-purple/30 text-base placeholder:text-secondary"
                placeholder="Your message" />
              {feedbackError && <p role="alert" className="m-0 text-base text-destructive">{feedbackError}</p>}
              <div className="flex gap-3">
                <Button type="submit" variant="outline" disabled={!user || !feedbackText.trim() || feedbackSending}
                  className="font-cinzel flex-1 rounded-none border-purple/30 bg-transparent text-purple text-[13px] font-normal">
                  {feedbackSending ? 'Sending…' : 'Send'}
                </Button>
                <Button type="button" variant="outline" disabled={feedbackSending} onClick={() => setFeedbackOpen(false)}
                  className="font-cinzel flex-1 rounded-none border-purple/20 bg-transparent text-purple/80 text-[13px] font-normal">Cancel</Button>
              </div>
            </form>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>, document.body
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
