import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { fetchOrCreateUser } from '@/lib/userData';
import { supabase } from '@/lib/supabase';
import { setFlag } from '@/lib/questFlags';
import { checkSubscriptionStatus } from '@/lib/subscriptionStatus';
import NpcDialogue from '@/components/NpcDialogue';
import { useNpcDialogue } from '@/hooks/useNpcDialogue';

import alexandraMarkerUrl from '@/assets/alexandra_marker.svg';
import architectMarkerUrl from '@/assets/architect_marker.svg';
import bankerMarkerUrl from '@/assets/banker_marker.svg';
import bernardMarkerUrl from '@/assets/bernard_marker.svg';
import chefMarkerUrl from '@/assets/chef_marker.svg';
import hackerMarkerUrl from '@/assets/hacker_marker.svg';
import mayorMarkerUrl from '@/assets/mayor_marker.svg';
import merchantMarkerUrl from '@/assets/merchant_marker.svg';
import painterMarkerUrl from '@/assets/painter_marker.svg';
import priestMarkerUrl from '@/assets/priest_marker.svg';

const CELL = 20;
const STEP = 12;

/** Bundled marker assets, keyed by their file name (what `npcs.marker_asset` stores). */
const MARKER_ASSETS: Record<string, string> = {
  'alexandra_marker.svg': alexandraMarkerUrl,
  'architect_marker.svg': architectMarkerUrl,
  'banker_marker.svg': bankerMarkerUrl,
  'bernard_marker.svg': bernardMarkerUrl,
  'chef_marker.svg': chefMarkerUrl,
  'hacker_marker.svg': hackerMarkerUrl,
  'mayor_marker.svg': mayorMarkerUrl,
  'merchant_marker.svg': merchantMarkerUrl,
  'painter_marker.svg': painterMarkerUrl,
  'priest_marker.svg': priestMarkerUrl,
};

const resolveMarker = (asset: string | null | undefined, npcKey: string): string => {
  if (asset) {
    const file = asset.split('/').pop() ?? asset;
    if (MARKER_ASSETS[file]) return MARKER_ASSETS[file];
    if (asset.startsWith('/') || asset.startsWith('http')) return asset;
  }
  return MARKER_ASSETS[`${npcKey}_marker.svg`] ?? bernardMarkerUrl;
};

/** Legacy typed NPC cells map onto their npc_key. */
const TYPE_NPC_KEYS: Record<string, string> = {
  BERNARD: 'bernard',
  MERCHANT: 'merchant',
  BANKER: 'banker',
};

type Rect = { id: string; x: number; y: number; w: number; h: number };
type RugTrim = { top: boolean; bottom: boolean; left: boolean; right: boolean };
type RugTile = { id: string; x: number; y: number; trim: RugTrim };
type RoomCell = {
  col: number;
  row: number;
  type: string;
  npc_key?: string | null;
  npc_name?: string | null;
  exit?: { destination?: string } | null;
};
type ExitTile = Rect & { destination: string };
type NpcPlacement = { id: string; npcKey: string; x: number; y: number };
type RoomLayout = {
  wallTiles: Rect[];
  furnitureTiles: Rect[];
  bookcaseTiles: Rect[];
  lightTiles: Rect[];
  rugTiles: RugTile[];
  exitTiles: ExitTile[];
  npcs: NpcPlacement[];
  gridSize: number;
  start: { col: number; row: number } | null;
};

const WallCell = memo(() => (
  <svg width="20" height="20" viewBox="0 0 20 20" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
    <rect width="20" height="20" fill="#3a3548" />
    <rect x="0.3" y="0.3" width="19.4" height="19.4" fill="none" stroke="rgba(140,120,200,0.25)" strokeWidth="0.4" />
    <line x1="0" y1="6.5" x2="20" y2="6.5" stroke="rgba(15,12,25,0.5)" strokeWidth="0.6" />
    <line x1="0" y1="13.5" x2="20" y2="13.5" stroke="rgba(15,12,25,0.5)" strokeWidth="0.6" />
    <rect x="0" y="0" width="20" height="1.2" fill="rgba(170,150,220,0.18)" />
  </svg>
));

