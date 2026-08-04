import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileOverlay, { ProfileButton } from '@/components/ProfileOverlay';
import BernardDialogue from '@/components/BernardDialogue';
import CharacterEye from '@/components/CharacterEye';
import { useAuth } from '@/context/AuthContext';
import { getAllFlags } from '@/lib/questFlags';
import { fetchOrCreateUser } from '@/lib/userData';
import { useBernardDialogue } from '@/hooks/useBernardDialogue';



const CELL = 56;
const COLS = 10;
const ROWS = 10;

type Cell = { col: number; row: number };

const TABLE_CELLS = new Set(['4,4', '4,5', '5,4', '5,5']);
const RETURN_CELLS = new Set(['4,9', '5,9']);
const ENTRANCE: Cell = { col: 9, row: 4 };
const SPAWN: Cell = { col: 8, row: 4 };

const WAYPOINTS: Cell[] = [
  { col: 3, row: 3 }, { col: 4, row: 3 }, { col: 5, row: 3 }, { col: 6, row: 3 },
  { col: 6, row: 4 }, { col: 6, row: 5 }, { col: 6, row: 6 },
  { col: 5, row: 6 }, { col: 4, row: 6 }, { col: 3, row: 6 },
  { col: 3, row: 5 }, { col: 3, row: 4 },
];

const AMBIENT = [
  { col: 1, row: 1, text: 'you found me' },
  { col: 7, row: 1, text: 'not many do' },
  { col: 3, row: 8, text: 'the bell still rings' },
];

const isWall = (c: number, r: number) => {
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return true;
  const k = `${c},${r}`;
  if (RETURN_CELLS.has(k)) return false;
  if (c === ENTRANCE.col && r === ENTRANCE.row) return false;
  if (c === 0 || c === 9 || r === 0 || r === 9) return true;
  if (TABLE_CELLS.has(k)) return true;
  return false;
};

