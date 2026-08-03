import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { fetchOrCreateUser } from '@/lib/userData';
import { supabase } from '@/lib/supabase';

const CELL = 20;
const STEP = 12;

type Rect = { id: string; x: number; y: number; w: number; h: number };
type RoomCell = {
  col: number;
  row: number;
  type: string;
  exit?: { destination?: string } | null;
};
type ExitTile = Rect & { destination: string };
type RoomLayout = {
  wallTiles: Rect[];
  furnitureTiles: Rect[];
  exitTiles: ExitTile[];
  gridSize: number;
  start: { col: number; row: number } | null;
};

// Same wall/furniture visuals as the village
const WallCell = memo(() => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
  >
    <rect width="20" height="20" fill="#3a3548" />
    <rect x="0.3" y="0.3" width="19.4" height="19.4" fill="none" stroke="rgba(140,120,200,0.25)" strokeWidth="0.4" />
    <line x1="0" y1="6.5" x2="20" y2="6.5" stroke="rgba(15,12,25,0.5)" strokeWidth="0.6" />
    <line x1="0" y1="13.5" x2="20" y2="13.5" stroke="rgba(15,12,25,0.5)" strokeWidth="0.6" />
    <rect x="0" y="0" width="20" height="1.2" fill="rgba(170,150,220,0.18)" />
  </svg>
));

const FurnitureCell = memo(() => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
  >
    <rect width="20" height="20" fill="rgba(15,18,28,0.3)" />
    <rect x="2" y="3" width="16" height="14" rx="1.2" fill="#6b4a2e" stroke="#8a6540" strokeWidth="0.5" />
    <path d="M2,6 Q10,5 18,6" fill="none" stroke="rgba(140,100,60,0.5)" strokeWidth="0.4" />
    <path d="M2,9.5 Q10,8.7 18,9.5" fill="none" stroke="rgba(140,100,60,0.4)" strokeWidth="0.4" />
    <path d="M2,13 Q10,12.3 18,13" fill="none" stroke="rgba(140,100,60,0.4)" strokeWidth="0.4" />
    <rect x="2" y="3" width="16" height="2.2" rx="1" fill="rgba(200,160,110,0.25)" />
  </svg>
));

const EXIT_ROUTES: Record<string, string> = {
  village: '/village',
  maze: '/maze',
  shadow_realm: '/shadow',
};

