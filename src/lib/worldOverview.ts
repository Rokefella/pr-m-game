import { supabase } from './supabase';
import { terrainSprite } from './terrainTile';
import type { Terrain } from './worldTest';
let overview: Promise<HTMLCanvasElement> | null = null;
export function readWorldOverview(types: Terrain[]): Promise<HTMLCanvasElement> {
  if (overview) return overview;
  overview = (async () => {
    const { data, error } = await supabase.from('world_overview' as never).select('y,row').order('y');
    if (error || !Array.isArray(data)) throw Error('Map unavailable');
    const rows = data as unknown as { y: number; row: string }[];
    const keys = rows.find(r => r.y === -1)?.row.split(',') ?? [];
    const styles = getComputedStyle(document.documentElement);
    const fallback = styles.getPropertyValue('--world-map-fallback').trim();
    const colors = keys.map(key => {
      if (key.startsWith('bld_')) return types.find(t => t.key === key)?.color ?? fallback;
      const sprite = terrainSprite(key), ctx = sprite?.getContext('2d');
      if (ctx && sprite) {
        const pixels = ctx.getImageData(0, 0, 16, 16).data; let r = 0, g = 0, b = 0, weight = 0;
        for (let i = 0; i < pixels.length; i += 4) { const a = pixels[i + 3] / 255; r += pixels[i] * a; g += pixels[i + 1] * a; b += pixels[i + 2] * a; weight += a; }
        if (weight) return `rgb(${Math.round(r / weight)} ${Math.round(g / weight)} ${Math.round(b / weight)})`;
      }
      return types.find(t => t.key === key)?.color ?? fallback;
    });
    const canvas = document.createElement('canvas'); canvas.width = 250; canvas.height = 250;
    const ctx = canvas.getContext('2d'); if (!ctx) throw Error('Map unavailable');
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = fallback; ctx.fillRect(0, 0, 250, 250);
    for (const row of rows) if (row.y >= 0 && row.y < 250) for (let x = 0; x < 250; x++) { ctx.fillStyle = colors[(row.row.charCodeAt(x) || 48) - 48] ?? fallback; ctx.fillRect(x, row.y, 1, 1); }
    return canvas;
  })().catch(error => { overview = null; throw error; });
  return overview;
}