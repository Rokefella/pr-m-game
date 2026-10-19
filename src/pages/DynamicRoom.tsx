import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { fetchOrCreateUser } from '@/lib/userData';
import { supabase } from '@/lib/supabase';
import Thumbstick from '@/components/Thumbstick';
import { setFlag } from '@/lib/questFlags';
import { checkSubscriptionStatus } from '@/lib/subscriptionStatus';
import NpcDialogue from '@/components/NpcDialogue';
import { useNpcDialogue } from '@/hooks/useNpcDialogue';
import { RoomScene, RoomAvatar, avatarTransform } from '@/components/theme/rooms/RoomScene';
import { ROOM_BG, ROOM_ZOOM, roomCamAxis } from '@/components/theme/rooms/roomConfig';
import { exitDir, roomGeometry, type Run } from '@/components/theme/rooms/roomGeometry';
import { paletteFromColor } from '@/components/PlayerAvatar';
import type { ExitDir } from '@/components/theme/objects';

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
  color?: string | null;
};
type ExitTile = Rect & { destination: string; dir: ExitDir };
type ColorTile = { id: string; x: number; y: number; col: number; row: number; color: string };
type NpcPlacement = { id: string; npcKey: string; x: number; y: number };
type RoomLayout = {
  wallTiles: Rect[];
  furnitureTiles: Rect[];
  bookcaseTiles: Rect[];
  lightTiles: (Rect & { color?: string | null })[];
  rugTiles: RugTile[];
  floorRuns: Run[];
  wallRuns: Run[];
  groundTiles: ColorTile[];
  treeTiles: ColorTile[];
  flowerTiles: ColorTile[];
  gardenDecorTiles: ColorTile[];
  exitTiles: ExitTile[];
  npcs: NpcPlacement[];
  gridSize: number;
  start: { col: number; row: number } | null;
};

const GroundTile = memo(({ color, col, row }: { color: string; col: number; row: number }) => {
  const v = (col * 7 + row * 3) % 4;
  const blades = [
    [4 + v, 16, 5 + v, 12],
    [11, 17, 10, 13],
    [15 - v, 15, 16 - v, 11],
    [7, 8 + v, 8, 5 + v],
  ];
  return (
    <svg width="100%" height="100%" viewBox="0 0 20 20" style={{ display: 'block' }}>
      <rect width="20" height="20" fill={color} opacity={0.55} />
      <rect width="20" height="20" fill="rgba(0,0,0,0.25)" />
      {blades.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={0.6} opacity={0.9} />
      ))}
      <circle cx={3 + v * 3} cy={4} r={0.5} fill={color} opacity={0.8} />
      <circle cx={17 - v} cy={18 - v} r={0.5} fill={color} opacity={0.8} />
    </svg>
  );
});

const TreeTile = memo(({ color, col, row }: { color: string; col: number; row: number }) => {
  const v = (col + row) % 3;
  const outer =
    v === 0 ? { cx: 10, cy: 9, rx: 6, ry: 7 } : v === 1 ? { cx: 10, cy: 10, rx: 5, ry: 6 } : { cx: 10, cy: 8, rx: 7, ry: 8 };
  const inner =
    v === 0 ? { cx: 10, cy: 7, rx: 4, ry: 5 } : v === 1 ? { cx: 10, cy: 9, rx: 3, ry: 4 } : { cx: 10, cy: 6, rx: 5, ry: 6 };
  return (
    <svg width="100%" height="100%" viewBox="0 0 20 20" style={{ display: 'block' }}>
      <rect x="9.3" y="14" width="1.4" height="5" fill="#3a2a1a" />
      <ellipse {...outer} fill={color} opacity={0.75} />
      <ellipse {...inner} fill={color} opacity={0.95} />
      <ellipse {...inner} fill="rgba(255,255,255,0.08)" />
    </svg>
  );
});

const FlowerTile = memo(({ color }: { color: string }) => (
  <svg width="100%" height="100%" viewBox="0 0 20 20" style={{ display: 'block' }}>
    <ellipse cx="10" cy="6.5" rx="2" ry="3" fill={color} opacity={0.85} />
    <ellipse cx="10" cy="13.5" rx="2" ry="3" fill={color} opacity={0.85} />
    <ellipse cx="6.5" cy="10" rx="3" ry="2" fill={color} opacity={0.85} />
    <ellipse cx="13.5" cy="10" rx="3" ry="2" fill={color} opacity={0.85} />
    <circle cx="10" cy="10" r="1.6" fill="#e0c870" />
  </svg>
));

