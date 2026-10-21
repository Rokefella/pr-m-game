import NpcOrb from '@/components/theme/objects/NpcOrb';
import LoadingScreen, { useMinLoading } from '@/components/LoadingScreen';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { fetchOrCreateUser } from '@/lib/userData';
import { supabase } from '@/lib/supabase';
import { formatPrime } from '@/lib/format';
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
import bankerMarkerUrl from '@/assets/banker_marker.svg';

const CELL = 20;
const STEP = 12;

type Rect = { id: string; x: number; y: number; w: number; h: number };
type Listing = {
  id: string;
  fragment_id: string;
  seller_id: string;
  price: number;
  status: string;
  prime_number: number | null;
  level: number | null;
  seller_username: string | null;
  created_at: string;
};
type OwnedFragment = { id: string; prime_number: number; level: number };
type RugTrim = { top: boolean; bottom: boolean; left: boolean; right: boolean };
type RugTile = { id: string; x: number; y: number; trim: RugTrim };
type RoomCell = {
  col: number;
  row: number;
  type: string;
  exit?: { destination?: string } | null;
  color?: string | null;
};
type ExitTile = Rect & { destination: string; dir: ExitDir };
type RoomLayout = {
  wallTiles: Rect[];
  furnitureTiles: Rect[];
  bookcaseTiles: Rect[];
  lightTiles: (Rect & { color?: string | null })[];
  rugTiles: RugTile[];
  floorRuns: Run[];
  wallRuns: Run[];
  exitTiles: ExitTile[];
  bankerCenter: { x: number; y: number } | null;
  gridSize: number;
  start: { col: number; row: number } | null;
};

const EXIT_ROUTES: Record<string, string> = {
  village: '/village',
  maze: '/maze',
  shadow_realm: '/shadow',
};

