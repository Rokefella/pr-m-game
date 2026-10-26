import { describe, expect, it, vi } from 'vitest';
import { drawTerrainBase, drawTerrainMotion, loadTerrainSprites, terrainSprite } from './terrainTile';
import { worldHash } from './worldHash';
import type { Terrain } from './worldTest';

describe('shared terrain variants', () => {
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
});