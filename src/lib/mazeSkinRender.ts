import { drawTerrain, type TerrainInk } from './terrainTile';
import { skinTile, type LevelSkin } from './mazeSkins';
type Grid = { cols: number; rows: number; openSet: ReadonlySet<string> };
/** Viewport-sized canvas; never allocate a whole 200×200-cell image. */
export function drawMazeSkin(ctx: CanvasRenderingContext2D, level: LevelSkin, grid: Grid, walls: ReadonlySet<string>, camera: { x: number; y: number }, width: number, height: number, time: number, ink: TerrainInk, reduced: boolean, size = 40) {
  ctx.clearRect(0, 0, width, height); ctx.imageSmoothingEnabled = false;
  const floor0 = level.terrain.get(level.skin.floor_keys[0]);
  const x0 = Math.max(0, Math.floor(-camera.x / size) - 2), y0 = Math.max(0, Math.floor(-camera.y / size) - 2);
  const x1 = Math.min(grid.cols - 1, Math.ceil((width - camera.x) / size) + 2), y1 = Math.min(grid.rows - 1, Math.ceil((height - camera.y) / size) + 2);
  const lamps: { x: number; y: number }[] = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const tile = skinTile(x, y, level.skin, grid.openSet, walls), terrain = level.terrain.get(tile.key);
    const px = x * size + camera.x, py = y * size + camera.y;
    if (terrain) drawTerrain(ctx, terrain, undefined, x, y, px, py, time, ink, reduced, false, tile.wall ? floor0 : undefined);
    if (tile.wall) {
      ctx.fillStyle = ink.shadow; ctx.globalAlpha = .3;
      if (grid.openSet.has(`${x},${y + 1}`)) ctx.fillRect(px, py + size - 4, size, 4);
      ctx.fillStyle = ink.text; ctx.globalAlpha = .14;
      if (grid.openSet.has(`${x},${y - 1}`)) ctx.fillRect(px, py, size, 2);
      if (/building|factory/.test(tile.key)) {
        ctx.fillStyle = level.skin.accent; ctx.globalAlpha = .7;
        for (const dx of [10, 23]) { ctx.fillRect(px + dx, py + 12, 4, 4); ctx.fillRect(px + dx, py + 24, 4, 4); }
      }
      ctx.globalAlpha = 1;
    }
    for (const key of [tile.edge, tile.junction]) {
      const overlay = key ? level.terrain.get(key) : undefined;
      if (overlay) drawTerrain(ctx, overlay, undefined, x, y, px, py, time, ink, reduced, true);
    }
    if (tile.junction === 'lamp_post') lamps.push({ x: px + size / 2, y: py + size / 2 });
  }
  for (const lamp of lamps) {
    const radius = size * 2, glow = ctx.createRadialGradient(lamp.x, lamp.y, 0, lamp.x, lamp.y, radius);
    glow.addColorStop(0, level.skin.accent); glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow; ctx.globalAlpha = .16; ctx.fillRect(lamp.x - radius, lamp.y - radius, radius * 2, radius * 2); ctx.globalAlpha = 1;
  }
}
