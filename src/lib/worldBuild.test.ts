import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildingBox, buildingOpacity, visibleBuildings } from './worldBuildings';
import { WorldChunkCache, worldWalkable, type Terrain } from './worldTest';
import { glowRows } from './skins';
import { NpcWander, npcPath, npcPauseMs, NPC_TILE_MS } from './worldNpcMotion';
import { playerAppearance, shownPlayers, WorldPresence, type WorldPlayer } from './worldPlayers';
import { clearPlayerLocal, goBackToStart } from './goBackToStart';
import { claimDailyStepsOnce } from './dailySteps';
const terrain = (key: string, extra = {}) => ({ key, walkable: true, enabled: true, ...extra } as Terrain);
afterEach(() => vi.useRealTimers());
describe('authored world buildings', () => {
  it('uses the ship’s rectangular 3×2 footprint beneath its 48×48 sprite', () => {
    const ship = { x: 10, y: 10, terrain: terrain('bld_lake_ship', { footprint: 3, footprint_w: 3, footprint_h: 2, sprite_w: 48, sprite_h: 48 }) };
    expect(buildingBox(ship)).toEqual({ x: 10, y: 9, w: 3, h: 3, bottom: 12, footprintW: 3 });
  });
  const b = { x: 10, y: 10, terrain: terrain('bld_wood_tower', { footprint_w: 2, footprint_h: 2, sprite_w: 32, sprite_h: 48 }) };
  it('bottom aligns native art above a two-cell footprint', () => expect(buildingBox(b)).toEqual({ x: 10, y: 9, w: 2, h: 3, bottom: 12, footprintW: 2 }));
  it('fades only when the player is in the above-footprint sprite', () => { expect(buildingOpacity(b, { x: 11, y: 9 })).toBe(.45); expect(buildingOpacity(b, { x: 11, y: 12 })).toBe(1); expect(buildingOpacity(b, { x: 9, y: 9 })).toBe(1); });
  it('finds offscreen anchors within three cells, never drawing bld_part', () => {
    const cache = new WorldChunkCache(async () => { throw Error(); });
    vi.spyOn(cache, 'terrainKey').mockImplementation((x, y) => x === 10 && y === 10 ? b.terrain.key : 'bld_part');
    const types = new Map([[b.terrain.key, b.terrain], ['bld_part', terrain('bld_part')]]);
    expect(visibleBuildings(cache, types, { x: 13 * 40, y: 10 * 40 }, 40, 40)).toEqual([b]);
  });
  it('both anchor and part remain blocked even if malformed metadata says walkable', () => { expect(worldWalkable(b.terrain)).toBe(false); expect(worldWalkable(terrain('bld_part'))).toBe(false); expect(worldWalkable(terrain('grass'))).toBe(true); });
});
it('glow retains only glow_chars pixels and excludes transparent pixels', () => expect(glowRows(['.DMLHpAaS'], 'LHMaA')).toEqual(['..MLH.Aa.']));
describe('world visitors', () => {
  const p: WorldPlayer = { user_id: 'other', x: 10, y: 10, layer: 0, village_level: 0, avatar_body: 'circuit', aura_color: '#abcdef', orb_dye: 'dye_prism', facing: 'left', last_seen: new Date(100000).toISOString() };
  it('uses the position row skin, dye and facing within twelve cells', () => { expect(playerAppearance(p, { x: 22, y: 22 })).toEqual({ near: true, skin: 'circuit', facing: 'left', auraColor: '#abcdef', orbDye: 'dye_prism' }); expect(playerAppearance(p, { x: 23, y: 10 }).near).toBe(false); });
  it('filters self, stale rows, other layers and Village positions', () => { expect(shownPlayers([p, { ...p, user_id: 'self' }, { ...p, layer: 1 }, { ...p, village_level: 1 }, { ...p, last_seen: new Date(0).toISOString() }], 'self', 0, 220000)).toEqual([p]); });
  it('throttles movement/outfit updates to one call a second and sends the latest row', async () => {
    vi.useFakeTimers(); vi.setSystemTime(100000); const write = vi.fn().mockResolvedValue(null), session = new WorldPresence(write);
    session.publish(p); session.publish({ ...p, x: 11 }); session.publish({ ...p, x: 12, avatar_body: 'scout' });
    expect(write).toHaveBeenCalledTimes(1); await vi.advanceTimersByTimeAsync(999); expect(write).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); expect(write).toHaveBeenLastCalledWith(expect.objectContaining({ x: 12, avatar_body: 'scout' })); session.dispose();
  });
});
describe('deterministic NPC wander', () => {
  const home = { x: 20, y: 20 }, safe = (p: { x: number; y: number }) => p.x !== 21;
  it('each slot chooses identical walkable paths within three cells', () => {
    for (let slot = 0; slot < 80; slot++) {
      const path = npcPath(home, 'bernard', slot, safe);
      expect(path).toEqual(npcPath(home, 'bernard', slot, safe));
      expect(path.every(p => safe(p) && Math.max(Math.abs(p.x - home.x), Math.abs(p.y - home.y)) <= 3)).toBe(true);
      for (let i = 1; i < path.length; i++) expect(Math.abs(path[i].x - path[i - 1].x) + Math.abs(path[i].y - path[i - 1].y)).toBe(1);
    }
  });
  it('stays home when every path is blocked', () => expect(npcPath(home, 'merchant', 5, () => false)).toEqual([home]));
  it('takes 600ms for one tile then pauses for a deterministic 6–14 seconds', () => {
    const w = new NpcWander(), far = { x: 50, y: 50 };
    const a = w.sample(home, 'merchant', 0, far, safe), mid = w.sample(home, 'merchant', 300, far, safe), end = w.sample(home, 'merchant', 600, far, safe);
    expect(NPC_TILE_MS).toBe(600); expect(Math.hypot(end.x - a.x, end.y - a.y)).toBe(1); expect(Math.hypot(mid.x - a.x, mid.y - a.y)).toBe(.5); expect(mid.phase).not.toBe('stand');
    const pause = npcPauseMs('merchant', 0); expect(pause).toBeGreaterThanOrEqual(6000); expect(pause).toBeLessThanOrEqual(14000);
    expect(w.sample(home, 'merchant', 600 + pause - 1, far, safe)).toEqual(end);
    for (let slot = 0; slot < 100; slot++) { expect(npcPauseMs('sam', slot)).toBe(npcPauseMs('sam', slot)); expect(npcPauseMs('sam', slot)).toBeGreaterThanOrEqual(6000); expect(npcPauseMs('sam', slot)).toBeLessThanOrEqual(14000); }
  });
  it('stops and faces a player three tiles away and remains still throughout a card', () => {
    const w = new NpcWander(), far = { x: 50, y: 50 }; const at = w.sample(home, 'sam', 600, far, safe);
    const near = { x: at.cell.x - 3, y: at.cell.y }; const frozen = w.sample(home, 'sam', 700, near, safe);
    expect(frozen.facing).toBe('left'); expect(frozen.phase).toBe('stand'); expect(w.sample(home, 'sam', 30000, near, safe)).toEqual(frozen);
    const talking = w.sample(home, 'sam', 50000, far, safe, false, true); expect(talking.x).toBe(frozen.x); expect(talking.y).toBe(frozen.y);
  });
  it('independent clients agree per slot and freeze next to the player', () => {
    const a = new NpcWander(), b = new NpcWander(), far = { x: 50, y: 50 };
    const pose = a.sample(home, 'merchant', 401000, far, safe);
    expect(b.sample(home, 'merchant', 401000, far, safe)).toEqual(pose);
    const near = { x: pose.cell.x - 1, y: pose.cell.y };
    const frozen = a.sample(home, 'merchant', 401000, near, safe);
    expect(a.sample(home, 'merchant', 407000, near, safe)).toEqual(frozen);
    expect(frozen.phase).toBe('stand'); expect(frozen.facing).toBe('left');
  });
});
describe('Go back to start', () => {
  it('clears game keys, keeps auth and other-player progress, resets daily memory', async () => {
    localStorage.clear(); sessionStorage.clear();
    const keys = ['praem.worldPos', 'praem.worldReturn', 'praem.worldLayoutVersion', 'praem.worldDiscovery.self', 'praem_intro_seen', 'praem_run'];
    keys.forEach(k => localStorage.setItem(k, '1'));
    localStorage.setItem('sb-auth-token', 'keep'); localStorage.setItem('praem-auth-token', 'keep'); localStorage.setItem('praem.worldDiscovery.other', 'keep');
    sessionStorage.setItem('visited_shadow_this_run', '1'); sessionStorage.setItem('praem_shadow_entry', '1');
    const claim = vi.fn().mockResolvedValue(10); await claimDailyStepsOnce('self', claim);
    clearPlayerLocal('self'); keys.forEach(k => expect(localStorage.getItem(k)).toBeNull());
    expect(localStorage.getItem('sb-auth-token')).toBe('keep'); expect(localStorage.getItem('praem-auth-token')).toBe('keep'); expect(localStorage.getItem('praem.worldDiscovery.other')).toBe('keep'); expect(sessionStorage.length).toBe(0);
    await claimDailyStepsOnce('self', claim); expect(claim).toHaveBeenCalledTimes(2);
  });
  it('calls the reset RPC before clearing, and leaves state intact on refusal', async () => {
    localStorage.setItem('praem.worldPos', 'saved'); const rpc = vi.fn().mockResolvedValue({ data: { ok: false }, error: null });
    await expect(goBackToStart('self', rpc as never)).rejects.toThrow(); expect(localStorage.getItem('praem.worldPos')).toBe('saved');
    rpc.mockResolvedValue({ data: { ok: true, rows_cleared: 12 }, error: null }); await goBackToStart('self', rpc as never); expect(rpc).toHaveBeenCalledTimes(2); expect(localStorage.getItem('praem.worldPos')).toBeNull();
  });
});