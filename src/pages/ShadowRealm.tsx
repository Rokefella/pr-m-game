import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchOrCreateUser, updateUser } from '@/lib/userData';
import { useAuth } from '@/context/AuthContext';
import { getAllFlags, setFlag } from '@/lib/questFlags';
import { supabase } from '@/lib/supabase';
import Thumbstick from '@/components/Thumbstick';

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

// ----- published shadow realm level data -----
type RealmCell = { col: number; row: number; type?: string; color?: string; name?: string };
type PlacedCell = { x: number; y: number; color?: string; name?: string };


// GARDEN_DOOR — room key derived from the real current month,
// e.g. garden + season + month name ("gardenautumnseptember").
const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const gardenRoomKey = (): string => {
  const month = new Date().getMonth();
  const season = month <= 1 || month === 11 ? 'winter' : month <= 4 ? 'spring' : month <= 7 ? 'summer' : 'autumn';
  return `garden${season}${MONTH_NAMES[month]}`;
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

  // Fallback transfer point: centered on screen, slightly above player start.
  const TRANSFER_OFFSET_Y = -120;

  // ----- published level data (graceful fallback when nothing published) -----
  const [hasLevelData, setHasLevelData] = useState(false);
  const [walls, setWalls] = useState<PlacedCell[]>([]);
  const [ghostZones, setGhostZones] = useState<PlacedCell[]>([]);
  const [eyes, setEyes] = useState<PlacedCell[]>([]);
  const [npcs, setNpcs] = useState<PlacedCell[]>([]);
  const [drops, setDrops] = useState<PlacedCell[]>([]);
  const [transferOffset, setTransferOffset] = useState({ x: 0, y: TRANSFER_OFFSET_Y });
  const transferOffsetRef = useRef({ x: 0, y: TRANSFER_OFFSET_Y });
  const wallSetRef = useRef<Set<string>>(new Set());
  const roomDoorsRef = useRef<PlacedCell[]>([]);
  const [roomDoors, setRoomDoors] = useState<PlacedCell[]>([]);
  const [gateMsg, setGateMsg] = useState<string | null>(null);
  const gateTimerRef = useRef<number | null>(null);

  const showGateMsg = useCallback((line: string) => {
    setGateMsg(line);
    if (gateTimerRef.current) window.clearTimeout(gateTimerRef.current);
    gateTimerRef.current = window.setTimeout(() => setGateMsg(null), 3000);
  }, []);

  // Load the published shadow realm layout for the player's current level.
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      const level = currentLevelRef.current;
      const { data } = await supabase
        .from('special_locations' as never)
        .select('data')
        .eq('level_number', level)
        .eq('location_key', 'shadow_realm')
        .maybeSingle();
      if (cancelled || !data) return;

      const d = (data as { data?: { extraCells?: RealmCell[]; start?: { col: number; row: number } | null } })?.data;
      const cells = Array.isArray(d?.extraCells) ? d!.extraCells! : [];
      if (cells.length === 0) return;

      // Origin: the published start cell if present, else the first cell.
      const origin = d?.start && typeof d.start.col === 'number'
        ? { col: d.start.col, row: d.start.row }
        : { col: cells[0].col, row: cells[0].row };
      const toPx = (c: RealmCell): PlacedCell => ({
        x: (c.col - origin.col) * STEP,
        y: (c.row - origin.row) * STEP,
        color: c.color,
        name: c.name,
      });

      const nextWalls: PlacedCell[] = [];
      const nextGhosts: PlacedCell[] = [];
      const nextEyes: PlacedCell[] = [];
      const nextNpcs: PlacedCell[] = [];
      const nextDrops: PlacedCell[] = [];
      const nextDoors: PlacedCell[] = [];
      let transfer: PlacedCell | null = null;

      cells.forEach((c) => {
        if (!c || typeof c.col !== 'number' || typeof c.row !== 'number') return;
        const p = toPx(c);
        switch (c.type) {
          case 'WALL': nextWalls.push(p); break;
          case 'GHOST_ZONE': nextGhosts.push(p); break;
          case 'EYE': nextEyes.push(p); break;
          case 'NPC': nextNpcs.push(p); break;
          case 'DROP': nextDrops.push(p); break;
          case 'GARDEN_DOOR': nextDoors.push(p); break;
          case 'TRANSFER_POINT': if (!transfer) transfer = p; break;
          default: break;
        }
      });

      if (cancelled) return;
      setWalls(nextWalls);
      setGhostZones(nextGhosts);
      setEyes(nextEyes);
      setNpcs(nextNpcs);
      setDrops(nextDrops);
      setRoomDoors(nextDoors);
      roomDoorsRef.current = nextDoors;
      wallSetRef.current = new Set(nextWalls.map((w) => `${w.x},${w.y}`));
      if (transfer) {
        const t = transfer as PlacedCell;
        setTransferOffset({ x: t.x, y: t.y });
        transferOffsetRef.current = { x: t.x, y: t.y };
      }
      setHasLevelData(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, currentLevel]);


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
      // Walls from the published layout block movement.
      if (wallSetRef.current.has(`${next.x},${next.y}`)) return;
      posRef.current = next;
      setPos(next);

      if (stepsRef.current > 0) {
        stepsRef.current -= 1;
        setStepsRemaining(stepsRef.current);
      }

      const t = transferOffsetRef.current;
      const dist = Math.hypot(next.x - t.x, next.y - t.y);
      if (dist <= 20) startTransfer();

      // GARDEN_DOOR — only opens on the 23rd of any month; the room is
      // derived from the real current month.
      const door = roomDoorsRef.current.find((d) => d.x === next.x && d.y === next.y);
      if (door) {
        const isTwentyThird = new Date().getDate() === 23;
        if (isTwentyThird) {
          navigate(`/room/${currentLevelRef.current}/${gardenRoomKey()}`);
        } else {
          showGateMsg('This does not open yet.');
        }
      }
    },
    [startTransfer, navigate, showGateMsg],
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

      {/* Ghost dots — decorative fallback when no level is published */}
      {!hasLevelData &&
        GHOSTS.map((g, i) => (
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

      {/* World container — translates with the player so the realm scrolls */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${-pos.x}px, ${-pos.y}px)`,
        }}
      >
      {/* Published layout — walls */}
      {walls.map((w, i) => (
        <div
          key={`w${i}`}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: STEP,
            height: STEP,
            marginLeft: -STEP / 2 + w.x,
            marginTop: -STEP / 2 + w.y,
            background: 'rgba(30,10,14,0.95)',
            border: '1px solid rgba(180,60,60,0.22)',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Published layout — ghost zones */}
      {ghostZones.map((g, i) => (
        <div
          key={`g${i}`}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: STEP,
            height: STEP,
            marginLeft: -STEP / 2 + g.x,
            marginTop: -STEP / 2 + g.y,
            background: 'rgba(91,79,212,0.10)',
            border: '1px solid rgba(91,79,212,0.20)',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Published layout — eyes */}
      {eyes.map((e, i) => (
        <div
          key={`e${i}`}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 10,
            height: 10,
            marginLeft: -5 + e.x,
            marginTop: -5 + e.y,
            borderRadius: '50%',
            border: '1px solid rgba(200,100,100,0.6)',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Published layout — NPCs */}
      {npcs.map((n, i) => (
        <div
          key={`n${i}`}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 8,
            height: 8,
            marginLeft: -4 + n.x,
            marginTop: -4 + n.y,
            background: 'rgba(200,150,58,0.8)',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Published layout — drops */}
      {drops.map((d, i) => (
        <div
          key={`d${i}`}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 6,
            height: 6,
            marginLeft: -3 + d.x,
            marginTop: -3 + d.y,
            background: 'rgba(26,158,122,0.7)',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Published layout — room doors */}
      {roomDoors.map((d, i) => (
        <div
          key={`rd${i}`}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: STEP,
            height: STEP,
            marginLeft: -STEP / 2 + d.x,
            marginTop: -STEP / 2 + d.y,
            border: '1px solid rgba(169,140,255,0.6)',
            background: 'rgba(169,140,255,0.08)',
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
          marginLeft: -TRANSFER_SIZE / 2 + transferOffset.x,
          marginTop: -TRANSFER_SIZE / 2 + transferOffset.y,
          border: '1px solid rgba(200,80,80,0.8)',
          background: 'rgba(200,80,80,0.06)',
          animation: 'shadowTransferPulse 2s ease-in-out infinite',
        }}
      />
      </div>

      {/* Gate message */}
      {gateMsg && (
        <div
          className="font-fell italic"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            top: '38%',
            textAlign: 'center',
            fontSize: 16,
            color: 'rgba(200,100,100,0.75)',
            pointerEvents: 'none',
            animation: 'shadowFadeIn 400ms ease-out',
          }}
        >
          {gateMsg}
        </div>
      )}

      {/* Player — fixed at screen center; the world moves instead */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 8,
          height: 8,
          marginLeft: -4,
          marginTop: -4,
          borderRadius: '50%',
          background: '#5b4fd4',
          boxShadow: '0 0 12px rgba(91,79,212,0.8)',
          animation: 'shadowPlayerPulse 2s ease-in-out infinite',
        }}
      />

      <Thumbstick onMove={(dc, dr) => move(dc, dr)} disabled={transferring} />

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