const LibraryRoom = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [currentLevel, setCurrentLevel] = useState(1);
  const [room, setRoom] = useState<RoomLayout | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);
  const [auraColor, setAuraColor] = useState('#a98cff');

  const [player, setPlayer] = useState({ x: 0, y: 0 });
  const playerRef = useRef({ x: 0, y: 0 });
  const playerTargetRef = useRef({ x: 0, y: 0 });
  const roomRef = useRef<RoomLayout | null>(null);
  const loadingRef = useRef(true);
  const navigatedRef = useRef(false);
  const moveRef = useRef<(dx: number, dy: number) => void>(() => {});

  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { loadingRef.current = roomLoading; }, [roomLoading]);

  // Auth gate + level source of truth (users table)
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    let cancelled = false;
    void (async () => {
      const row = await fetchOrCreateUser(user.id);
      if (cancelled || !row) return;
      setCurrentLevel(row.level);
      if (row.aura_color) setAuraColor(row.aura_color);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading, navigate]);

  // Load the library room layout for the current level
  useEffect(() => {
    if (authLoading || !user || !currentLevel) return;
    let cancelled = false;

    const loadRoom = async () => {
      setRoomLoading(true);
      try {
        const { data: roomRow } = await supabase
          .from('special_locations' as never)
          .select('data')
          .eq('level_number', currentLevel)
          .eq('location_key', 'library')
          .maybeSingle();

        if (cancelled) return;

        const rData = (roomRow as {
          data?: {
            extraCells?: RoomCell[];
            grid_size?: number;
            gridSize?: number;
            start?: { col?: number; row?: number } | null;
          };
        } | null)?.data;

        const cells = rData?.extraCells ?? [];
        if (!Array.isArray(cells) || cells.length === 0) {
          if (!cancelled) {
            setRoom(null);
            setRoomLoading(false);
          }
          return;
        }

        const wallTiles: Rect[] = [];
        const furnitureTiles: Rect[] = [];
        const exitTiles: ExitTile[] = [];

        cells.forEach((cell) => {
          if (!cell || typeof cell.col !== 'number' || typeof cell.row !== 'number') return;
          const x = cell.col * CELL;
          const y = cell.row * CELL;
          switch (cell.type) {
            case 'WALL':
              wallTiles.push({ id: `wall-${cell.col}-${cell.row}`, x, y, w: CELL, h: CELL });
              break;
            case 'FURNITURE':
              furnitureTiles.push({ id: `furn-${cell.col}-${cell.row}`, x, y, w: CELL, h: CELL });
              break;
            case 'ROOM_EXIT':
              exitTiles.push({
                id: `exit-${cell.col}-${cell.row}`,
                x,
                y,
                w: CELL,
                h: CELL,
                destination: cell.exit?.destination ?? 'village',
              });
              break;
            default:
              break;
          }
        });

        let gridSize = Number(rData?.grid_size ?? rData?.gridSize ?? 0);
        if (!Number.isFinite(gridSize) || gridSize <= 0) {
          gridSize = cells.reduce(
            (m, c) => Math.max(m, (c?.col ?? 0) + 1, (c?.row ?? 0) + 1),
            1,
          );
        }
        const rawStart = rData?.start;
        const start =
          rawStart && typeof rawStart.col === 'number' && typeof rawStart.row === 'number'
            ? { col: rawStart.col, row: rawStart.row }
            : null;

        const layout: RoomLayout = { wallTiles, furnitureTiles, exitTiles, gridSize, start };

        const sp = start
          ? { x: start.col * CELL, y: start.row * CELL }
          : { x: (gridSize * CELL) / 2, y: (gridSize * CELL) / 2 };
        playerRef.current = sp;
        playerTargetRef.current = sp;

        if (!cancelled) {
          setPlayer(sp);
          setRoom(layout);
          setRoomLoading(false);
        }
      } catch (e) {
        if (!cancelled) setRoomLoading(false);
        console.warn('[LibraryRoom] layout load failed', e);
      }
    };

    void loadRoom();
    return () => { cancelled = true; };
  }, [user, authLoading, currentLevel]);

  const obstacles = useMemo<Rect[]>(
    () => [...(room?.wallTiles ?? []), ...(room?.furnitureTiles ?? [])],
    [room],
  );

  const mapSize = useMemo(() => {
    const size = (room?.gridSize ?? 1) * CELL;
    return { w: size, h: size };
  }, [room]);

  // Movement + collision — same approach as the village
  const move = (dx: number, dy: number) => {
    if (loadingRef.current || !roomRef.current) return;
    const prev = playerTargetRef.current;
    const nx = Math.max(0, Math.min(mapSize.w, prev.x + dx));
    const ny = Math.max(0, Math.min(mapSize.h, prev.y + dy));

    // Room exits: bumping fires the transition and cancels the move
    for (const ex of roomRef.current.exitTiles) {
      if (nx >= ex.x - 2 && nx <= ex.x + ex.w + 2 && ny >= ex.y - 2 && ny <= ex.y + ex.h + 2) {
        if (!navigatedRef.current) {
          const target = EXIT_ROUTES[ex.destination] ?? '/village';
          navigatedRef.current = true;
          window.setTimeout(() => navigate(target), 400);
        }
        return;
      }
    }

    // Solid cells with 2px padding
    for (const o of obstacles) {
      if (nx >= o.x - 2 && nx <= o.x + o.w + 2 && ny >= o.y - 2 && ny <= o.y + o.h + 2) {
        return;
      }
    }

    playerTargetRef.current = { x: nx, y: ny };
  };
  moveRef.current = move;

  // Held-keys arrow movement
  const heldKeysRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const ARROWS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
    const onDown = (e: KeyboardEvent) => {
      if (ARROWS.has(e.key)) {
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

  // Player lerp loop
  useEffect(() => {
    let raf = 0;
    let keyFrameCounter = 0;
    const loop = () => {
      keyFrameCounter++;
      if (keyFrameCounter >= 2) {
        keyFrameCounter = 0;
        const held = heldKeysRef.current;
        let kdx = 0, kdy = 0;
        if (held.has('ArrowLeft')) kdx -= STEP;
        if (held.has('ArrowRight')) kdx += STEP;
        if (held.has('ArrowUp')) kdy -= STEP;
        if (held.has('ArrowDown')) kdy += STEP;
        if (kdx !== 0 && kdy !== 0) { kdx *= 0.707; kdy *= 0.707; }
        if (kdx !== 0 || kdy !== 0) moveRef.current(kdx, kdy);
      }

      const target = playerTargetRef.current;
      const cur = playerRef.current;
      const dx = target.x - cur.x;
      const dy = target.y - cur.y;
      if (Math.hypot(dx, dy) < 0.5) {
        if (cur.x !== target.x || cur.y !== target.y) {
          playerRef.current = { x: target.x, y: target.y };
          setPlayer(playerRef.current);
        }
      } else {
        playerRef.current = { x: cur.x + dx * 0.18, y: cur.y + dy * 0.18 };
        setPlayer(playerRef.current);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#04040a', overflow: 'hidden' }}>
      <style>{`
        @keyframes playerPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.6; } }
        @keyframes roomPulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.9; } }
      `}</style>

      {/* Header */}
      <div
        className="font-cinzel"
        style={{
          position: 'absolute',
          top: 18,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 13,
          letterSpacing: '0.3em',
          color: 'rgba(200,196,186,0.6)',
          zIndex: 6,
          pointerEvents: 'none',
        }}
      >
        THE LIBRARY
      </div>

      {roomLoading && (
        <div
          className="font-cinzel"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            letterSpacing: '0.2em',
            color: 'rgba(160,140,200,0.5)',
            animation: 'roomPulse 2s ease-in-out infinite',
            zIndex: 5,
          }}
        >
          LOADING
        </div>
      )}

      {!roomLoading && !room && (
        <div
          className="font-fell italic"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            fontSize: 18,
            color: '#9a9890',
            zIndex: 5,
          }}
        >
          <span>The shelves are empty here.</span>
          <button
            className="font-cinzel"
            onClick={() => navigate('/village')}
            style={{
              background: 'transparent',
              color: '#9a9890',
              padding: '10px 22px',
              fontSize: 13,
              letterSpacing: '0.3em',
              border: '0.5px solid #5a5855',
              borderRadius: 0,
              cursor: 'pointer',
            }}
          >
            LEAVE
          </button>
        </div>
      )}

      {!roomLoading && room && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: mapSize.w,
            height: mapSize.h,
            transform: `translate(${-mapSize.w / 2}px, ${-mapSize.h / 2}px)`,
            marginLeft: 0,
            marginTop: 0,
          }}
        >
          {/* Grid overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'linear-gradient(rgba(100,80,160,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(100,80,160,0.08) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {/* Exits */}
          {room.exitTiles.map((ex) => (
            <div
              key={`exit-${ex.x}-${ex.y}`}
              style={{
                position: 'absolute',
                left: ex.x,
                top: ex.y,
                width: CELL,
                height: CELL,
                background: 'rgba(200,148,58,0.35)',
                boxShadow: '0 0 12px rgba(200,148,58,0.6)',
                animation: 'roomPulse 2.4s ease-in-out infinite',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            />
          ))}

          {/* Walls & furniture */}
          {room.wallTiles.map((w) => (
            <div
              key={`wall-${w.x}-${w.y}`}
              style={{ position: 'absolute', left: w.x, top: w.y, width: CELL, height: CELL, pointerEvents: 'none', zIndex: 3 }}
            >
              <WallCell />
            </div>
          ))}
          {room.furnitureTiles.map((f) => (
            <div
              key={`furn-${f.x}-${f.y}`}
              style={{ position: 'absolute', left: f.x, top: f.y, width: CELL, height: CELL, pointerEvents: 'none', zIndex: 3 }}
            >
              <FurnitureCell />
            </div>
          ))}

          {/* Player dot */}
          <div
            style={{
              position: 'absolute',
              left: player.x - 4,
              top: player.y - 4,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: auraColor,
              boxShadow: `0 0 8px ${auraColor}`,
              animation: 'playerPulse 1.6s ease-in-out infinite',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default LibraryRoom;
