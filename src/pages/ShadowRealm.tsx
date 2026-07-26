import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchOrCreateUser, updateUser } from '@/lib/userData';
import { useAuth } from '@/context/AuthContext';
import { getAllFlags, setFlag } from '@/lib/questFlags';
import { supabase } from '@/lib/supabase';

const STEP = 20;
const TRANSFER_SIZE = 40;

const ATMOSPHERE = [
  'You are between.',
  'The mathematics does not forget.',
  'Leave something permanent.',
  'She found this by accident.',
];

const GHOSTS: { left: string; top: string }[] = [
  { left: '30%', top: '40%' },
  { left: '65%', top: '35%' },
  { left: '45%', top: '70%' },
];

type RunFragment = {
  id: string;
  prime_number: number;
  level: number;
  image_data: string | null;
};

const ShadowRealm = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // ----- existing user row / flags wiring (kept) -----
  const [currentLevel, setCurrentLevel] = useState(1);
  const [stepsRemaining, setStepsRemaining] = useState(0);
  const currentLevelRef = useRef(1);
  const stepsRef = useRef(0);

  // ----- realm state -----
  const [atmoIndex, setAtmoIndex] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // offset from screen center, px
  const posRef = useRef({ x: 0, y: 0 });
  const [runCount, setRunCount] = useState(0);

  // ----- transfer sequence state -----
  const [transferring, setTransferring] = useState(false);
  const transferringRef = useRef(false);
  const [overlayIn, setOverlayIn] = useState(false);
  const [eyeRy, setEyeRy] = useState(2);
  const [typed, setTyped] = useState('');
  const [currentPrime, setCurrentPrime] = useState<number | null>(null);
  const [primeVisible, setPrimeVisible] = useState(false);
  const [nothingMsg, setNothingMsg] = useState(false);
  const [doneMsg, setDoneMsg] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const runFragsRef = useRef<RunFragment[]>([]);

  // Transfer point is centered on screen, slightly above player start.
  const TRANSFER_OFFSET_Y = -120;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    let cancelled = false;
    (async () => {
      const row = await fetchOrCreateUser(user.id);
      if (cancelled) return;
      await getAllFlags(user.id);
      if (cancelled) return;
      setCurrentLevel(row.level);
      currentLevelRef.current = row.level;
      setStepsRemaining(row.steps_remaining);
      stepsRef.current = row.steps_remaining;
      sessionStorage.setItem('visited_shadow_this_run', 'true');
      setFlag(user.id, 'shadow_visited', 'true');

      const { data } = await supabase
        .from('fragments')
        .select('id, prime_number, level, image_data')
        .eq('user_id', user.id)
        .eq('banked', false);
      if (cancelled) return;
      setRunCount((data ?? []).length);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // atmosphere cycling
  useEffect(() => {
    const t = window.setInterval(() => {
      setAtmoIndex((i) => (i + 1) % ATMOSPHERE.length);
    }, 12000);
    return () => window.clearInterval(t);
  }, []);

  // ---------------- transfer sequence ----------------

  const persistTransfer = useCallback(async () => {
    if (!user) return false;
    const frags = runFragsRef.current;
    try {
      const { error: updErr } = await supabase
        .from('fragments')
        .update({ banked: true })
        .eq('user_id', user.id)
        .eq('banked', false);
      if (updErr) throw updErr;

      if (frags.length > 0) {
        const rows = frags.map((f) => ({
          user_id: user.id,
          prime_number: f.prime_number,
          level: f.level,
          transferred_at: new Date().toISOString(),
          image_data: f.image_data,
        }));
        const { error: insErr } = await supabase
          .from('library')
          .upsert(rows, { onConflict: 'user_id,prime_number' });
        if (insErr) throw insErr;
      }

      await updateUser(user.id, {
        maze_completed_level: currentLevelRef.current,
        level: currentLevelRef.current + 1,
      });
      return true;
    } catch (e) {
      console.error('[ShadowRealm] transfer failed', e);
      return false;
    }
  }, [user]);

  const finish = useCallback(async () => {
    setSaving(true);
    setError(false);
    const ok = await persistTransfer();
    setSaving(false);
    if (!ok) {
      setError(true);
      return;
    }
    setRunCount(0);
    setDoneMsg(true);
    window.setTimeout(() => navigate('/village'), 2500);
  }, [persistTransfer, navigate]);

  const playPrimes = useCallback(
    async (frags: RunFragment[]) => {
      const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
      for (const f of frags) {
        setCurrentPrime(f.prime_number);
        setPrimeVisible(false);
        await wait(20);
        setPrimeVisible(true);
        await wait(900); // 300 fade in + 600 hold
        setPrimeVisible(false);
        await wait(300);
      }
      setCurrentPrime(null);
      await finish();
    },
    [finish],
  );

  const startTransfer = useCallback(() => {
    if (transferringRef.current || !user) return;
    transferringRef.current = true;
    setTransferring(true);
    requestAnimationFrame(() => setOverlayIn(true));

    // eye opens
    const start = performance.now();
    let raf = 0;
    const animateEye = (t: number) => {
      const p = Math.min(1, (t - start) / 800);
      const eased = 1 - Math.pow(1 - p, 3);
      setEyeRy(2 + (30 - 2) * eased);
      if (p < 1) raf = requestAnimationFrame(animateEye);
    };
    raf = requestAnimationFrame(animateEye);

    const line = 'Your fragments pass into the permanent record.';
    window.setTimeout(() => {
      let i = 0;
      const tick = () => {
        i += 1;
        setTyped(line.slice(0, i));
        if (i < line.length) {
          window.setTimeout(tick, 35);
        } else {
          window.setTimeout(async () => {
            const { data } = await supabase
              .from('fragments')
              .select('id, prime_number, level, image_data')
              .eq('user_id', user.id)
              .eq('banked', false)
              .order('prime_number', { ascending: true });
            const frags = (data ?? []) as RunFragment[];
            runFragsRef.current = frags;
            if (frags.length === 0) {
              setNothingMsg(true);
              await finish();
              return;
            }
            void playPrimes(frags);
          }, 400);
        }
      };
      tick();
    }, 800);

    return () => cancelAnimationFrame(raf);
  }, [user, finish, playPrimes]);

  // ---------------- movement ----------------

  const move = useCallback(
    (dx: number, dy: number) => {
      if (transferringRef.current) return;
      const next = { x: posRef.current.x + dx * STEP, y: posRef.current.y + dy * STEP };
      posRef.current = next;
      setPos(next);

      if (stepsRef.current > 0) {
        stepsRef.current -= 1;
        setStepsRemaining(stepsRef.current);
      }

      const dist = Math.hypot(next.x - 0, next.y - TRANSFER_OFFSET_Y);
      if (dist <= 20) startTransfer();
    },
    [startTransfer],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); move(0, -1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); move(0, 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1, 0); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); move(1, 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);

  const stepsColor =
    stepsRemaining <= 10 ? 'rgba(200,80,80,0.9)' : stepsRemaining <= 30 ? '#c8963a' : 'rgba(160,140,200,0.6)';

  const dpadBtn = (label: string, dx: number, dy: number) => (
    <button
      onClick={() => move(dx, dy)}
      className="font-mono"
      style={{
        width: 44,
        height: 44,
        background: 'rgba(200,80,80,0.05)',
        border: '1px solid rgba(200,80,80,0.3)',
        color: 'rgba(200,140,140,0.7)',
        fontSize: 14,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#04040a',
        backgroundImage:
          'linear-gradient(rgba(180,60,60,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(180,60,60,0.08) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        overflow: 'hidden',
      }}
    >
      {/* Atmosphere */}
      <div
        className="font-fell italic"
        style={{
          position: 'fixed',
          top: 24,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 13,
          color: 'rgba(200,100,100,0.5)',
          pointerEvents: 'none',
        }}
      >
        {ATMOSPHERE[atmoIndex]}
      </div>

      {/* Ghost dots */}
      {GHOSTS.map((g, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: g.left,
            top: g.top,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'rgba(91,79,212,0.2)',
            transform: 'translate(-50%,-50%)',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Transfer point */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: TRANSFER_SIZE,
          height: TRANSFER_SIZE,
          marginLeft: -TRANSFER_SIZE / 2,
          marginTop: -TRANSFER_SIZE / 2 + TRANSFER_OFFSET_Y,
          border: '1px solid rgba(200,80,80,0.8)',
          background: 'rgba(200,80,80,0.06)',
          animation: 'shadowTransferPulse 2s ease-in-out infinite',
        }}
      />

      {/* Player */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 8,
          height: 8,
          marginLeft: -4,
          marginTop: -4,
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          borderRadius: '50%',
          background: '#5b4fd4',
          boxShadow: '0 0 12px rgba(91,79,212,0.8)',
          animation: 'shadowPlayerPulse 2s ease-in-out infinite',
        }}
      />

      {/* D-pad */}
      <div
        style={{
          position: 'fixed',
          right: 24,
          bottom: 90,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 44px)',
          gridTemplateRows: 'repeat(3, 44px)',
          gap: 4,
        }}
      >
        <div />
        {dpadBtn('↑', 0, -1)}
        <div />
        {dpadBtn('←', -1, 0)}
        <div />
        {dpadBtn('→', 1, 0)}
        <div />
        {dpadBtn('↓', 0, 1)}
        <div />
      </div>

      {/* RETURN */}
      <button
        onClick={() => navigate('/village')}
        className="font-cinzel"
        style={{
          position: 'fixed',
          left: 24,
          bottom: 64,
          background: 'none',
          border: 'none',
          padding: 0,
          fontSize: 10,
          letterSpacing: '0.28em',
          color: 'rgba(160,140,200,0.3)',
          cursor: 'pointer',
        }}
      >
        RETURN
      </button>

      {/* HUD */}
      <div
        className="font-mono"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderTop: '1px solid rgba(180,60,60,0.15)',
          background: 'rgba(4,4,10,0.9)',
          fontSize: 11,
          letterSpacing: '0.18em',
        }}
      >
        <div style={{ color: stepsColor }}>STEPS&nbsp;&nbsp;{stepsRemaining}</div>
        <div style={{ color: 'rgba(200,150,58,0.8)' }}>FRAGMENTS&nbsp;&nbsp;{runCount}</div>
        <div style={{ color: '#5b4fd4' }}>LEVEL&nbsp;&nbsp;{String(currentLevel).padStart(2, '0')}</div>
      </div>

      {/* Transfer overlay */}
      {transferring && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#04040a',
            opacity: overlayIn ? 1 : 0,
            transition: 'opacity 600ms ease-in',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width={120} height={72} viewBox="-60 -36 120 72">
            <ellipse cx={0} cy={0} rx={50} ry={eyeRy} stroke="rgba(200,100,100,0.6)" strokeWidth={1} fill="none" />
            {eyeRy > 8 && <circle cx={0} cy={0} r={8} fill="#5b4fd4" />}
          </svg>

          <p
            className="font-fell italic"
            style={{
              marginTop: 32,
              fontSize: 17,
              color: 'rgba(200,100,100,0.8)',
              textAlign: 'center',
              maxWidth: '85vw',
              minHeight: 24,
            }}
          >
            {typed}
          </p>

          {nothingMsg && !doneMsg && !error && (
            <p className="font-fell italic" style={{ marginTop: 20, fontSize: 16, color: 'rgba(200,100,100,0.6)' }}>
              Nothing to transfer.
            </p>
          )}

          {currentPrime !== null && (
            <div
              className="font-cinzel"
              style={{
                marginTop: 28,
                fontSize: 48,
                color: '#c8963a',
                opacity: primeVisible ? 1 : 0,
                transition: 'opacity 300ms ease-out',
              }}
            >
              {currentPrime}
            </div>
          )}

          {doneMsg && (
            <p
              className="font-fell italic"
              style={{
                marginTop: 28,
                fontSize: 16,
                color: 'rgba(200,100,100,0.6)',
                animation: 'shadowFadeIn 500ms ease-out',
              }}
            >
              The record is permanent now.
            </p>
          )}

          {error && (
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <p className="font-fell italic" style={{ fontSize: 14, color: 'rgba(200,80,80,0.7)' }}>
                The transfer failed. Try again.
              </p>
              <button
                className="font-cinzel"
                disabled={saving}
                onClick={() => void finish()}
                style={{
                  fontSize: 11,
                  letterSpacing: '0.28em',
                  background: 'rgba(200,80,80,0.1)',
                  border: '1px solid rgba(200,80,80,0.6)',
                  color: 'rgba(200,140,140,0.9)',
                  padding: '10px 24px',
                  cursor: saving ? 'default' : 'pointer',
                }}
              >
                RETRY
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes shadowTransferPulse {
          0%, 100% { box-shadow: 0 0 8px rgba(200,80,80,0.4); }
          50% { box-shadow: 0 0 20px rgba(200,80,80,0.9); }
        }
        @keyframes shadowPlayerPulse {
          0%, 100% { box-shadow: 0 0 10px rgba(91,79,212,0.6); }
          50% { box-shadow: 0 0 18px rgba(91,79,212,0.95); }
        }
        @keyframes shadowFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ShadowRealm;