const FurnitureCell = memo(() => (
  <svg width="20" height="20" viewBox="0 0 20 20" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
    <rect width="20" height="20" fill="rgba(15,18,28,0.3)" />
    <rect x="2" y="3" width="16" height="14" rx="1.2" fill="#6b4a2e" stroke="#8a6540" strokeWidth="0.5" />
    <path d="M2,6 Q10,5 18,6" fill="none" stroke="rgba(140,100,60,0.5)" strokeWidth="0.4" />
    <path d="M2,9.5 Q10,8.7 18,9.5" fill="none" stroke="rgba(140,100,60,0.4)" strokeWidth="0.4" />
    <path d="M2,13 Q10,12.3 18,13" fill="none" stroke="rgba(140,100,60,0.4)" strokeWidth="0.4" />
    <rect x="2" y="3" width="16" height="2.2" rx="1" fill="rgba(200,160,110,0.25)" />
  </svg>
));

const BOOKCASE_SPINE_COLORS = ['#8a3a3a', '#3a6a5a', '#c8963a', '#3a4a7a', '#7a5535'];

const BookcaseCell = memo(({ col, row }: { col: number; row: number }) => {
  let seed = (col * 73856093) ^ (row * 19349663);
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const spines: { x: number; w: number; fill: string }[] = [];
  let x = 2.5;
  for (let i = 0; i < 9; i++) {
    const w = 1.2 + rand() * 0.6;
    if (x + w > 17.4) break;
    spines.push({ x, w, fill: BOOKCASE_SPINE_COLORS[Math.floor(rand() * BOOKCASE_SPINE_COLORS.length)] });
    x += w + 0.45;
  }
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <rect width="20" height="20" fill="rgba(15,18,28,0.3)" />
      <rect x="1.5" y="2" width="17" height="16" rx="1" fill="#5a3d24" stroke="#7a5535" strokeWidth="0.5" />
      {spines.map((s) => (
        <rect key={s.x} x={s.x} y={3.2} width={s.w} height={13.6} fill={s.fill} />
      ))}
      <rect x="1.5" y="2" width="17" height="1.3" rx="0.5" fill="rgba(200,160,110,0.3)" />
    </svg>
  );
});

const LightCell = memo(() => (
  <svg width="20" height="20" viewBox="0 0 20 20" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
    <defs>
      <radialGradient id="dynamicRoomLampGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#f4d78a" stopOpacity="0.5" />
        <stop offset="45%" stopColor="#e8b84a" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#e8b84a" stopOpacity="0" />
      </radialGradient>
    </defs>
    <ellipse
      cx="10"
      cy="10"
      rx="9"
      ry="9"
      fill="url(#dynamicRoomLampGlow)"
      style={{ animation: 'glowPulse 3.2s ease-in-out infinite', transformOrigin: '10px 10px' }}
    />
    <rect x="7" y="7" width="6" height="6" rx="1" fill="#3a2f1a" stroke="#7a5535" strokeWidth="0.5" />
    <rect x="8.5" y="8.3" width="3" height="3.4" rx="0.4" fill="#f4d78a" fillOpacity="0.75" />
  </svg>
));

const RugCell = memo(({ trim }: { trim: RugTrim }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
    <rect width="20" height="20" fill="#5a2020" fillOpacity="0.4" />
    <path d="M10,5 L14,10 L10,15 L6,10 Z" fill="none" stroke="rgba(200,160,110,0.18)" strokeWidth="0.3" />
    {trim.top && <line x1="0.6" y1="0.6" x2="19.4" y2="0.6" stroke="rgba(200,160,110,0.35)" strokeWidth="0.6" />}
    {trim.bottom && <line x1="0.6" y1="19.4" x2="19.4" y2="19.4" stroke="rgba(200,160,110,0.35)" strokeWidth="0.6" />}
    {trim.left && <line x1="0.6" y1="0.6" x2="0.6" y2="19.4" stroke="rgba(200,160,110,0.35)" strokeWidth="0.6" />}
    {trim.right && <line x1="19.4" y1="0.6" x2="19.4" y2="19.4" stroke="rgba(200,160,110,0.35)" strokeWidth="0.6" />}
  </svg>
));

const EXIT_ROUTES: Record<string, string> = {
  village: '/village',
  maze: '/maze',
  shadow_realm: '/shadow',
};

const ROOM_TITLES: Record<string, string> = {
  library: 'THE LIBRARY',
  exchange: 'THE EXCHANGE',
  bernard_room: "BERNARD'S ROOM",
};

const dialogueButtonStyle = {
  background: 'rgba(200,150,58,0.18)',
  border: '0.5px solid rgba(200,150,58,0.5)',
  color: '#c8963a',
  padding: '6px 12px',
  fontSize: 20,
  letterSpacing: '0.02em',
  cursor: 'pointer',
  width: '100%',
  boxSizing: 'border-box' as const,
};

