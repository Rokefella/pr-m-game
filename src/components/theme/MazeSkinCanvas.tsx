import { forwardRef, memo, useEffect, useImperativeHandle, useRef } from 'react';
import type { LevelSkin } from '@/lib/mazeSkins';
import { drawMazeSkin } from '@/lib/mazeSkinRender';
import type { TerrainInk } from '@/lib/terrainTile';
import { useReducedMotion } from './useReducedMotion';
export type MazeSkinHandle = { tick: (time: number, camera: { x: number; y: number }) => void };
type Props = { skin: LevelSkin; grid: { cols: number; rows: number; openSet: Set<string> }; walls: Set<string> };
const MazeSkinCanvas = memo(forwardRef<MazeSkinHandle, Props>(({ skin, grid, walls }, ref) => {
  const canvas = useRef<HTMLCanvasElement>(null), ink = useRef<TerrainInk | null>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const styles = getComputedStyle(document.documentElement), token = (name: string) => styles.getPropertyValue(name).trim();
    ink.current = { background: token('--auth-backdrop'), grid: token('--plate-edge'), text: token('--auth-text'), muted: token('--plate-label'), gold: token('--instrument-beacon'), cyan: token('--console-teal'), shadow: token('--instrument-shadow') };
  }, []);
  useImperativeHandle(ref, () => ({ tick(time, camera) {
    const el = canvas.current, colors = ink.current;
    if (!el || !colors) return;
    const ctx = el.getContext('2d'); if (!ctx) return;
    const dpr = Math.min(devicePixelRatio || 1, 2), width = innerWidth, height = innerHeight;
    if (el.width !== Math.round(width * dpr) || el.height !== Math.round(height * dpr)) { el.width = Math.round(width * dpr); el.height = Math.round(height * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawMazeSkin(ctx, skin, grid, walls, camera, width, height, time, colors, reduced);
  } }), [skin, grid, walls, reduced]);
  return <canvas ref={canvas} className="maze-skin-canvas" data-game-world aria-label="Maze era terrain" />;
}));
MazeSkinCanvas.displayName = 'MazeSkinCanvas';
export default MazeSkinCanvas;