const ExchangeRoom = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [currentLevel, setCurrentLevel] = useState(1);
  const [room, setRoom] = useState<RoomLayout | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);
  const [auraColor, setAuraColor] = useState('#a98cff');
  const [registrationNumber, setRegistrationNumber] = useState<number | null>(null);
  const [walking, setWalking] = useState(false);
  const walkingRef = useRef(false);
  const avatarRef = useRef<HTMLDivElement | null>(null);

  const [socialStat, setSocialStat] = useState(0);
  const [perceptionStat, setPerceptionStat] = useState(0);
  const [tradeStat, setTradeStat] = useState(0);
  const [credits, setCredits] = useState(0);
  const [growthPoints, setGrowthPoints] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const playerRef = useRef({ x: 0, y: 0 });
  const playerTargetRef = useRef({ x: 0, y: 0 });
  const roomRef = useRef<RoomLayout | null>(null);
  const loadingRef = useRef(true);
  const navigatedRef = useRef(false);
  const moveRef = useRef<(dx: number, dy: number) => void>(() => {});

  // Camera-follow (same as DynamicRoom): written to the DOM ref each frame.
  const worldRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef({ x: 0, y: 0 });
  const camSnapRef = useRef(true);
  const viewRef = useRef({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => { viewRef.current = { w: window.innerWidth, h: window.innerHeight }; };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [bankerOpen, setBankerOpen] = useState(false);
  const bankerLockRef = useRef(false);

  // ---- Fragment marketplace state (UI only; room logic untouched) ----
  const [marketOpen, setMarketOpen] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myFragments, setMyFragments] = useState<OwnedFragment[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketBusy, setMarketBusy] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [marketNotice, setMarketNotice] = useState<string | null>(null);
  const [sellFragmentId, setSellFragmentId] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [username, setUsername] = useState<string | null>(null);
  const [fragmentCount, setFragmentCount] = useState(0);

  const refreshOwnCounts = async (uid: string) => {
    const { data: userRow } = await supabase
      .from('users')
      .select('credits, growth_points, username')
      .eq('id', uid)
      .maybeSingle();
    if (userRow) {
      setCredits(Number(userRow.credits ?? 0));
      setGrowthPoints(Number(userRow.growth_points ?? 0));
      setUsername(userRow.username ?? null);
    }
    const { count } = await supabase
      .from('fragments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid);
    setFragmentCount(count ?? 0);
  };

  const loadMarket = async () => {
    if (!user) return;
    setMarketLoading(true);
    setMarketError(null);
    try {
      const { data: rows, error } = await supabase
        .from('exchange_listings' as never)
        .select('id, fragment_id, seller_id, price, status, prime_number, level, seller_username, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const all = ((rows ?? []) as unknown as Listing[]);
      setListings(all.filter((l) => l.seller_id !== user.id));
      setMyListings(all.filter((l) => l.seller_id === user.id));

      const listedIds = new Set(all.filter((l) => l.seller_id === user.id).map((l) => l.fragment_id));
      const { data: frags } = await supabase
        .from('fragments')
        .select('id, prime_number, level')
        .eq('user_id', user.id)
        .order('prime_number', { ascending: true });
      const owned = ((frags ?? []) as unknown as OwnedFragment[]).filter((f) => !listedIds.has(f.id));
      setMyFragments(owned);
      setSellFragmentId((prev) => (owned.some((f) => f.id === prev) ? prev : owned[0]?.id ?? ''));

      await refreshOwnCounts(user.id);
    } catch (e) {
      setMarketError(e instanceof Error ? e.message : 'The exchange did not answer.');
    } finally {
      setMarketLoading(false);
    }
  };

  useEffect(() => {
    if (!marketOpen || !user) return;
    void loadMarket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketOpen, user]);

  const buyListing = async (listing: Listing) => {
    if (!user || marketBusy) return;
    setMarketBusy(true);
    setMarketError(null);
    setMarketNotice(null);
    const { error } = await supabase.rpc('purchase_fragment_listing' as never, {
      p_listing_id: listing.id,
      p_buyer_id: user.id,
    } as never);
    if (error) {
      setMarketError(error.message || 'The purchase failed.');
    } else {
      setMarketNotice(`Acquired Prime ${listing.prime_number == null ? '?' : formatPrime(listing.prime_number)}.`);
      await loadMarket();
    }
    setMarketBusy(false);
  };

  const createListing = async () => {
    if (!user || marketBusy) return;
    const frag = myFragments.find((f) => f.id === sellFragmentId);
    const price = Number(sellPrice);
    if (!frag) { setMarketError('Choose a fragment to list.'); return; }
    if (!Number.isFinite(price) || price <= 0) { setMarketError('Set a price above zero.'); return; }
    setMarketBusy(true);
    setMarketError(null);
    setMarketNotice(null);
    const { error } = await supabase.from('exchange_listings' as never).insert({
      fragment_id: frag.id,
      seller_id: user.id,
      price: Math.floor(price),
      prime_number: frag.prime_number,
      level: frag.level,
      seller_username: username,
    } as never);
    if (error) {
      setMarketError(error.message || 'The listing was refused.');
    } else {
      setMarketNotice(`Prime ${formatPrime(frag.prime_number)} offered for ${Math.floor(price)} credits.`);
      setSellPrice('');
      await loadMarket();
    }
    setMarketBusy(false);
  };

  const cancelListing = async (listing: Listing) => {
    if (!user || marketBusy) return;
    setMarketBusy(true);
    setMarketError(null);
    setMarketNotice(null);
    const { error } = await supabase
      .from('exchange_listings' as never)
      .update({ status: 'cancelled' } as never)
      .eq('id', listing.id)
      .eq('seller_id', user.id);
    if (error) {
      setMarketError(error.message || 'The listing could not be withdrawn.');
    } else {
      setMarketNotice('Listing withdrawn.');
      await loadMarket();
    }
    setMarketBusy(false);
  };

  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { loadingRef.current = roomLoading; }, [roomLoading]);


  const {
    resolvedDialogue,
    resetBernardBucket,
    bumpFlags,
    isReady: npcReady,
  } = useNpcDialogue('banker', {
    user,
    currentLevel,
    socialStat,
    perceptionStat,
    tradeStat,
    credits,
    growthPoints,
    isOpen: bankerOpen,
    onCreditsChange: setCredits,
    onGrowthPointsChange: setGrowthPoints,
    onCloseDialogue: () => setBankerOpen(false),
    onOpenMarketplace: () => setMarketOpen(true),
    onMessage: (msg) => {
      setMessage(msg);
      window.setTimeout(() => setMessage(null), 3000);
    },
    onAcceptAlexandraQuest: () => {
      void (async () => {
        if (!user) return;
        const status = await checkSubscriptionStatus(user.id);
        const allowed = status === 'active' || status === 'lifetime' || status === 'dev' || status === 'trial';
        if (allowed) {
          await setFlag(user.id, 'alexandra_quest', 'active');
          bumpFlags();
        } else {
          window.dispatchEvent(new Event('praem:open-paywall'));
        }
      })();
    },
  });

  const openBankerDialog = () => {
    resetBernardBucket();
    setBankerOpen(true);
  };

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
      setCurrentLevel(row.level);
      if (row.aura_color) setAuraColor(row.aura_color);
      const r = row as unknown as Record<string, number | null>;
      setRegistrationNumber(r.registration_number ?? null);
      setSocialStat(Number(r.social ?? 0));
      setPerceptionStat(Number(r.perception ?? 0));
      setTradeStat(Number(r.trade ?? 0));
      setCredits(Number(r.credits ?? 0));
      setGrowthPoints(Number(r.growth_points ?? 0));
    })();
    return () => { cancelled = true; };
  }, [user, authLoading, navigate]);

  // Load the exchange layout for the current level
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
          .eq('location_key', 'exchange')
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
        let bankerCenter: { x: number; y: number } | null = null;

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
            case 'BANKER':
              bankerCenter = { x, y };
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
            default:
              break;
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
          exitTiles,
          bankerCenter,
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
        console.warn('[ExchangeRoom] layout load failed', e);
      }
    };

    void loadRoom();
    return () => { cancelled = true; };
  }, [user, authLoading, currentLevel]);

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

  const bankerPos = useMemo(() => {
    if (room?.bankerCenter) return room.bankerCenter;
    return { x: mapSize.w / 2, y: mapSize.h / 2 };
  }, [room, mapSize]);

  // Movement + collision — same approach as the library / Bernard rooms
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

    // Banker proximity → open the shared dialogue (40px)
    const db = Math.hypot(nx - bankerPos.x, ny - bankerPos.y);
    if (db <= 40 && npcReady) {
      if (!bankerLockRef.current) {
        bankerLockRef.current = true;
        openBankerDialog();
      }
    } else {
      bankerLockRef.current = false;
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

      const ms = (roomRef.current?.gridSize ?? 1) * CELL;
      const camTx = roomCamAxis(ms, playerRef.current.x, viewRef.current.w);
      const camTy = roomCamAxis(ms, playerRef.current.y, viewRef.current.h);
      if (camSnapRef.current) {
        camSnapRef.current = false;
        cameraRef.current = { x: camTx, y: camTy };
      } else {
        const cdx = camTx - cameraRef.current.x;
        const cdy = camTy - cameraRef.current.y;
        cameraRef.current = Math.abs(cdx) < 0.5 && Math.abs(cdy) < 0.5
          ? { x: camTx, y: camTy }
          : { x: cameraRef.current.x + cdx * 0.12, y: cameraRef.current.y + cdy * 0.12 };
      }
      if (worldRef.current) {
        worldRef.current.style.transform = `translate(${cameraRef.current.x}px, ${cameraRef.current.y}px) scale(${ROOM_ZOOM})`;
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const showLoading = useMinLoading(roomLoading);

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
        THE EXCHANGE
      </div>

      {marketOpen && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 12,
            width: 'min(92vw, 360px)',
            maxHeight: 'min(70vh, 520px)',
            overflowY: 'auto',
            background: 'rgba(6,5,12,0.94)',
            border: '0.5px solid rgba(200,150,58,0.35)',
            padding: 16,
            zIndex: 8,
            boxSizing: 'border-box',
          }}
        >
          <div
            className="font-cinzel"
            style={{ fontSize: 12, letterSpacing: '0.25em', color: 'rgba(200,150,58,0.8)', marginBottom: 4 }}
          >
            FRAGMENT MARKET
          </div>
          <button
            type="button"
            className="font-cinzel"
            onClick={() => setMarketOpen(false)}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'transparent',
              border: '0.5px solid rgba(200,150,58,0.4)',
              color: 'rgba(200,150,58,0.8)',
              padding: '4px 8px',
              fontSize: 11,
              letterSpacing: '0.2em',
              cursor: 'pointer',
            }}
          >
            CLOSE
          </button>
          <div className="font-mono" style={{ fontSize: 11, color: 'rgba(200,196,186,0.5)', marginBottom: 12 }}>
            {credits} credits · {fragmentCount} fragments held
          </div>

          {marketError && (
            <div
              className="font-fell italic"
              style={{
                fontSize: 13,
                color: '#d07a6a',
                border: '0.5px solid rgba(208,122,106,0.4)',
                padding: '6px 8px',
                marginBottom: 10,
              }}
            >
              {marketError}
            </div>
          )}
          {marketNotice && !marketError && (
            <div className="font-fell italic" style={{ fontSize: 13, color: '#1a9e7a', marginBottom: 10 }}>
              {marketNotice}
            </div>
          )}
          {marketLoading && (
            <div className="font-mono" style={{ fontSize: 11, color: 'rgba(160,140,200,0.6)', marginBottom: 10 }}>
              LOADING…
            </div>
          )}

          {/* BROWSE */}
          <div className="font-cinzel" style={{ fontSize: 11, letterSpacing: '0.25em', color: 'rgba(200,196,186,0.6)', marginBottom: 8 }}>
            BROWSE
          </div>
          {!listings.length && !marketLoading && (
            <div className="font-fell italic" style={{ fontSize: 13, color: 'rgba(200,196,186,0.4)', marginBottom: 14 }}>
              Nothing is offered right now.
            </div>
          )}
          {listings.map((l) => (
            <div
              key={l.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                borderBottom: '0.5px solid rgba(200,196,186,0.12)',
                padding: '6px 0',
              }}
            >
              <span className="font-mono" style={{ fontSize: 11, color: 'rgba(200,196,186,0.8)' }}>
                Prime {l.prime_number == null ? '?' : formatPrime(l.prime_number)}, Level {l.level ?? '?'} — {l.price} credits — sold by{' '}
                {l.seller_username ?? 'unknown'}
              </span>
              <button
                type="button"
                className="font-cinzel"
                disabled={marketBusy || l.seller_id === user?.id}
                onClick={() => void buyListing(l)}
                style={{
                  background: 'rgba(200,150,58,0.18)',
                  border: '0.5px solid rgba(200,150,58,0.5)',
                  color: '#c8963a',
                  padding: '4px 10px',
                  fontSize: 11,
                  letterSpacing: '0.15em',
                  cursor: marketBusy || l.seller_id === user?.id ? 'not-allowed' : 'pointer',
                  opacity: marketBusy || l.seller_id === user?.id ? 0.4 : 1,
                  flexShrink: 0,
                }}
              >
                BUY
              </button>
            </div>
          ))}

          {/* SELL */}
          <div
            className="font-cinzel"
            style={{ fontSize: 11, letterSpacing: '0.25em', color: 'rgba(200,196,186,0.6)', margin: '18px 0 8px' }}
          >
            SELL
          </div>
          {!myFragments.length ? (
            <div className="font-fell italic" style={{ fontSize: 13, color: 'rgba(200,196,186,0.4)' }}>
              You hold nothing the market will take.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <select
                className="font-mono"
                value={sellFragmentId}
                onChange={(e) => setSellFragmentId(e.target.value)}
                style={{
                  background: 'rgba(10,8,18,0.9)',
                  border: '0.5px solid rgba(200,196,186,0.25)',
                  color: 'rgba(200,196,186,0.85)',
                  fontSize: 11,
                  padding: '6px 8px',
                }}
              >
                {myFragments.map((f) => (
                  <option key={f.id} value={f.id}>
                    Prime {formatPrime(f.prime_number)}, Level {f.level}
                  </option>
                ))}
              </select>
              <input
                className="font-mono"
                type="number"
                min={1}
                placeholder="Price in credits"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                style={{
                  background: 'rgba(10,8,18,0.9)',
                  border: '0.5px solid rgba(200,196,186,0.25)',
                  color: 'rgba(200,196,186,0.85)',
                  fontSize: 11,
                  padding: '6px 8px',
                }}
              />
              <button
                type="button"
                className="font-cinzel"
                disabled={marketBusy}
                onClick={() => void createListing()}
                style={{
                  background: 'rgba(200,150,58,0.18)',
                  border: '0.5px solid rgba(200,150,58,0.5)',
                  color: '#c8963a',
                  padding: '6px 12px',
                  fontSize: 11,
                  letterSpacing: '0.2em',
                  cursor: marketBusy ? 'not-allowed' : 'pointer',
                  opacity: marketBusy ? 0.5 : 1,
                }}
              >
                LIST FOR SALE
              </button>
            </div>
          )}

          {/* MY LISTINGS */}
          <div
            className="font-cinzel"
            style={{ fontSize: 11, letterSpacing: '0.25em', color: 'rgba(200,196,186,0.6)', margin: '18px 0 8px' }}
          >
            MY LISTINGS
          </div>
          {!myListings.length ? (
            <div className="font-fell italic" style={{ fontSize: 13, color: 'rgba(200,196,186,0.4)' }}>
              You have nothing on offer.
            </div>
          ) : (
            myListings.map((l) => (
              <div
                key={l.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  borderBottom: '0.5px solid rgba(200,196,186,0.12)',
                  padding: '6px 0',
                }}
              >
                <span className="font-mono" style={{ fontSize: 11, color: 'rgba(200,196,186,0.8)' }}>
                  Prime {l.prime_number == null ? '?' : formatPrime(l.prime_number)}, Level {l.level ?? '?'} — {l.price} credits
                </span>
                <button
                  type="button"
                  className="font-cinzel"
                  disabled={marketBusy}
                  onClick={() => void cancelListing(l)}
                  style={{
                    background: 'transparent',
                    border: '0.5px solid rgba(160,140,200,0.35)',
                    color: 'rgba(160,140,200,0.7)',
                    padding: '4px 10px',
                    fontSize: 11,
                    letterSpacing: '0.15em',
                    cursor: marketBusy ? 'not-allowed' : 'pointer',
                    flexShrink: 0,
                  }}
                >
                  CANCEL
                </button>
              </div>
            ))
          )}
        </div>
      )}



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

      {showLoading && <LoadingScreen />}

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

          <div style={{ position: 'absolute', left: bankerPos.x, top: bankerPos.y, pointerEvents: 'none', zIndex: 4 }}><NpcOrb npc="banker" /></div>

          <RoomAvatar ref={avatarRef} palette={registrationNumber === 1 ? 'red' : paletteFromColor(auraColor)} walking={walking} />
        </div>
      )}

      {bankerOpen && resolvedDialogue && (
        <NpcDialogue npcName="The Banker" npcPortraitSrc={bankerMarkerUrl} text={resolvedDialogue.text} onShow={resolvedDialogue.onShow}>
          {(resolvedDialogue.options ?? []).map((o, i) => (
            <button
              key={`${o.label}-${i}`}
              type="button"
              className="font-cinzel"
              onClick={() => {
                o.onSelect();
                if (o.closes) setBankerOpen(false);
              }}
              style={{
                background: 'rgba(200,150,58,0.18)',
                border: '0.5px solid rgba(200,150,58,0.5)',
                color: '#c8963a',
                padding: '6px 12px',
                fontSize: 13,
                letterSpacing: '0.02em',
                cursor: 'pointer',
                width: '100%',
                boxSizing: 'border-box',
              }}
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
                setBankerOpen(false);
              }}
              style={{
                background: 'rgba(200,150,58,0.18)',
                border: '0.5px solid rgba(200,150,58,0.5)',
                color: '#c8963a',
                padding: '6px 12px',
                fontSize: 13,
                letterSpacing: '0.02em',
                cursor: 'pointer',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              {resolvedDialogue.buttonLabel.toUpperCase()}
            </button>
          )}

          <button
            type="button"
            className="font-cinzel"
            onClick={() => setBankerOpen(false)}
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
      <Thumbstick
        onDirectionChange={(dc, dr) => { stickDirRef.current = { dc, dr }; }}
        disabled={bankerOpen || marketOpen}
      />
    </div>
  );
};

export default ExchangeRoom;