type NpcStats = {
  user: { id: string } | null;
  currentLevel: number;
  socialStat: number;
  perceptionStat: number;
  tradeStat: number;
  credits: number;
  growthPoints: number;
};

type NpcActorProps = {
  placement: NpcPlacement;
  displayName: string;
  markerSrc: string;
  stats: NpcStats;
  isOpen: boolean;
  onClose: () => void;
  onReadyChange: (npcKey: string, ready: boolean) => void;
  onCreditsChange: (n: number) => void;
  onGrowthPointsChange: (n: number) => void;
  onMessage: (msg: string) => void;
  openSignal: number;
};

/**
 * One NPC present in the room: marker (with purely visual wander drift) plus
 * its own dialogue state through the shared hook. One component instance per
 * NPC so any number of NPCs can coexist in a single room.
 */
const NpcActor = ({
  placement,
  displayName,
  markerSrc,
  stats,
  isOpen,
  onClose,
  onReadyChange,
  onCreditsChange,
  onGrowthPointsChange,
  onMessage,
  openSignal,
}: NpcActorProps) => {
  const { npcKey, x, y } = placement;

  const {
    resolvedDialogue,
    resetBernardBucket,
    bumpFlags,
    isReady,
  } = useNpcDialogue(npcKey, {
    user: stats.user,
    currentLevel: stats.currentLevel,
    socialStat: stats.socialStat,
    perceptionStat: stats.perceptionStat,
    tradeStat: stats.tradeStat,
    credits: stats.credits,
    growthPoints: stats.growthPoints,
    isOpen,
    onCreditsChange,
    onGrowthPointsChange,
    onCloseDialogue: onClose,
    onMessage,
    onAcceptAlexandraQuest: () => {
      void (async () => {
        if (!stats.user) return;
        const status = await checkSubscriptionStatus(stats.user.id);
        const allowed = status === 'active' || status === 'lifetime' || status === 'dev' || status === 'trial';
        if (allowed) {
          await setFlag(stats.user.id, 'alexandra_quest', 'active');
          if (npcKey === 'bernard') await setFlag(stats.user.id, 'bernard_stage', '6');
          bumpFlags();
        } else {
          window.dispatchEvent(new Event('praem:open-paywall'));
        }
      })();
    },
  });

  useEffect(() => {
    onReadyChange(npcKey, isReady);
  }, [npcKey, isReady, onReadyChange]);

  // Reset the conversation position each time this NPC's dialogue is opened.
  useEffect(() => {
    if (openSignal > 0) resetBernardBucket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSignal]);

  // Wander: slow, purely visual drift within a 1–2 tile radius of the placed cell.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const radius = CELL * (1 + Math.random());
    const tick = () => {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      setOffset({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    };
    const id = window.setInterval(tick, 2600 + Math.random() * 1800);
    return () => window.clearInterval(id);
  }, [npcKey]);

  const mx = x + offset.x;
  const my = y + offset.y;

  return (
    <>
      <img
        src={markerSrc}
        alt={displayName}
        width={24}
        height={24}
        style={{
          position: 'absolute',
          left: mx - 12,
          top: my - 12,
          pointerEvents: 'none',
          zIndex: 4,
          transition: 'left 2.4s ease-in-out, top 2.4s ease-in-out',
        }}
      />

      {isOpen && resolvedDialogue && (
        <NpcDialogue
          npcName={displayName}
          npcPortraitSrc={markerSrc}
          text={resolvedDialogue.text}
          onShow={resolvedDialogue.onShow}
        >
          {(resolvedDialogue.options ?? []).map((o, i) => (
            <button
              key={`${o.label}-${i}`}
              type="button"
              className="font-cinzel"
              onClick={() => {
                o.onSelect();
                if (o.closes) onClose();
              }}
              style={dialogueButtonStyle}
            >
              {o.label.toUpperCase()}
            </button>
          ))}
          {!(resolvedDialogue.options ?? []).length && resolvedDialogue.buttonLabel && (
            <button
              type="button"
              className="font-cinzel"
              onClick={() => {
                resolvedDialogue.buttonAction?.();
                onClose();
              }}
              style={dialogueButtonStyle}
            >
              {resolvedDialogue.buttonLabel.toUpperCase()}
            </button>
          )}
          <button
            type="button"
            className="font-cinzel"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '0.5px solid rgba(160,140,200,0.3)',
              color: 'rgba(160,140,200,0.5)',
              padding: '8px 18px',
              fontSize: 20,
              letterSpacing: '0.3em',
              cursor: 'pointer',
            }}
          >
            CLOSE
          </button>
        </NpcDialogue>
      )}
    </>
  );
};

