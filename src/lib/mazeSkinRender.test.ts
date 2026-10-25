import { describe, expect, it, vi } from 'vitest';
import { drawMazeSkin } from './mazeSkinRender';
import type { LevelSkin } from './mazeSkins';
const draw = vi.hoisted(() => vi.fn());
vi.mock('./terrainTile', () => ({ drawTerrain: draw }));
describe('viewport-only era rendering', () => {
  it('draws only viewport tiles, even with 200×200 cells', () => {
    draw.mockClear();
    const ctx = { clearRect: vi.fn(), fillRect: vi.fn() } as unknown as CanvasRenderingContext2D;
    const level = { skin: { wall_keys: ['cliff'], floor_keys: ['sand'], edge: [] }, terrain: new Map([['cliff', { key: 'cliff' }], ['sand', { key: 'sand' }]]) } as unknown as LevelSkin;
    drawMazeSkin(ctx, level, { cols: 200, rows: 200, openSet: new Set() }, new Set(), { x: -4000, y: -4000 }, 400, 800, 0, {} as never, true);
    expect(draw).toHaveBeenCalledTimes(15 * 25);
    expect(draw.mock.calls.every(args => args[3] >= 98 && args[3] <= 112 && args[4] >= 98 && args[4] <= 122)).toBe(true);
  });
  it('lamp glow stays decorative with an exact two-cell radius', () => {
    const stops = vi.fn(), gradient = vi.fn(() => ({ addColorStop: stops }));
    const ctx = { clearRect: vi.fn(), fillRect: vi.fn(), createRadialGradient: gradient } as unknown as CanvasRenderingContext2D;
    const level = { skin: { wall_keys: ['cliff'], floor_keys: ['sand'], junction_key: 'lamp_post', edge: [], accent: '#e8d08a' }, terrain: new Map() } as unknown as LevelSkin;
    drawMazeSkin(ctx, level, { cols: 6, rows: 6, openSet: new Set(['3,4', '5,4', '4,3']) }, new Set(), { x: 0, y: 0 }, 240, 240, 0, {} as never, true);
    expect(gradient).toHaveBeenCalledWith(180, 180, 0, 180, 180, 80); expect(stops).toHaveBeenCalledWith(0, '#e8d08a');
  });
});