const BernardRoom1 = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [flagsReady, setFlagsReady] = useState(false);
  const [auraColor, setAuraColor] = useState('#5b4fd4');
  // Stats feed the shared dialogue hook (level/social/perception/trade gates, credit grants).
  const [stats, setStats] = useState({ level: 1, social: 0, perception: 0, trade: 0, credits: 0, growthPoints: 0 });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      await getAllFlags(user.id);
      if (!cancelled) setFlagsReady(true);
      try {
        const row = await fetchOrCreateUser(user.id);
        if (cancelled) return;
        if (row.aura_color) setAuraColor(row.aura_color);
        const r = row as unknown as { level?: number; social?: number; credits?: number; growth_points?: number };
        setStats({
          level: r.level ?? 1,
          social: r.social ?? 0,
          credits: r.credits ?? 0,
          growthPoints: r.growth_points ?? 0,
        });
      } catch (e) {
        console.error('[BernardRoom1] fetchOrCreateUser failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Shared Bernard spine — this room reflects it and never advances it on its own.
  const { getBernardDialogue } = useBernardDialogue({
    user,
    currentLevel: stats.level,
    socialStat: stats.social,
    credits: stats.credits,
    growthPoints: stats.growthPoints,
    onCreditsChange: (next) => setStats((s) => ({ ...s, credits: next })),
    onGrowthPointsChange: (next) => setStats((s) => ({ ...s, growthPoints: next })),
  });

  const [pos, setPos] = useState<Cell>(SPAWN);
  const posRef = useRef<Cell>(SPAWN);
  const heldKeysRef = useRef<Set<string>>(new Set());
  const lastMoveTimeRef = useRef(0);

  const [bernardCell, setBernardCell] = useState<Cell>(WAYPOINTS[0]);
  const bernardCellRef = useRef<Cell>(WAYPOINTS[0]);
  const bernardSmoothRef = useRef({ x: WAYPOINTS[0].col, y: WAYPOINTS[0].row });
  const [bernardSmooth, setBernardSmooth] = useState({ x: WAYPOINTS[0].col, y: WAYPOINTS[0].row });
  const waypointIdxRef = useRef(0);
  const lastWaypointTimeRef = useRef(Date.now());

  const [nearBernard, setNearBernard] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const profileOpenRef = useRef(false);
  const [profileOpenDisplay, setProfileOpenDisplay] = useState(false);
  const openProfile = useCallback(() => { profileOpenRef.current = true; setProfileOpenDisplay(true); }, []);
  const closeProfile = useCallback(() => { profileOpenRef.current = false; setProfileOpenDisplay(false); }, []);

  const lastDialogCloseRef = useRef(0);
  const closeDialog = useCallback(() => {
    lastDialogCloseRef.current = Date.now();
    setDialogOpen(false);
  }, []);


  // One-time whispers on session entry — no quest-flag side effects here.

  const whispersShownRef = useRef(false);
  const [visibleWhisper, setVisibleWhisper] = useState<number | null>(null);
  const [whispersDone, setWhispersDone] = useState(false);
  useEffect(() => {
    if (whispersShownRef.current) return;
    whispersShownRef.current = true;
    const timeouts: number[] = [];
    const schedule = (i: number, inAt: number, outAt: number) => {
      timeouts.push(window.setTimeout(() => setVisibleWhisper(i), inAt));
      timeouts.push(window.setTimeout(() => setVisibleWhisper(null), outAt));
    };
    schedule(0, 1000, 3000);
    schedule(1, 3500, 5500);
    schedule(2, 6000, 8000);
    timeouts.push(window.setTimeout(() => setWhispersDone(true), 8200));
    return () => { timeouts.forEach((t) => window.clearTimeout(t)); };
  }, []);

  const tryMove = (dc: number, dr: number) => {
    const now = Date.now();
    if (now - lastMoveTimeRef.current < 130) return;
    if (dialogOpen) return;
    const cur = posRef.current;
    const sdc = dc === 0 ? 0 : dc > 0 ? 1 : -1;
    const sdr = dr === 0 ? 0 : dr > 0 ? 1 : -1;
    const nc = cur.col + sdc;
    const nr = cur.row + sdr;
    if (nc === cur.col && nr === cur.row) return;
    if (isWall(nc, nr)) return;
    lastMoveTimeRef.current = now;
    posRef.current = { col: nc, row: nr };
    setPos({ col: nc, row: nr });

    // return tile
    if (RETURN_CELLS.has(`${nc},${nr}`)) {
      sessionStorage.setItem('praem_maze_return_col', '2');
      sessionStorage.setItem('praem_maze_return_row', '14');
      navigate('/maze');
    }
  };

  // keyboard
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        heldKeysRef.current.add(e.key);
      }
    };
    const onUp = (e: KeyboardEvent) => { heldKeysRef.current.delete(e.key); };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // rAF
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const k = heldKeysRef.current;
      let dc = 0, dr = 0;
      if (k.has('ArrowLeft')) dc -= 1;
      if (k.has('ArrowRight')) dc += 1;
      if (k.has('ArrowUp')) dr -= 1;
      if (k.has('ArrowDown')) dr += 1;
      if (dc !== 0) tryMove(dc, 0);
      if (dr !== 0) tryMove(0, dr);

      // Bernard wander — only when player far
      const p = posRef.current;
      const bc = bernardCellRef.current;
      const dist = Math.max(Math.abs(p.col - bc.col), Math.abs(p.row - bc.row));
      const isNear = dist <= 2;
      if (isNear !== nearBernardRef.current) {
        nearBernardRef.current = isNear;
        setNearBernard(isNear);
      }

      const now = Date.now();
      if (!isNear && now - lastWaypointTimeRef.current > 1200) {
        waypointIdxRef.current = (waypointIdxRef.current + 1) % WAYPOINTS.length;
        const wp = WAYPOINTS[waypointIdxRef.current];
        bernardCellRef.current = wp;
        setBernardCell(wp);
        lastWaypointTimeRef.current = now;
      }

      // smooth lerp
      const target = bernardCellRef.current;
      const s = bernardSmoothRef.current;
      const nx = s.x + (target.col - s.x) * 0.08;
      const ny = s.y + (target.row - s.y) * 0.08;
      bernardSmoothRef.current = { x: nx, y: ny };
      setBernardSmooth({ x: nx, y: ny });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nearBernardRef = useRef(false);

  // Dialogue opens on proximity — content comes from the shared spine.
  useEffect(() => {
    if (!nearBernard) return;
    if (dialogOpen) return;
    if (!flagsReady || !user) return;
    if (Date.now() - lastDialogCloseRef.current < 3000) return;
    const dist = Math.max(Math.abs(pos.col - bernardCell.col), Math.abs(pos.row - bernardCell.row));
    if (dist > 2) return;
    setDialogOpen(true);
  }, [pos, nearBernard, bernardCell, dialogOpen, flagsReady, user]);

  // Bernard pupil offset toward player
  const pupilOffset = nearBernard
    ? {
        x: Math.sign(pos.col - bernardCell.col) * 1.5,
        y: Math.sign(pos.row - bernardCell.row) * 1.5,
      }
    : { x: 0, y: 0 };

  const roomLeft = (typeof window !== 'undefined' ? window.innerWidth : 1200) / 2 - (COLS * CELL) / 2;
  const roomTop = (typeof window !== 'undefined' ? window.innerHeight : 800) / 2 - (ROWS * CELL) / 2;

  const renderDialog = () => {
    if (!dialogOpen) return null;
    const d = getBernardDialogue();
    if (!d.text) return null;

    const actions: { label: string; onClick: () => void }[] = [];
    if (d.buttonLabel) {
      actions.push({
        label: d.buttonLabel.toUpperCase(),
        onClick: () => {
          d.buttonAction?.();
          closeDialog();
        },
      });
    }
    actions.push({ label: 'CLOSE', onClick: closeDialog });

    return (
      <BernardDialogue text={d.text} onShow={d.onShow}>
        {actions.map((a, i) => (
          <button
            key={i}
            type="button"
            onClick={a.onClick}
            className="font-cinzel"
            style={{
              background: i === 0 && d.buttonLabel ? 'rgba(169,140,255,0.15)' : 'transparent',
              border: '0.5px solid rgba(169,140,255,0.4)',
              color: i === 0 && d.buttonLabel ? '#a98cff' : 'rgba(160,140,200,0.6)',
              padding: '8px 18px', fontSize: 16, letterSpacing: '0.3em',
              cursor: 'pointer',
            }}
          >
            {a.label}
          </button>
        ))}
      </BernardDialogue>
    );
  };


  return (
    <div style={{ position: 'fixed', inset: 0, background: '#04040a', overflow: 'hidden' }}>
      {/* Warm grid */}
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'linear-gradient(rgba(120,100,60,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(120,100,60,0.08) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute', left: roomLeft, top: roomTop,
          width: COLS * CELL, height: ROWS * CELL,
        }}
      >
        {/* Walls */}
        {Array.from({ length: ROWS }).map((_, r) =>
          Array.from({ length: COLS }).map((__, c) => {
            const k = `${c},${r}`;
            const isReturn = RETURN_CELLS.has(k);
            const isTable = TABLE_CELLS.has(k);
            const isBorderWall = (c === 0 || c === 9 || r === 0 || r === 9) && !(c === ENTRANCE.col && r === ENTRANCE.row) && !isReturn;
            if (!isBorderWall && !isTable && !isReturn) return null;
            return (
              <div
                key={`cell-${k}`}
                style={{
                  position: 'absolute', left: c * CELL, top: r * CELL,
                  width: CELL, height: CELL,
                  background: isReturn
                    ? 'rgba(59,130,246,0.1)'
                    : isTable
                      ? '#1a1200'
                      : '#0d0d12',
                  border: isReturn
                    ? '1px solid #3b82f6'
                    : isTable
                      ? '1px solid rgba(200,150,58,0.4)'
                      : '1px solid #1a1a26',
                  boxSizing: 'border-box',
                  animation: isReturn ? 'bernardBluePulse 1.6s ease-in-out infinite' : undefined,
                }}
              />
            );
          })
        )}

        {/* Ambient text — one-time sequential whispers per session */}
        {!whispersDone && AMBIENT.map((a, i) => (
          <p
            key={`amb-${i}`}
            className="font-fell italic"
            style={{
              position: 'absolute', left: a.col * CELL + 6, top: a.row * CELL + CELL / 2 - 6,
              margin: 0, fontSize: 18, color: 'rgba(200,150,58,0.7)', pointerEvents: 'none',
              opacity: visibleWhisper === i ? 1 : 0,
              transition: 'opacity 600ms ease-in-out',
            }}
          >
            {a.text}
          </p>
        ))}

        {/* Bernard — CharacterEye (medium, gold) */}
        <CharacterEye
          cx={bernardSmooth.x * CELL + CELL / 2}
          cy={bernardSmooth.y * CELL + CELL / 2}
          color="#c8963a"
          size="medium"
          playerPosition={{ x: pos.col * CELL + CELL / 2, y: pos.row * CELL + CELL / 2 }}
          proximityRadius={CELL * 1.5}
        />

        {/* Whisper above Bernard when near */}
        {nearBernard && !dialogOpen && (
          <p
            className="font-fell italic"
            style={{
              position: 'absolute',
              left: bernardSmooth.x * CELL + CELL / 2 - 60,
              top: bernardSmooth.y * CELL - 20,
              width: 120, textAlign: 'center',
              fontSize: 18, color: '#a98cff', margin: 0,
              animation: 'bernardPulse 1.4s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          >
            ...
          </p>
        )}

        {/* Player */}
        <div
          style={{
            position: 'absolute',
            left: pos.col * CELL + CELL / 2 - 4,
            top: pos.row * CELL + CELL / 2 - 4,
            width: 8, height: 8, borderRadius: '50%',
            background: auraColor,
            boxShadow: `0 0 10px ${auraColor}b3`,
            transition: 'left 130ms linear, top 130ms linear',
          }}
        />
      </div>

      <style>{`
        @keyframes bernardPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.85; }
        }
        @keyframes bernardBluePulse {
          0%, 100% { box-shadow: 0 0 4px rgba(59,130,246,0.4); }
          50% { box-shadow: 0 0 14px rgba(59,130,246,0.8); }
        }
      `}</style>

      {/* D-pad */}
      <div
        style={{
          position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)',
          width: 120, height: 120, zIndex: 55,
        }}
      >
        {[
          { dc: 0, dr: -1, top: 0, left: 40 },
          { dc: -1, dr: 0, top: 40, left: 0 },
          { dc: 1, dr: 0, top: 40, left: 80 },
          { dc: 0, dr: 1, top: 80, left: 40 },
        ].map((b, i) => (
          <button
            key={i}
            onPointerDown={(e) => { e.preventDefault(); tryMove(b.dc, b.dr); }}
            style={{
              position: 'absolute', top: b.top, left: b.left, width: 40, height: 40,
              background: 'rgba(20,18,30,0.7)', border: '1px solid rgba(100,80,160,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: 0,
              userSelect: 'none', WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none', touchAction: 'none',
            }}
          >
            {i === 0 && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polygon points="7,2 13,12 1,12" fill="rgba(160,140,200,0.8)"/></svg>}
            {i === 1 && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polygon points="2,7 12,1 12,13" fill="rgba(160,140,200,0.8)"/></svg>}
            {i === 2 && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polygon points="12,7 2,1 2,13" fill="rgba(160,140,200,0.8)"/></svg>}
            {i === 3 && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polygon points="7,12 13,2 1,2" fill="rgba(160,140,200,0.8)"/></svg>}
          </button>
        ))}
      </div>

      {renderDialog()}

      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 60 }}>
        <ProfileButton onClick={openProfile} />
      </div>
      <ProfileOverlay isOpen={profileOpenDisplay} onClose={closeProfile} />
    </div>
  );
};

export default BernardRoom1;