const DynamicRoom = () => {
  const navigate = useNavigate();
  const params = useParams<{ levelNumber: string; locationKey: string }>();
  const locationKey = params.locationKey ?? '';
  const routeLevel = Number(params.levelNumber);
  const levelNumber = Number.isFinite(routeLevel) && routeLevel > 0 ? routeLevel : 1;

  const { user, loading: authLoading } = useAuth();

  const [room, setRoom] = useState<RoomLayout | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);
  const [auraColor, setAuraColor] = useState('#a98cff');

  const [currentLevel, setCurrentLevel] = useState(levelNumber);
  const [socialStat, setSocialStat] = useState(0);
  const [perceptionStat, setPerceptionStat] = useState(0);
  const [tradeStat, setTradeStat] = useState(0);
  const [credits, setCredits] = useState(0);
  const [growthPoints, setGrowthPoints] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const [npcMeta, setNpcMeta] = useState<Record<string, { name: string; marker: string }>>({});
  const [openNpcKey, setOpenNpcKey] = useState<string | null>(null);
  const [openSignals, setOpenSignals] = useState<Record<string, number>>({});
  const npcReadyRef = useRef<Record<string, boolean>>({});
  const npcLockRef = useRef<Record<string, boolean>>({});

  const [player, setPlayer] = useState({ x: 0, y: 0 });
  const playerRef = useRef({ x: 0, y: 0 });
  const playerTargetRef = useRef({ x: 0, y: 0 });
  const roomRef = useRef<RoomLayout | null>(null);
  const loadingRef = useRef(true);
  const navigatedRef = useRef(false);
  const moveRef = useRef<(dx: number, dy: number) => void>(() => {});

  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { loadingRef.current = roomLoading; }, [roomLoading]);

  const handleMessage = useCallback((msg: string) => {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 3000);
  }, []);

  const handleReadyChange = useCallback((npcKey: string, ready: boolean) => {
    npcReadyRef.current[npcKey] = ready;
  }, []);

  // Auth gate + stats source of truth (users table)
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
      if (row.aura_color) setAuraColor(row.aura_color);
      const r = row as unknown as Record<string, number | null>;
      setSocialStat(Number(r.social ?? 0));
      setPerceptionStat(Number(r.perception ?? 0));
      setTradeStat(Number(r.trade ?? 0));
      setCredits(Number(r.credits ?? 0));
      setGrowthPoints(Number(r.growth_points ?? 0));
      setCurrentLevel(levelNumber);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading, navigate, levelNumber]);

  // Load this room's layout: exact level_number + location_key
  useEffect(() => {
    if (authLoading || !user || !locationKey) return;
    let cancelled = false;

    const loadRoom = async () => {
      setRoomLoading(true);
      try {
        const { data: roomRow } = await supabase
          .from('special_locations' as never)
          .select('data')
          .eq('level_number', levelNumber)
          .eq('location_key', locationKey)
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
        const bookcaseTiles: Rect[] = [];
        const lightTiles: Rect[] = [];
        const rugCells: { col: number; row: number }[] = [];
        const exitTiles: ExitTile[] = [];
        const npcs: NpcPlacement[] = [];

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
            case 'BOOKCASE':
              bookcaseTiles.push({ id: `book-${cell.col}-${cell.row}`, x, y, w: CELL, h: CELL });
              break;
            case 'LIGHT':
              lightTiles.push({ id: `light-${cell.col}-${cell.row}`, x, y, w: CELL, h: CELL });
              break;
            case 'RUG':
              rugCells.push({ col: cell.col, row: cell.row });
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
            default: {
              // NPC cells: generic 'NPC' plus the legacy typed variants.
              const key =
                cell.type === 'NPC'
                  ? (cell.npc_key || cell.npc_name || '').trim().toLowerCase().replace(/\s+/g, '_')
                  : TYPE_NPC_KEYS[cell.type];
              if (key) {
                npcs.push({ id: `npc-${key}-${cell.col}-${cell.row}`, npcKey: key, x, y });
              }
              break;
            }
          }
        });

        let gridSize = Number(rData?.grid_size ?? rData?.gridSize ?? 0);
        if (!Number.isFinite(gridSize) || gridSize <= 0) {
          gridSize = cells.reduce((m, c) => Math.max(m, (c?.col ?? 0) + 1, (c?.row ?? 0) + 1), 1);
        }
        const rawStart = rData?.start;
        const start =
          rawStart && typeof rawStart.col === 'number' && typeof rawStart.row === 'number'
            ? { col: rawStart.col, row: rawStart.row }
            : null;

        const rugSet = new Set(rugCells.map((c) => `${c.col},${c.row}`));
        const rugTiles: RugTile[] = rugCells.map((c) => ({
          id: `rug-${c.col}-${c.row}`,
          x: c.col * CELL,
          y: c.row * CELL,
          trim: {
            top: !rugSet.has(`${c.col},${c.row - 1}`),
            bottom: !rugSet.has(`${c.col},${c.row + 1}`),
            left: !rugSet.has(`${c.col - 1},${c.row}`),
            right: !rugSet.has(`${c.col + 1},${c.row}`),
          },
        }));

        const layout: RoomLayout = {
          wallTiles,
          furnitureTiles,
          bookcaseTiles,
          lightTiles,
          rugTiles,
          exitTiles,
          npcs,
          gridSize,
          start,
        };

        // Spawn safety net: nearest open cell around the preferred origin.
        const solids = [...wallTiles, ...furnitureTiles, ...bookcaseTiles, ...lightTiles];
        const isOpenCell = (col: number, row: number) => {
          if (col < 0 || row < 0 || col >= gridSize || row >= gridSize) return false;
          const px = col * CELL + CELL / 2;
          const py = row * CELL + CELL / 2;
          return !solids.some(
            (o) => px >= o.x - 2 && px <= o.x + o.w + 2 && py >= o.y - 2 && py <= o.y + o.h + 2,
          );
        };

        const originCol = start ? start.col : Math.floor(gridSize / 2);
        const originRow = start ? start.row : Math.floor(gridSize / 2);

        let spawnCol = originCol;
        let spawnRow = originRow;
        if (!isOpenCell(originCol, originRow)) {
          let found = false;
          for (let r = 1; r <= gridSize && !found; r++) {
            for (let dy = -r; dy <= r && !found; dy++) {
              for (let dx = -r; dx <= r && !found; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                const c = originCol + dx;
                const rw = originRow + dy;
                if (isOpenCell(c, rw)) {
                  spawnCol = c;
                  spawnRow = rw;
                  found = true;
                }
              }
            }
          }
        }

        const sp = { x: spawnCol * CELL + CELL / 2, y: spawnRow * CELL + CELL / 2 };
        playerRef.current = sp;
        playerTargetRef.current = sp;

        if (!cancelled) {
          setPlayer(sp);
          setRoom(layout);
          setRoomLoading(false);
        }
      } catch (e) {
        if (!cancelled) setRoomLoading(false);
        console.warn('[DynamicRoom] layout load failed', e);
      }
    };

    void loadRoom();
    return () => { cancelled = true; };
  }, [user, authLoading, levelNumber, locationKey]);

  // Fetch marker assets + display names for every NPC placed in this room
  const npcKeys = useMemo(
    () => Array.from(new Set((room?.npcs ?? []).map((n) => n.npcKey))),
    [room],
  );

  useEffect(() => {
    if (!npcKeys.length) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('npcs')
        .select('npc_key, display_name, marker_asset')
        .in('npc_key', npcKeys);
      if (cancelled) return;
      if (error) {
        console.warn('[DynamicRoom] npc fetch failed', error);
      }
      const rows = (data ?? []) as unknown as {
        npc_key: string;
        display_name: string | null;
        marker_asset: string | null;
      }[];
      const meta: Record<string, { name: string; marker: string }> = {};
      npcKeys.forEach((k) => {
        const row = rows.find((r) => r.npc_key === k);
        meta[k] = {
          name: row?.display_name || k.charAt(0).toUpperCase() + k.slice(1),
          marker: resolveMarker(row?.marker_asset, k),
        };
      });
      setNpcMeta(meta);
    })();
    return () => { cancelled = true; };
  }, [npcKeys]);

  const obstacles = useMemo<Rect[]>(
    () => [
      ...(room?.wallTiles ?? []),
      ...(room?.furnitureTiles ?? []),
      ...(room?.bookcaseTiles ?? []),
      ...(room?.lightTiles ?? []),
    ],
    [room],
  );

  const mapSize = useMemo(() => {
    const size = (room?.gridSize ?? 1) * CELL;
    return { w: size, h: size };
  }, [room]);

  const openNpc = useCallback((npcKey: string) => {
    setOpenSignals((prev) => ({ ...prev, [npcKey]: (prev[npcKey] ?? 0) + 1 }));
    setOpenNpcKey(npcKey);
  }, []);

  // Movement + collision — same approach as the other room screens
  const move = (dx: number, dy: number) => {
    if (loadingRef.current || !roomRef.current) return;
    const prev = playerTargetRef.current;
    const nx = Math.max(0, Math.min(mapSize.w, prev.x + dx));
    const ny = Math.max(0, Math.min(mapSize.h, prev.y + dy));

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

    for (const o of obstacles) {
      if (nx >= o.x - 2 && nx <= o.x + o.w + 2 && ny >= o.y - 2 && ny <= o.y + o.h + 2) {
        return;
      }
    }

    playerTargetRef.current = { x: nx, y: ny };

    // NPC proximity (40px) — measured against the placed position, never the
    // wandered visual offset, so triggering stays predictable.
    for (const n of roomRef.current.npcs) {
      const d = Math.hypot(nx - n.x, ny - n.y);
      if (d <= 40 && npcReadyRef.current[n.npcKey]) {
        if (!npcLockRef.current[n.id]) {
          npcLockRef.current[n.id] = true;
          openNpc(n.npcKey);
        }
      } else if (d > 40) {
        npcLockRef.current[n.id] = false;
      }
    }
  };
  moveRef.current = move;

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

  const stats: NpcStats = {
    user,
    currentLevel,
    socialStat,
    perceptionStat,
    tradeStat,
    credits,
    growthPoints,
  };

  const title = ROOM_TITLES[locationKey] ?? locationKey.replace(/_/g, ' ').toUpperCase();

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#04040a', overflow: 'hidden' }}>
      <style>{`
        @keyframes playerPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.6; } }
        @keyframes roomPulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.9; } }
        @keyframes glowPulse { 0%, 100% { opacity: 0.55; transform: scale(0.94); } 50% { opacity: 0.9; transform: scale(1.06); } }
      `}</style>

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
        {title}
      </div>

      {message && (
        <div
          className="font-fell italic"
          style={{
            position: 'absolute',
            top: 48,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 16,
            color: 'rgba(200,150,58,0.8)',
            zIndex: 6,
            pointerEvents: 'none',
          }}
        >
          {message}
        </div>
      )}

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
          <span>The room is empty here.</span>
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
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: '#0a0812',
              backgroundImage:
                'linear-gradient(rgba(100,80,160,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(100,80,160,0.08) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              boxShadow: 'inset 0 0 60px rgba(0,0,0,0.6)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          {(room.rugTiles ?? []).map((r) => (
            <div
              key={`rug-${r.x}-${r.y}`}
              style={{ position: 'absolute', left: r.x, top: r.y, width: CELL, height: CELL, pointerEvents: 'none', zIndex: 1 }}
            >
              <RugCell trim={r.trim} />
            </div>
          ))}

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
          {(room.bookcaseTiles ?? []).map((b) => (
            <div
              key={`book-${b.x}-${b.y}`}
              style={{ position: 'absolute', left: b.x, top: b.y, width: CELL, height: CELL, pointerEvents: 'none', zIndex: 3 }}
            >
              <BookcaseCell col={Math.round(b.x / CELL)} row={Math.round(b.y / CELL)} />
            </div>
          ))}
          {(room.lightTiles ?? []).map((l) => (
            <div
              key={`light-${l.x}-${l.y}`}
              style={{ position: 'absolute', left: l.x, top: l.y, width: CELL, height: CELL, pointerEvents: 'none', zIndex: 3 }}
            >
              <LightCell />
            </div>
          ))}

          {/* Generic NPCs — one actor per placed NPC cell */}
          {room.npcs.map((n) => (
            <NpcActor
              key={n.id}
              placement={n}
              displayName={npcMeta[n.npcKey]?.name ?? n.npcKey}
              markerSrc={npcMeta[n.npcKey]?.marker ?? resolveMarker(null, n.npcKey)}
              stats={stats}
              isOpen={openNpcKey === n.npcKey}
              onClose={() => setOpenNpcKey(null)}
              onReadyChange={handleReadyChange}
              onCreditsChange={setCredits}
              onGrowthPointsChange={setGrowthPoints}
              onMessage={handleMessage}
              openSignal={openSignals[n.npcKey] ?? 0}
            />
          ))}

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

export default DynamicRoom;