const GardenDecorTile = memo(({ color }: { color: string }) => (
  <svg width="100%" height="100%" viewBox="0 0 20 20" style={{ display: 'block' }}>
    <polygon points="10,2 18,10 10,18 2,10" fill="none" stroke={color} strokeWidth={1} opacity={0.9} />
    <polygon points="10,6 14,10 10,14 6,10" fill="none" stroke={color} strokeWidth={0.6} opacity={0.6} />
    <circle cx="10" cy="10" r="1" fill={color} />
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
  fontSize: 13,
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
              fontSize: 13,
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
  const [searchParams] = useSearchParams();
  // Maze-originated visits carry ?from=maze and exit back into the maze
  // instead of the room's own (statically authored) exit destination.
  const fromMaze = searchParams.get('from') === 'maze';
  const locationKey = params.locationKey ?? '';
  const routeLevel = Number(params.levelNumber);
  const levelNumber = Number.isFinite(routeLevel) && routeLevel > 0 ? routeLevel : 1;

  const { user, loading: authLoading } = useAuth();

  const [room, setRoom] = useState<RoomLayout | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);
  const [auraColor, setAuraColor] = useState('#a98cff');
  const [registrationNumber, setRegistrationNumber] = useState<number | null>(null);
  const [walking, setWalking] = useState(false);
  const walkingRef = useRef(false);
  const avatarRef = useRef<HTMLDivElement | null>(null);

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
      setRegistrationNumber(r.registration_number ?? null);
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
        const lightTiles: (Rect & { color?: string | null })[] = [];
        const rugCells: { col: number; row: number }[] = [];
        const exitTiles: ExitTile[] = [];
        const groundTiles: ColorTile[] = [];
        const treeTiles: ColorTile[] = [];
        const flowerTiles: ColorTile[] = [];
        const gardenDecorTiles: ColorTile[] = [];
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
              lightTiles.push({ id: `light-${cell.col}-${cell.row}`, x, y, w: CELL, h: CELL, color: cell.color });
              break;
            case 'RUG':
              rugCells.push({ col: cell.col, row: cell.row });
              break;
            case 'GROUND':
              groundTiles.push({ id: `ground-${cell.col}-${cell.row}`, x, y, col: cell.col, row: cell.row, color: cell.color || '#2e4a2a' });
              break;
            case 'TREE':
              treeTiles.push({ id: `tree-${cell.col}-${cell.row}`, x, y, col: cell.col, row: cell.row, color: cell.color || '#2f5a34' });
              break;
            case 'FLOWER':
              flowerTiles.push({ id: `flower-${cell.col}-${cell.row}`, x, y, col: cell.col, row: cell.row, color: cell.color || '#c86a8a' });
              break;
            case 'GARDEN_DECOR':
              gardenDecorTiles.push({ id: `decor-${cell.col}-${cell.row}`, x, y, col: cell.col, row: cell.row, color: cell.color || '#c8943a' });
              break;
            case 'ROOM_EXIT':
              exitTiles.push({
                id: `exit-${cell.col}-${cell.row}`,
                x,
                y,
                w: CELL,
                h: CELL,
                destination: cell.exit?.destination ?? 'village',
                dir: 'down',
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
        const geom = roomGeometry(cells, gridSize);
        geom.implicitWalls.forEach(({ col, row }) => {
          wallTiles.push({ id: `wall-${col}-${row}`, x: col * CELL, y: row * CELL, w: CELL, h: CELL });
        });
        exitTiles.forEach((ex) => { ex.dir = exitDir(ex.x / CELL, ex.y / CELL, gridSize); });
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
          floorRuns: geom.floorRuns,
          wallRuns: geom.wallRuns,
          groundTiles,
          treeTiles,
          flowerTiles,
          gardenDecorTiles,
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
        camSnapRef.current = true;

        if (!cancelled) {
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

  // Camera-follow: eases toward centering the player each frame (same pattern
  // as Village). On an axis where the map is smaller than the viewport, that
  // axis keeps the map centered instead of following.
  const worldRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef({ x: 0, y: 0 });
  const camSnapRef = useRef(true);
  const viewRef = useRef({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => {
      viewRef.current = { w: window.innerWidth, h: window.innerHeight };
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
          navigatedRef.current = true;
          if (fromMaze) {
            window.setTimeout(() => navigate('/maze'), 400);
          } else {
            const target = EXIT_ROUTES[ex.destination] ?? '/village';
            window.setTimeout(() => navigate(target), 400);
          }
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
  const stickDirRef = useRef<{ dc: number; dr: number }>({ dc: 0, dr: 0 });
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
        const stick = stickDirRef.current;
        if (stick.dc !== 0) kdx = stick.dc * STEP;
        if (stick.dr !== 0) kdy = stick.dr * STEP;
        if (kdx !== 0 && kdy !== 0) { kdx *= 0.707; kdy *= 0.707; }
        if (kdx !== 0 || kdy !== 0) moveRef.current(kdx, kdy);
      }

      const target = playerTargetRef.current;
      const cur = playerRef.current;
      const dx = target.x - cur.x;
      const dy = target.y - cur.y;
      const moving = Math.hypot(dx, dy) >= 0.5;
      if (!moving) {
        playerRef.current = { x: target.x, y: target.y };
      } else {
        playerRef.current = { x: cur.x + dx * 0.18, y: cur.y + dy * 0.18 };
      }
      // Avatar is positioned through its DOM ref; walking flips state only on change.
      if (avatarRef.current) avatarRef.current.style.transform = avatarTransform(playerRef.current);
      if (moving !== walkingRef.current) { walkingRef.current = moving; setWalking(moving); }

      // Camera eases toward centering the (visually eased) player position;
      // snaps once on spawn/room load so it never glides across the map.
      const ms = (roomRef.current?.gridSize ?? 1) * CELL;
      const camTx = roomCamAxis(ms, cur.x, viewRef.current.w);
      const camTy = roomCamAxis(ms, cur.y, viewRef.current.h);
      if (camSnapRef.current) {
        camSnapRef.current = false;
        cameraRef.current = { x: camTx, y: camTy };
      } else {
        const cdx = camTx - cameraRef.current.x;
        const cdy = camTy - cameraRef.current.y;
        if (Math.abs(cdx) < 0.5 && Math.abs(cdy) < 0.5) {
          cameraRef.current = { x: camTx, y: camTy };
        } else {
          cameraRef.current = {
            x: cameraRef.current.x + cdx * 0.12,
            y: cameraRef.current.y + cdy * 0.12,
          };
        }
      }
      // Write the camera transform straight to the DOM — no React re-render.
      if (worldRef.current) {
        worldRef.current.style.transform = `translate(${cameraRef.current.x}px, ${cameraRef.current.y}px) scale(${ROOM_ZOOM})`;
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

  const title = ROOM_TITLES[locationKey] ?? '';

  return (
    <div style={{ position: 'fixed', inset: 0, background: ROOM_BG, overflow: 'hidden' }}>
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

      {!roomLoading && room && room.exitTiles.length === 0 && (
        <button
          className="font-cinzel"
          onClick={() => navigate(fromMaze ? '/maze' : '/village')}
          style={{
            position: 'absolute',
            top: 44,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 7,
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
      )}

      {!roomLoading && room && (
        <div
          ref={worldRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: mapSize.w,
            height: mapSize.h,
            transformOrigin: '0 0',
            transform: `translate(${cameraRef.current.x}px, ${cameraRef.current.y}px) scale(${ROOM_ZOOM})`,
            willChange: 'transform',
          }}
        >
          <RoomScene floorRuns={room.floorRuns} wallRuns={room.wallRuns} furniture={room.furnitureTiles} bookcases={room.bookcaseTiles} lights={room.lightTiles} rugs={room.rugTiles} exits={room.exitTiles} />

          {(room.groundTiles ?? []).map((t) => (
            <div
              key={t.id}
              style={{ position: 'absolute', left: t.x, top: t.y, width: CELL, height: CELL, pointerEvents: 'none', zIndex: 1 }}
            >
              <GroundTile color={t.color} col={t.col} row={t.row} />
            </div>
          ))}

          {(room.treeTiles ?? []).map((t) => (
            <div
              key={t.id}
              style={{ position: 'absolute', left: t.x, top: t.y, width: CELL, height: CELL, pointerEvents: 'none', zIndex: 2 }}
            >
              <TreeTile color={t.color} col={t.col} row={t.row} />
            </div>
          ))}

          {(room.flowerTiles ?? []).map((t) => (
            <div
              key={t.id}
              style={{ position: 'absolute', left: t.x, top: t.y, width: CELL, height: CELL, pointerEvents: 'none', zIndex: 2 }}
            >
              <FlowerTile color={t.color} />
            </div>
          ))}

          {(room.gardenDecorTiles ?? []).map((t) => (
            <div
              key={t.id}
              style={{ position: 'absolute', left: t.x, top: t.y, width: CELL, height: CELL, pointerEvents: 'none', zIndex: 2 }}
            >
              <GardenDecorTile color={t.color} />
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

          <RoomAvatar ref={avatarRef} palette={registrationNumber === 1 ? 'red' : paletteFromColor(auraColor)} walking={walking} />
        </div>
      )}
      <Thumbstick
        onDirectionChange={(dc, dr) => { stickDirRef.current = { dc, dr }; }}
        disabled={openNpcKey !== null}
      />
    </div>
  );
};

export default DynamicRoom;
