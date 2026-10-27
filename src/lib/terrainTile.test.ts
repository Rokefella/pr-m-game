import { describe, expect, it, vi } from 'vitest';
import { motionFrames, drawTerrainBase, drawTerrainMotion, drawSpriteAtmosphere, loadTerrainSprites, terrainSprite } from './terrainTile';
import { worldHash } from './worldHash';
import type { Terrain } from './worldTest';

describe('shared terrain variants', () => {
  it('reduced motion suppresses every new rectangular-structure effect', () => {
    const ctx = { drawImage: vi.fn(), fill: vi.fn(), fillRect: vi.fn() } as unknown as CanvasRenderingContext2D;
    const sprite = document.createElement('canvas'); sprite.width = 48; sprite.height = 64;
    for (const moves of ['glow', 'flicker', 'steam', 'smoke', 'glint']) drawSpriteAtmosphere(ctx, { key: 'bld_test', moves } as Terrain, sprite, 1, 2, 1000, { text: 'white' } as never, true);
    expect(ctx.drawImage).not.toHaveBeenCalled(); expect(ctx.fill).not.toHaveBeenCalled(); expect(ctx.fillRect).not.toHaveBeenCalled();
  });
  it('reduced motion draws no water highlights or lava pulse', () => {
    const ctx = { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), fillRect: vi.fn() } as unknown as CanvasRenderingContext2D;
    for (const moves of ['flow', 'shimmer', 'glow']) drawTerrainMotion(ctx, { key: 'missing', moves } as Terrain, 0, 0, 0, 0, 1000, {} as never, true);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });
  it('rasterises all variants at their footprint size and selects with salt 13', async () => {
    const originalImage = globalThis.Image;
    const context = { drawImage: vi.fn(), imageSmoothingEnabled: true };
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as never);
    class ReadyImage {
      onload?: () => void;
      set src(_value: string) { queueMicrotask(() => this.onload?.()); }
    }
    vi.stubGlobal('Image', ReadyImage);
    try {
      const tree = { key: 'test_tree', icon_svg: '<svg/>', icon_variants: ['<svg/>', '<svg/>', '<svg/>', '<svg/>', '<svg/>'], render_layer: 'object' } as Terrain;
      const large = { ...tree, key: 'test_large', footprint: 2 };
      await loadTerrainSprites([tree, large]);
      const choices = new Set(Array.from({ length: 100 }, (_, x) => terrainSprite(tree.key, x, 0)));
      expect(choices.size).toBe(5);
      expect(terrainSprite(tree.key, 7, 9)).toBe(terrainSprite(tree.key, 7, 9));
      const x = 7, y = 9, index = Math.floor(worldHash(x, y, 13) * 5);
      const sameIndexX = Array.from({ length: 100 }, (_, i) => i).find(i => Math.floor(worldHash(i, 0, 13) * 5) === index);
      expect(terrainSprite(tree.key, x, y)).toBe(terrainSprite(tree.key, sameIndexX, 0));
      expect(terrainSprite(tree.key, 0, 0)?.width).toBe(16);
      expect(terrainSprite(large.key, 0, 0)?.width).toBe(32);
      const ctx = { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
      drawTerrainBase(ctx, tree, undefined, x, y, 0, 0, 40, {} as never);
      expect(ctx.drawImage).toHaveBeenCalledWith(terrainSprite(tree.key, x, y), 0, 0, 40, 40);
      expect(ctx.scale).toHaveBeenCalledWith(expect.any(Number), 1);
      expect(context.imageSmoothingEnabled).toBe(false);
    } finally { getContext.mockRestore(); vi.stubGlobal('Image', originalImage); }
  });
  it('wraps ground lean seamlessly, animates the static variant and never flips houses vertically', async () => {
    const originalImage = globalThis.Image;
    const context = { drawImage: vi.fn(), imageSmoothingEnabled: true, clearRect: vi.fn(), fillRect: vi.fn() };
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as never);
    class ReadyImage { onload?: () => void; set src(_v: string) { queueMicrotask(() => this.onload?.()); } }
    vi.stubGlobal('Image', ReadyImage);
    try {
      const corn = { key: 'crops_corn_t', moves: 'sway', render_layer: 'ground', icon_svg: '<svg/>', icon_variants: Array(6).fill('<svg/>') } as Terrain;
      const house = { key: 'house_wood_t', render_layer: 'object', icon_svg: '<svg/>' } as Terrain;
      await loadTerrainSprites([corn, house]);
      // Wrapped column: the right-most top-half column is copied to x=0 (and vice versa).
      expect(context.drawImage).toHaveBeenCalledWith(expect.anything(), 15, 0, 1, 8, 0, 0, 1, 8);
      expect(context.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1, 8, 15, 0, 1, 8);
      const x = 80, y = 5, sprite = terrainSprite(corn.key, x, y)!;
      const ctx = { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), drawImage: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), fillRect: vi.fn() } as unknown as CanvasRenderingContext2D;
      drawTerrainMotion(ctx, corn, x, y, 0, 0, 0, { text: '#fff' } as never, false, undefined, 100750);
      const art = motionFrames(sprite)!;
      const used = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
      expect(used).toContain(sprite); expect(used.some(c => c === art.wrap || c === art.wrapLeft)).toBe(true);
      expect(ctx.fillRect).toHaveBeenCalled();
      for (let hx = 0; hx < 40; hx++) {
        const c = { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
        drawTerrainBase(c, { ...house, render_layer: 'ground' }, undefined, hx, 3, 0, 0, 40, {} as never);
        for (const call of (c.scale as ReturnType<typeof vi.fn>).mock.calls) expect(call[1]).toBe(1);
      }
    } finally { getContext.mockRestore(); vi.stubGlobal('Image', originalImage); }
  });
});
