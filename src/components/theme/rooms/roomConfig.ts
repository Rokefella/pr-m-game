import type { StyleKey } from '@/lib/theme/svgSources';

export const ROOM_ZOOM = 1.5;
export const ROOM_AVATAR_SIZE = 25;
export const ROOM_WALL_STYLE: StyleKey = 'gold';
export const ROOM_BG = '#0b0e1f';
export const ROOM_CELL = 20;

/** Camera offset (screen px) for one axis: follow + clamp when the zoomed map is larger, otherwise centre it. */
export function roomCamAxis(mapAxis: number, playerPos: number, viewSize: number, zoom = ROOM_ZOOM): number {
  const m = mapAxis * zoom;
  if (m > viewSize) return Math.min(0, Math.max(viewSize - m, viewSize / 2 - playerPos * zoom));
  return (viewSize - m) / 2;
}
